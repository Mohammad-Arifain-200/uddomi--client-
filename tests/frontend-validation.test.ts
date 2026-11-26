import test from 'node:test';
import assert from 'node:assert/strict';
import { getLocalDateString, isValidCalendarDate, validateFutureEventDate } from '../src/utils/dateValidation';
import {
  resolveImageValidationHttpResult,
  validateClientImageInput,
} from '../src/utils/imageValidation';

test('Client future date validation rejects yesterday, today, and impossible dates, and accepts tomorrow', () => {
  const yesterday = getLocalDateString(-1);
  const today = getLocalDateString(0);
  const tomorrow = getLocalDateString(1);

  assert.equal(isValidCalendarDate('2026-02-30'), false);
  assert.equal(isValidCalendarDate('2026-13-01'), false);
  assert.equal(validateFutureEventDate(yesterday).valid, false);
  assert.equal(validateFutureEventDate(today).valid, false);
  assert.equal(validateFutureEventDate('2026-02-30').valid, false);
  assert.equal(validateFutureEventDate(tomorrow).valid, true);
});

test('Client image input validator rejects SVGs, non-HTTP schemes, non-image extensions, and oversized files', () => {
  const validPng =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';

  assert.equal(validateClientImageInput(validPng).valid, true);
  assert.equal(validateClientImageInput('https://images.unsplash.com/photo-1618477461853-cf6ed80faba5').valid, true);

  assert.equal(validateClientImageInput('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=').valid, false);
  assert.equal(validateClientImageInput('ftp://example.com/photo.jpg').valid, false);
  assert.equal(validateClientImageInput('https://example.com/document.pdf').valid, false);
  assert.equal(
    validateClientImageInput('data:image/png;base64,' + 'A'.repeat(4 * 1024 * 1024), 2 * 1024 * 1024).valid,
    false
  );
});

test('AuthContext image validation handler rejects all non-2xx HTTP responses cleanly', () => {
  const r400 = resolveImageValidationHttpResult(false, 400, { error: 'Bad image URL' });
  assert.equal(r400.valid, false);
  assert.equal(r400.errorMessage, 'Bad image URL');

  const r429 = resolveImageValidationHttpResult(false, 429, null);
  assert.equal(r429.valid, false);
  assert.equal(r429.errorTitle, 'Rate Limit Exceeded');

  const r503 = resolveImageValidationHttpResult(false, 503, {});
  assert.equal(r503.valid, false);
  assert.match(r503.errorMessage, /unavailable/i);

  const r200Invalid = resolveImageValidationHttpResult(true, 200, {
    valid: false,
    errorTitle: 'Blocked Host',
    errorMessage: 'Private IP targets are blocked.',
  });
  assert.equal(r200Invalid.valid, false);
  assert.equal(r200Invalid.errorTitle, 'Blocked Host');

  const r200Valid = resolveImageValidationHttpResult(true, 200, { valid: true });
  assert.equal(r200Valid.valid, true);
});

test('Better Auth fallback adapter persists sign-up session across get-session and token endpoints', async () => {
  const fs = await import('node:fs');
  const prevEnv = process.env.UDDOMI_AUTH_FALLBACK_FILE;
  const fallbackFile = `/tmp/uddomi_auth_fallback_test_${process.pid}.json`;
  process.env.UDDOMI_AUTH_FALLBACK_FILE = fallbackFile;

  try {
    const { getAuth } = await import('../src/lib/auth');
    const auth = await getAuth();
    const uniqueEmail = `unit_test_${Date.now()}@example.com`;
    const signUpRes = await auth.handler(
      new Request('http://127.0.0.1:3000/api/auth/sign-up/email', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'http://127.0.0.1:3000',
          host: '127.0.0.1:3000',
        },
        body: JSON.stringify({
          name: 'Unit Test Volunteer',
          email: uniqueEmail,
          password: 'Password123',
          image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
        }),
      })
    );
    assert.equal(signUpRes.status, 200);
    const signUpBody = (await signUpRes.json()) as { token?: string; user?: { email?: string } };
    assert.ok(signUpBody.token);
    assert.equal(signUpBody.user?.email, uniqueEmail);

    const setCookie = signUpRes.headers.get('set-cookie') || '';
    const cookiePair = setCookie.split(';')[0];
    assert.ok(cookiePair.includes('better-auth.session_token='));

    const sessionRes = await auth.handler(
      new Request('http://127.0.0.1:3000/api/auth/get-session', {
        headers: { cookie: cookiePair, host: '127.0.0.1:3000' },
      })
    );
    assert.equal(sessionRes.status, 200);
    const sessionBody = (await sessionRes.json()) as { user?: { email?: string } } | null;
    assert.equal(sessionBody?.user?.email, uniqueEmail);

    const bearerSession = await auth.api.getSession({
      headers: new Headers({ authorization: `Bearer ${signUpBody.token}` }),
    });
    assert.equal(bearerSession?.user?.email, uniqueEmail);
  } finally {
    if (prevEnv === undefined) {
      delete process.env.UDDOMI_AUTH_FALLBACK_FILE;
    } else {
      process.env.UDDOMI_AUTH_FALLBACK_FILE = prevEnv;
    }
    if (fs.existsSync(fallbackFile)) {
      fs.unlinkSync(fallbackFile);
    }
  }
});

test('/api/auth/status always returns https:// callback URLs for .run.app hosts', async () => {
  const { NextRequest } = await import('next/server');
  const { GET } = await import('../app/api/auth/status/route');

  const req = new NextRequest('http://127.0.0.1:3000/api/auth/status', {
    headers: {
      host: 'ais-dev-w4hennzj3azcwy3u4wbk7q-149637408810.asia-southeast1.run.app',
      'x-forwarded-host': 'ais-dev-w4hennzj3azcwy3u4wbk7q-149637408810.asia-southeast1.run.app',
      'x-forwarded-proto': 'http',
    },
  });

  const res = await GET(req);
  assert.equal(res.status, 200);
  const body = (await res.json()) as {
    githubEnabled: boolean;
    currentCallbackUrl: string;
    callbackUrls: string[];
  };
  assert.ok(body.currentCallbackUrl.startsWith('https://'));
  assert.equal(body.callbackUrls.length, 2);
  assert.ok(body.callbackUrls.every((u) => u.startsWith('https://') && u.endsWith('/api/auth/callback/github')));
});

test('API client keeps bearer token strictly in memory without browser persistence', async () => {
  const { setInMemoryAuthToken, getInMemoryAuthToken } = await import('../src/services/api');
  setInMemoryAuthToken('cookie_session');
  assert.equal(getInMemoryAuthToken(), null);

  setInMemoryAuthToken('ephemeral-jwt-token');
  assert.equal(getInMemoryAuthToken(), 'ephemeral-jwt-token');

  setInMemoryAuthToken(null);
  assert.equal(getInMemoryAuthToken(), null);
});

test('fallbackAuthStore clears stale JWKS when secret changes while preserving users', async () => {
  const fs = await import('node:fs');
  const testFile = `/tmp/uddomi_auth_jwks_reset_${process.pid}.json`;
  const prevEnv = process.env.UDDOMI_AUTH_FALLBACK_FILE;
  const g = globalThis as any;
  const prevDb = g.__uddomiFallbackMemDb;
  const prevSig = g.__uddomiFallbackSignature;

  try {
    process.env.UDDOMI_AUTH_FALLBACK_FILE = testFile;
    g.__uddomiFallbackMemDb = undefined;
    g.__uddomiFallbackSignature = undefined;

    fs.writeFileSync(
      testFile,
      JSON.stringify({
        user: [{ id: 'u1', email: 'keep@example.com', name: 'Keep User' }],
        session: [],
        account: [],
        verification: [],
        jwks: [{ id: 'stale-kid', privateKey: 'encrypted-with-old-secret' }],
        meta: { secretFingerprint: 'old_fingerprint' },
      })
    );

    const { getFallbackMemDb } = await import('../src/lib/fallbackAuthStore');
    const mem = getFallbackMemDb('new_runtime_secret_min_32_chars_123456');
    assert.equal(mem.user.length, 1);
    assert.equal(mem.user[0].email, 'keep@example.com');
    assert.equal(mem.jwks.length, 0);
    assert.equal('meta' in mem, false);
    assert.ok(
      g.__uddomiFallbackSecretFingerprint &&
        g.__uddomiFallbackSecretFingerprint !== 'old_fingerprint'
    );
  } finally {
    g.__uddomiFallbackMemDb = prevDb;
    g.__uddomiFallbackSignature = prevSig;
    if (prevEnv === undefined) delete process.env.UDDOMI_AUTH_FALLBACK_FILE;
    else process.env.UDDOMI_AUTH_FALLBACK_FILE = prevEnv;
    try {
      if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
    } catch {
      // Ignore cleanup errors
    }
  }
});
