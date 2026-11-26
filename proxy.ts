import { NextRequest, NextResponse } from 'next/server';

const BETTER_AUTH_COOKIES = [
  'better-auth.session_token',
  '__Secure-better-auth.session_token',
  'better-auth.session_data',
  '__Secure-better-auth.session_data',
];

const PROTECTED_PREFIXES = [
  '/create-event',
  '/manage-events',
  '/joined-events',
  '/profile',
  '/edit-event',
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function hasAnyAuthCredential(request: NextRequest): boolean {
  if (request.headers.get('authorization')) {
    return true;
  }
  return BETTER_AUTH_COOKIES.some((name) => Boolean(request.cookies.get(name)?.value));
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  // Let NextAppShell verify client-side on SPA RSC navigations/prefetches (prevents redirect loops in partitioned iframes)
  if (request.headers.get('rsc') || request.headers.get('next-router-prefetch')) {
    return NextResponse.next();
  }

  // When auth is hosted on an external backend domain (NEXT_PUBLIC_BETTER_AUTH_URL or NEXT_PUBLIC_API_URL),
  // session cookies reside on that domain and NextAppShell handles client-side route protection cleanly.
  const reqHost = request.nextUrl.hostname.toLowerCase();
  const isLocalOrPreview =
    reqHost === 'localhost' ||
    reqHost === '127.0.0.1' ||
    reqHost.endsWith('.run.app');

  const externalAuthOriginRaw = (
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ''
  ).trim();
  if (!isLocalOrPreview && externalAuthOriginRaw) {
    try {
      const externalOrigin = new URL(externalAuthOriginRaw).origin;
      if (externalOrigin !== request.nextUrl.origin) {
        return NextResponse.next();
      }
    } catch {
      // Fall through to standard verification if env URL is malformed
    }
  }

  let hasCookie = false;
  let sessionValid = false;

  if (hasAnyAuthCredential(request)) {
    hasCookie = BETTER_AUTH_COOKIES.some((name) => Boolean(request.cookies.get(name)?.value));
    try {
      const port = process.env.PORT || '3000';
      const forwardHeaders: Record<string, string> = {};
      const cookieHeader = request.headers.get('cookie');
      const authHeader = request.headers.get('authorization');
      const hostHeader = request.headers.get('host');
      const fwdHost = request.headers.get('x-forwarded-host');
      const fwdProto = request.headers.get('x-forwarded-proto');

      if (cookieHeader) forwardHeaders.cookie = cookieHeader;
      if (authHeader) forwardHeaders.authorization = authHeader;
      if (hostHeader) forwardHeaders.host = hostHeader;
      if (fwdHost) forwardHeaders['x-forwarded-host'] = fwdHost;
      if (fwdProto) forwardHeaders['x-forwarded-proto'] = fwdProto;

      const sessionBaseUrl =
        process.env.VERCEL === '1'
          ? request.nextUrl.origin
          : `http://127.0.0.1:${port}`;
      const sessionRes = await fetch(`${sessionBaseUrl}/api/auth/get-session`, {
        method: 'GET',
        headers: forwardHeaders,
        cache: 'no-store',
        signal: AbortSignal.timeout(4000),
      });

      if (sessionRes.ok) {
        const data = await sessionRes.json().catch(() => null);
        if (data?.user) {
          sessionValid = true;
        }
      } else if (sessionRes.status >= 500) {
        // On transient 5xx, let client AuthContext verify cleanly instead of dropping session
        return NextResponse.next();
      }
    } catch {
      // On loopback timeout during cold boot, let NextAppShell verify session client-side
      return NextResponse.next();
    }
  }

  if (sessionValid) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  const intendedPath = `${pathname}${search || ''}`;
  loginUrl.searchParams.set('callbackUrl', intendedPath);

  const response = NextResponse.redirect(loginUrl);
  if (hasCookie) {
    for (const cookieName of BETTER_AUTH_COOKIES) {
      if (request.cookies.get(cookieName)) {
        response.cookies.delete(cookieName);
      }
    }
  }
  return response;
}

export const config = {
  matcher: [
    '/create-event',
    '/create-event/:path*',
    '/manage-events',
    '/manage-events/:path*',
    '/joined-events',
    '/joined-events/:path*',
    '/profile',
    '/profile/:path*',
    '/edit-event',
    '/edit-event/:path*',
  ],
};
