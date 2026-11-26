import { MongoClient, Db } from 'mongodb';

export interface MongoConnectionState {
  client: MongoClient | null;
  db: Db | null;
  connected: boolean;
  error: string | null;
}

const DB_NAME = process.env.MONGODB_DB_NAME?.trim() || 'goodgather';

const MONGO_RETRY_COOLDOWN_MS = 60_000;

const globalForMongo = globalThis as unknown as {
  __uddomiMongoClient?: MongoClient;
  __uddomiMongoDb?: Db;
  __uddomiMongoConnected?: boolean;
  __uddomiMongoError?: string | null;
  __uddomiMongoLastFailAt?: number;
  __uddomiMongoPromise?: Promise<MongoConnectionState>;
};

export function normalizeMongoUri(rawUri: string): { uri: string; diagnostic?: string } {
  let cleaned = rawUri.trim();
  if (/^MONGODB_URI\s*=/i.test(cleaned)) {
    cleaned = cleaned.replace(/^MONGODB_URI\s*=\s*/i, '').trim();
  }
  cleaned = cleaned.replace(/^["'`]+|["'`]+$/g, '').trim();
  cleaned = cleaned.replace(/[\r\n]+/g, '').trim();

  const schemeMatch = cleaned.match(/^(mongodb(?:\+srv)?:\/\/)(.*)$/i);
  if (!schemeMatch) {
    return {
      uri: cleaned,
      diagnostic: 'MongoParseError: MONGODB_URI must start with mongodb:// or mongodb+srv://',
    };
  }

  const scheme = schemeMatch[1].toLowerCase();
  const rest = schemeMatch[2];

  if (/\s/.test(rest)) {
    return {
      uri: scheme + rest,
      diagnostic: 'MongoParseError: Connection string contains spaces or extra text',
    };
  }

  const atIdx = rest.lastIndexOf('@');
  if (atIdx === -1) {
    return {
      uri: scheme + rest,
      diagnostic: 'MongoParseError: Missing "@" between credentials and cluster host',
    };
  }

  const userInfo = rest.slice(0, atIdx);
  const hostAndRest = rest.slice(atIdx + 1);

  if (!hostAndRest || hostAndRest.startsWith('/')) {
    return {
      uri: scheme + rest,
      diagnostic: 'MongoParseError: Missing MongoDB cluster host after "@"',
    };
  }

  const colonIdx = userInfo.indexOf(':');
  if (colonIdx === -1) {
    return {
      uri: scheme + rest,
      diagnostic: 'MongoParseError: Missing ":" between database username and password',
    };
  }

  const rawUser = userInfo.slice(0, colonIdx);
  const rawPass = userInfo.slice(colonIdx + 1);

  if (!rawUser || !rawPass) {
    return {
      uri: scheme + rest,
      diagnostic: 'MongoParseError: Database username or password is empty',
    };
  }

  if (/^<(password|db_password)>$/i.test(rawPass)) {
    return {
      uri: scheme + rest,
      diagnostic:
        'MongoParseError: <password> placeholder in MONGODB_URI was not replaced with your actual DB password',
    };
  }

  const safeReencode = (val: string) => {
    try {
      return encodeURIComponent(decodeURIComponent(val));
    } catch {
      return encodeURIComponent(val);
    }
  };

  return {
    uri: `${scheme}${safeReencode(rawUser)}:${safeReencode(rawPass)}@${hostAndRest}`,
  };
}

export async function connectMongo(): Promise<MongoConnectionState> {
  if (
    globalForMongo.__uddomiMongoConnected &&
    globalForMongo.__uddomiMongoClient &&
    globalForMongo.__uddomiMongoDb
  ) {
    return {
      client: globalForMongo.__uddomiMongoClient,
      db: globalForMongo.__uddomiMongoDb,
      connected: true,
      error: null,
    };
  }

  if (
    globalForMongo.__uddomiMongoLastFailAt &&
    Date.now() - globalForMongo.__uddomiMongoLastFailAt < MONGO_RETRY_COOLDOWN_MS
  ) {
    return {
      client: null,
      db: null,
      connected: false,
      error: globalForMongo.__uddomiMongoError || 'MongoDB connection unavailable',
    };
  }

  if (globalForMongo.__uddomiMongoPromise) {
    return globalForMongo.__uddomiMongoPromise;
  }

  globalForMongo.__uddomiMongoPromise = (async (): Promise<MongoConnectionState> => {
    const rawUri = process.env.MONGODB_URI;
    if (!rawUri || !rawUri.trim()) {
      const errMsg = 'MONGODB_URI not set';
      globalForMongo.__uddomiMongoConnected = false;
      globalForMongo.__uddomiMongoError = errMsg;
      globalForMongo.__uddomiMongoLastFailAt = Date.now();
      return { client: null, db: null, connected: false, error: errMsg };
    }

    const { uri, diagnostic } = normalizeMongoUri(rawUri);
    if (diagnostic) {
      globalForMongo.__uddomiMongoConnected = false;
      globalForMongo.__uddomiMongoError = diagnostic;
      globalForMongo.__uddomiMongoLastFailAt = Date.now();
      return { client: null, db: null, connected: false, error: diagnostic };
    }

    try {
      const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000,
      });
      await client.connect();
      const db = client.db(DB_NAME);

      globalForMongo.__uddomiMongoClient = client;
      globalForMongo.__uddomiMongoDb = db;
      globalForMongo.__uddomiMongoConnected = true;
      globalForMongo.__uddomiMongoError = null;
      globalForMongo.__uddomiMongoLastFailAt = undefined;

      return { client, db, connected: true, error: null };
    } catch (err: any) {
      const rawMsg = err?.message || String(err);
      const sanitizedMsg = rawMsg.replace(/mongodb(\+srv)?:\/\/[^\s]+/gi, '[redacted-uri]');
      const errMsg = `${err?.name || 'Error'}: ${sanitizedMsg}`;
      globalForMongo.__uddomiMongoConnected = false;
      globalForMongo.__uddomiMongoError = errMsg;
      globalForMongo.__uddomiMongoLastFailAt = Date.now();
      return { client: null, db: null, connected: false, error: errMsg };
    } finally {
      globalForMongo.__uddomiMongoPromise = undefined;
    }
  })();

  return globalForMongo.__uddomiMongoPromise;
}
