import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { mongodbAdapter } from '@better-auth/mongo-adapter';
import { nextCookies } from 'better-auth/next-js';
import { bearer, jwt } from 'better-auth/plugins';
import { symmetricDecrypt } from 'better-auth/crypto';
import bcrypt from 'bcryptjs';
import { Db, ObjectId } from 'mongodb';
import { connectMongo } from './mongoClient';
import { createPersistentFallbackAdapter } from './fallbackAuthStore';

export function validatePasswordComplexity(password: string): { valid: boolean; message?: string } {
  if (typeof password !== 'string' || password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter (A-Z).' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter (a-z).' };
  }
  return { valid: true };
}

export const DEV_APP_URL =
  'https://ais-dev-w4hennzj3azcwy3u4wbk7q-149637408810.asia-southeast1.run.app';
export const PREVIEW_APP_URL =
  'https://ais-pre-w4hennzj3azcwy3u4wbk7q-149637408810.asia-southeast1.run.app';
export const AUTH_AUDIENCE = 'uddomi-api';

const PLACEHOLDER_SECRETS = new Set([
  'better_auth_secret_key_random_hash_min_32_characters_here',
  'replace_with_a_cryptographically_random_secret_min_32_characters',
  'your_better_auth_secret_here',
  'changeme',
]);

function sanitizeUrl(raw?: string): string | null {
  if (!raw || raw === 'MY_APP_URL') return null;
  const trimmed = raw.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

function normalizeVercelOrigin(raw?: string): string | null {
  if (!raw || !raw.trim()) return null;
  const cleaned = raw.trim().replace(/^https?:\/\//i, '');
  return sanitizeUrl(`https://${cleaned}`);
}

export function isAiStudioRuntime(): boolean {
  const candidates = [
    process.env.APP_URL,
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
    process.env.BETTER_AUTH_TRUSTED_ORIGINS,
  ];
  const hasExplicit = candidates.some((v) => Boolean(v && v.trim() && v.trim() !== 'MY_APP_URL'));
  if (!hasExplicit) return !process.env.VERCEL;
  return candidates.some((v) => Boolean(v && /\.run\.app(?:[:/,]|$)/i.test(v)));
}

export function getAuthBaseUrl(): string {
  // Prefer runtime APP_URL when running in AI Studio (.run.app) so stale localhost/old URLs never break cookies or OAuth
  const appUrl = sanitizeUrl(process.env.APP_URL);
  if (appUrl && /\.run\.app$/i.test(new URL(appUrl).hostname)) {
    return appUrl;
  }

  const configured =
    sanitizeUrl(process.env.BETTER_AUTH_URL) ||
    appUrl ||
    sanitizeUrl(process.env.NEXT_PUBLIC_BETTER_AUTH_URL) ||
    normalizeVercelOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    normalizeVercelOrigin(process.env.VERCEL_URL);

  return configured || (isAiStudioRuntime() ? DEV_APP_URL : 'http://localhost:3000');
}

export function getAuthIssuer(): string {
  return getAuthBaseUrl();
}

export function getGithubCallbackUrl(): string {
  return (
    sanitizeUrl(process.env.GITHUB_REDIRECT_URI)
      ? `${sanitizeUrl(process.env.GITHUB_REDIRECT_URI)}/api/auth/callback/github`
      : `${getAuthBaseUrl()}/api/auth/callback/github`
  );
}

function resolveAuthSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  if (secret && !PLACEHOLDER_SECRETS.has(secret) && secret.length >= 32) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production' && !isAiStudioRuntime() && process.env.VERCEL_ENV !== 'preview') {
    throw new Error(
      'Missing or insecure BETTER_AUTH_SECRET in production environment (minimum 32 characters required).'
    );
  }

  return 'uddomi_shared_runtime_auth_secret_key_min_32_chars_2026';
}

function resolveTrustedOrigins(): string[] {
  const origins = new Set<string>([getAuthBaseUrl()]);

  if (process.env.NODE_ENV !== 'production' || isAiStudioRuntime()) {
    origins.add(DEV_APP_URL);
    origins.add(PREVIEW_APP_URL);
    origins.add('http://localhost:3000');
    origins.add('http://127.0.0.1:3000');
    origins.add('http://localhost:4000');
    origins.add('http://127.0.0.1:4000');
  }

  const envUrls = [
    process.env.CLIENT_URL,
    process.env.BETTER_AUTH_URL,
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_API_URL,
    process.env.FRONTEND_ORIGIN,
    normalizeVercelOrigin(process.env.VERCEL_URL) ?? undefined,
    normalizeVercelOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ?? undefined,
    normalizeVercelOrigin(process.env.NEXT_PUBLIC_VERCEL_URL) ?? undefined,
  ];
  for (const candidate of envUrls) {
    const clean = sanitizeUrl(candidate);
    if (clean) origins.add(clean);
  }

  const listCandidates = [
    process.env.CLIENT_URL,
    process.env.BETTER_AUTH_TRUSTED_ORIGINS,
    process.env.FRONTEND_ORIGINS,
  ];
  for (const listStr of listCandidates) {
    if (!listStr) continue;
    for (const part of listStr.split(',')) {
      const clean = sanitizeUrl(part);
      if (clean) origins.add(clean);
    }
  }

  return Array.from(origins);
}

function resolveAllowedHosts(): string[] {
  const hosts = new Set<string>();
  for (const origin of resolveTrustedOrigins()) {
    try {
      hosts.add(new URL(origin).host);
    } catch {
      // Ignore invalid origin
    }
  }
  hosts.add('localhost:*');
  hosts.add('127.0.0.1:*');
  if (isAiStudioRuntime()) {
    hosts.add('*.run.app');
  }
  if (process.env.VERCEL === '1') {
    hosts.add('*.vercel.app');
  }
  return Array.from(hosts);
}

function createBetterAuthInstance() {
  const globalForAuth = globalThis as unknown as {
    __uddomiBetterAuth?: ReturnType<typeof buildAuth>;
    __uddomiBetterAuthMode?: 'mongo' | 'fallback';
  };

  function buildAuth(conn: Awaited<ReturnType<typeof connectMongo>>) {
    const baseURL = getAuthBaseUrl();
    const issuer = getAuthIssuer();
    const explicitGithubRedirectUri = process.env.GITHUB_REDIRECT_URI?.trim()
      ? getGithubCallbackUrl()
      : undefined;
    const isHttps =
      process.env.NODE_ENV === 'production' ||
      baseURL.startsWith('https://') ||
      isAiStudioRuntime();
    const githubClientId = process.env.GITHUB_CLIENT_ID?.trim();
    const githubClientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
    const hasGithub =
      Boolean(githubClientId && githubClientSecret) &&
      githubClientId !== 'your_github_client_id' &&
      githubClientId !== 'your_github_oauth_client_id' &&
      githubClientSecret !== 'your_github_client_secret' &&
      githubClientSecret !== 'your_github_oauth_client_secret';

    const socialProviders: Record<string, any> = {};
    if (hasGithub) {
      socialProviders.github = {
        clientId: githubClientId!,
        clientSecret: githubClientSecret!,
        ...(explicitGithubRedirectUri ? { redirectURI: explicitGithubRedirectUri } : {}),
        scope: ['read:user', 'user:email'],
      };
    }

    const authSecret = resolveAuthSecret();
    const usingMongo = Boolean(conn.connected && conn.db && conn.client);
    const database = usingMongo
      ? mongodbAdapter(conn.db!, { client: conn.client! })
      : createPersistentFallbackAdapter(authSecret);

    return betterAuth({
      appName: 'Uddomi',
      baseURL: {
        allowedHosts: resolveAllowedHosts(),
        fallback: baseURL,
        protocol: 'auto',
      },
      basePath: '/api/auth',
      secret: authSecret,
      database,
      trustedOrigins: resolveTrustedOrigins(),
      emailAndPassword: {
        enabled: true,
        minPasswordLength: 6,
        autoSignIn: true,
        password: {
          hash: async (password: string) => {
            const check = validatePasswordComplexity(password);
            if (!check.valid) {
              throw new APIError('BAD_REQUEST', {
                message: check.message || 'Password does not meet security requirements.',
              });
            }
            return bcrypt.hash(password, 10);
          },
          verify: async ({ hash, password }: { hash: string; password: string }) => {
            if (!hash || !password) return false;
            if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
              return bcrypt.compare(password, hash);
            }
            return hash === Buffer.from(password, 'utf-8').toString('base64');
          },
        },
      },
      hooks: {
        before: createAuthMiddleware(async (ctx) => {
          if (
            ctx.path === '/sign-up/email' ||
            ctx.path === '/change-password' ||
            ctx.path === '/reset-password'
          ) {
            const body = (ctx.body || {}) as Record<string, unknown>;
            const rawPassword =
              ctx.path === '/sign-up/email' ? body.password : body.newPassword;
            const check = validatePasswordComplexity(
              typeof rawPassword === 'string' ? rawPassword : ''
            );
            if (!check.valid) {
              throw new APIError('BAD_REQUEST', {
                message: check.message || 'Password does not meet security requirements.',
              });
            }
          }
        }),
      },
      ...(Object.keys(socialProviders).length > 0 ? { socialProviders } : {}),
      account: {
        storeStateStrategy: 'database',
        skipStateCookieCheck: true,
        accountLinking: {
          enabled: true,
          trustedProviders: ['github'],
          requireLocalEmailVerified: false,
        },
      },
      user: {
        additionalFields: {
          legacyId: { type: 'string', required: false, input: false },
          accountType: {
            type: 'string',
            required: false,
            defaultValue: 'Standard Volunteer',
          },
          memberSince: { type: 'string', required: false },
          lastSignedIn: { type: 'string', required: false },
          timeZone: { type: 'string', required: false, defaultValue: 'UTC' },
        },
      },
      session: {
        expiresIn: 60 * 60 * 24 * 7,
        updateAge: 60 * 60 * 24,
      },
      advanced: {
        trustedProxyHeaders: true,
        useSecureCookies: isHttps,
        defaultCookieAttributes: {
          httpOnly: true,
          path: '/',
          secure: isHttps,
          sameSite: isHttps ? 'none' : 'lax',
        },
      },
      databaseHooks: {
        user: {
          create: {
            after: async (user) => {
              if (!usingMongo || !conn.db) return;
              try {
                const db = conn.db;
                const cleanEmail = (user.email || '').trim().toLowerCase();
                if (!cleanEmail) return;
                const now = new Date();
                const memberSince =
                  (user as any).memberSince ||
                  now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const resolvedLegacyId = (user as any).legacyId || user.id;

                if (!(user as any).legacyId && ObjectId.isValid(user.id)) {
                  await db.collection('user').updateOne(
                    { _id: new ObjectId(user.id) },
                    {
                      $set: {
                        legacyId: resolvedLegacyId,
                        memberSince,
                        accountType: (user as any).accountType || 'Standard Volunteer',
                      },
                    }
                  );
                }

                const existingLegacy = await db.collection('users').findOne({ email: cleanEmail });
                if (!existingLegacy) {
                  let authProvider = 'credentials';
                  if (ObjectId.isValid(user.id)) {
                    const oauthAcc = await db.collection('account').findOne({
                      userId: new ObjectId(user.id),
                      providerId: 'github',
                    });
                    if (oauthAcc?.providerId === 'github') {
                      authProvider = oauthAcc.providerId;
                    }
                  }
                  await db.collection('users').insertOne({
                    id: resolvedLegacyId,
                    name: user.name || cleanEmail.split('@')[0],
                    email: cleanEmail,
                    photoURL:
                      user.image ||
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
                    authProvider,
                    accountType: (user as any).accountType || 'Standard Volunteer',
                    memberSince,
                    timeZone: (user as any).timeZone || 'UTC',
                    createdAt: now.toISOString(),
                    updatedAt: now.toISOString(),
                  });
                }
              } catch (err) {
                console.warn('Better Auth user mirror hook note:', err);
              }
            },
          },
        },
      },
      plugins: [
        jwt({
          jwks: {
            keyPairConfig: {
              alg: 'RS256',
            },
          },
          jwt: {
            issuer,
            audience: AUTH_AUDIENCE,
            expirationTime: '7d',
            getSubject: ({ user }) => (user as any).legacyId || user.id,
            definePayload: ({ user }) => ({
              id: (user as any).legacyId || user.id,
              authUserId: user.id,
              email: user.email.toLowerCase(),
              name: user.name,
              role: (user as any).accountType || 'Standard Volunteer',
            }),
          },
        }),
        bearer(),
        nextCookies(),
      ],
    });
  }

  async function pruneUndecryptableJwks(db: Db, authSecret: string): Promise<void> {
    try {
      const docs = await db.collection('jwks').find({}).toArray();
      if (!docs.length) return;

      const staleIds: unknown[] = [];
      for (const doc of docs) {
        if (!doc?.privateKey || typeof doc.privateKey !== 'string') {
          staleIds.push(doc._id);
          continue;
        }
        try {
          const parsed = JSON.parse(doc.privateKey);
          await symmetricDecrypt({ key: authSecret, data: parsed });
        } catch {
          staleIds.push(doc._id);
        }
      }

      if (staleIds.length > 0) {
        await db.collection('jwks').deleteMany({ _id: { $in: staleIds as any[] } });
        console.warn(
          `⚠️ Cleared ${staleIds.length} stale Better Auth JWKS key(s) encrypted with a different secret.`
        );
      }
    } catch (err) {
      console.warn('JWKS health check note:', err);
    }
  }

  return async () => {
    const conn = await connectMongo();
    const targetMode = conn.connected && conn.db && conn.client ? 'mongo' : 'fallback';

    if (
      globalForAuth.__uddomiBetterAuth &&
      globalForAuth.__uddomiBetterAuthMode === targetMode
    ) {
      return globalForAuth.__uddomiBetterAuth;
    }

    if (targetMode === 'fallback') {
      console.warn(
        `⚠️ MongoDB unavailable (${conn.error || 'not configured'}). Using persistent local Better Auth fallback store.`
      );
    } else if (conn.db) {
      await pruneUndecryptableJwks(conn.db, resolveAuthSecret());
    }

    globalForAuth.__uddomiBetterAuth = buildAuth(conn);
    globalForAuth.__uddomiBetterAuthMode = targetMode;
    return globalForAuth.__uddomiBetterAuth;
  };
}

export const getAuth = createBetterAuthInstance();
