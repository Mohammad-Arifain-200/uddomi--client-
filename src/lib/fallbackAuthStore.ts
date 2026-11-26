import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { memoryAdapter, type MemoryDB } from 'better-auth/adapters/memory';

function getFallbackAuthFile(): string {
  return process.env.UDDOMI_AUTH_FALLBACK_FILE || '/tmp/uddomi_auth_fallback.json';
}

function getSecretFingerprint(secret?: string): string | undefined {
  if (!secret) return undefined;
  return crypto.createHash('sha256').update(secret).digest('hex').slice(0, 16);
}

interface FallbackAuthData extends MemoryDB {
  user: any[];
  session: any[];
  account: any[];
  verification: any[];
  jwks: any[];
}

interface PersistedFallbackSnapshot {
  user: any[];
  session: any[];
  account: any[];
  verification: any[];
  jwks: any[];
  meta?: {
    secretFingerprint?: string;
  };
}

const DEFAULT_KEYS: (keyof FallbackAuthData)[] = [
  'user',
  'session',
  'account',
  'verification',
  'jwks',
];

const globalForFallback = globalThis as unknown as {
  __uddomiFallbackMemDb?: FallbackAuthData;
  __uddomiFallbackSignature?: string;
  __uddomiFallbackTxDepth?: number;
  __uddomiFallbackSecretFingerprint?: string;
};

function reviveDates(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(reviveDates);
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (
        (k === 'createdAt' || k === 'updatedAt' || k === 'expiresAt') &&
        typeof v === 'string' &&
        /^\d{4}-\d{2}-\d{2}T/.test(v)
      ) {
        const parsed = new Date(v);
        out[k] = Number.isNaN(parsed.getTime()) ? v : parsed;
      } else {
        out[k] = reviveDates(v);
      }
    }
    return out;
  }
  return value;
}

function getFileSignature(): string | null {
  try {
    const file = getFallbackAuthFile();
    if (!fs.existsSync(/*turbopackIgnore: true*/ file)) return null;
    const stat = fs.statSync(/*turbopackIgnore: true*/ file);
    return `${stat.mtimeMs}:${stat.size}`;
  } catch {
    return null;
  }
}

function loadFallbackMemDbInto(
  target: FallbackAuthData,
  force = false,
  secretFingerprint?: string
) {
  try {
    if ((globalForFallback.__uddomiFallbackTxDepth || 0) > 0) {
      return;
    }
    const sig = getFileSignature();
    if (!sig) {
      if (secretFingerprint) {
        globalForFallback.__uddomiFallbackSecretFingerprint = secretFingerprint;
      }
      return;
    }
    if (
      !force &&
      globalForFallback.__uddomiFallbackSignature === sig &&
      (!secretFingerprint ||
        globalForFallback.__uddomiFallbackSecretFingerprint === secretFingerprint)
    ) {
      return;
    }

    const raw = fs.readFileSync(/*turbopackIgnore: true*/ getFallbackAuthFile(), 'utf-8');
    if (!raw.trim()) return;
    const parsed = reviveDates(JSON.parse(raw)) as Partial<PersistedFallbackSnapshot>;

    for (const key of DEFAULT_KEYS) {
      const nextRows = Array.isArray(parsed[key]) ? parsed[key]! : [];
      if (Array.isArray(target[key])) {
        target[key].splice(0, target[key].length, ...nextRows);
      } else {
        target[key] = [...nextRows];
      }
    }

    const storedFingerprint = parsed.meta?.secretFingerprint;
    if (secretFingerprint && storedFingerprint !== secretFingerprint) {
      if (target.jwks.length > 0) {
        target.jwks.splice(0, target.jwks.length);
      }
      globalForFallback.__uddomiFallbackSecretFingerprint = secretFingerprint;
      saveFallbackMemDb(target, secretFingerprint);
      return;
    }

    if (secretFingerprint || storedFingerprint) {
      globalForFallback.__uddomiFallbackSecretFingerprint =
        secretFingerprint || storedFingerprint;
    }
    globalForFallback.__uddomiFallbackSignature = sig;
  } catch (err: any) {
    console.warn('Failed to load fallback auth snapshot:', err?.message || err);
  }
}

function saveFallbackMemDb(data: FallbackAuthData, secretFingerprint?: string) {
  try {
    const file = getFallbackAuthFile();
    const dir = path.dirname(file);
    if (!fs.existsSync(/*turbopackIgnore: true*/ dir)) {
      fs.mkdirSync(/*turbopackIgnore: true*/ dir, { recursive: true });
    }
    const resolvedFingerprint =
      secretFingerprint || globalForFallback.__uddomiFallbackSecretFingerprint;
    const snapshot: PersistedFallbackSnapshot = {
      user: data.user,
      session: data.session,
      account: data.account,
      verification: data.verification,
      jwks: data.jwks,
      ...(resolvedFingerprint ? { meta: { secretFingerprint: resolvedFingerprint } } : {}),
    };
    const tmpFile = `${file}.tmp.${process.pid}.${Date.now()}`;
    fs.writeFileSync(/*turbopackIgnore: true*/ tmpFile, JSON.stringify(snapshot, null, 2), { mode: 0o600 });
    fs.renameSync(/*turbopackIgnore: true*/ tmpFile, /*turbopackIgnore: true*/ file);
    const sig = getFileSignature();
    if (sig) {
      globalForFallback.__uddomiFallbackSignature = sig;
    }
  } catch (err: any) {
    console.warn('Failed to save fallback auth snapshot:', err?.message || err);
  }
}

export function getFallbackMemDb(secret?: string): FallbackAuthData {
  const secretFingerprint = getSecretFingerprint(secret);
  if (!globalForFallback.__uddomiFallbackMemDb) {
    globalForFallback.__uddomiFallbackMemDb = {
      user: [],
      session: [],
      account: [],
      verification: [],
      jwks: [],
    };
    if (secretFingerprint) {
      globalForFallback.__uddomiFallbackSecretFingerprint = secretFingerprint;
    }
    loadFallbackMemDbInto(globalForFallback.__uddomiFallbackMemDb, true, secretFingerprint);
  } else {
    loadFallbackMemDbInto(globalForFallback.__uddomiFallbackMemDb, false, secretFingerprint);
  }
  return globalForFallback.__uddomiFallbackMemDb;
}

export function createPersistentFallbackAdapter(secret?: string) {
  const secretFingerprint = getSecretFingerprint(secret);
  const memDb = getFallbackMemDb(secret);
  const baseFactory = memoryAdapter(memDb);

  return (options: any) => {
    const adapter = baseFactory(options);

    const wrapRead = <T extends (...args: any[]) => any>(fn?: T): T | undefined => {
      if (!fn) return undefined;
      return ((...args: any[]) => {
        loadFallbackMemDbInto(memDb, false, secretFingerprint);
        return fn(...args);
      }) as T;
    };

    const wrapWrite = <T extends (...args: any[]) => Promise<any>>(fn?: T): T | undefined => {
      if (!fn) return undefined;
      return (async (...args: any[]) => {
        loadFallbackMemDbInto(memDb, false, secretFingerprint);
        const result = await fn(...args);
        if ((globalForFallback.__uddomiFallbackTxDepth || 0) === 0) {
          saveFallbackMemDb(memDb, secretFingerprint);
        }
        return result;
      }) as T;
    };

    const origTransaction = adapter.transaction?.bind(adapter);
    const wrappedTransaction = origTransaction
      ? async (cb: any) => {
          const depth = globalForFallback.__uddomiFallbackTxDepth || 0;
          if (depth === 0) {
            loadFallbackMemDbInto(memDb, false, secretFingerprint);
          }
          globalForFallback.__uddomiFallbackTxDepth = depth + 1;
          try {
            const result = await origTransaction(cb);
            return result;
          } finally {
            globalForFallback.__uddomiFallbackTxDepth = Math.max(
              0,
              (globalForFallback.__uddomiFallbackTxDepth || 1) - 1
            );
            if (globalForFallback.__uddomiFallbackTxDepth === 0) {
              saveFallbackMemDb(memDb, secretFingerprint);
            }
          }
        }
      : undefined;

    return {
      ...adapter,
      findOne: wrapRead(adapter.findOne.bind(adapter))!,
      findMany: wrapRead(adapter.findMany.bind(adapter))!,
      count: wrapRead(adapter.count.bind(adapter))!,
      create: wrapWrite(adapter.create.bind(adapter))!,
      update: wrapWrite(adapter.update.bind(adapter))!,
      updateMany: wrapWrite(adapter.updateMany.bind(adapter))!,
      delete: wrapWrite(adapter.delete.bind(adapter))!,
      deleteMany: wrapWrite(adapter.deleteMany.bind(adapter))!,
      ...(typeof (adapter as any).consumeOne === 'function'
        ? { consumeOne: wrapWrite((adapter as any).consumeOne.bind(adapter)) }
        : {}),
      ...(typeof (adapter as any).incrementOne === 'function'
        ? { incrementOne: wrapWrite((adapter as any).incrementOne.bind(adapter)) }
        : {}),
      ...(wrappedTransaction ? { transaction: wrappedTransaction } : {}),
    };
  };
}
