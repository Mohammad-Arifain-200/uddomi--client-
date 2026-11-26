import { NextRequest, NextResponse } from 'next/server';
import { DEV_APP_URL, PREVIEW_APP_URL, getAuthBaseUrl } from '@/src/lib/auth';

export const dynamic = 'force-dynamic';

function isGithubConfigured(): boolean {
  const clientId = process.env.GITHUB_CLIENT_ID?.trim();
  const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
  return Boolean(
    clientId &&
      clientSecret &&
      clientId !== 'your_github_client_id' &&
      clientId !== 'your_github_oauth_client_id' &&
      clientSecret !== 'your_github_client_secret' &&
      clientSecret !== 'your_github_oauth_client_secret'
  );
}

export async function GET(request: NextRequest) {
  const rawHost =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    new URL(getAuthBaseUrl()).host;
  const host = rawHost.split(',')[0].trim();
  const isLocalHost = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host);

  const rawProto = (
    request.headers.get('x-forwarded-proto') ||
    request.nextUrl.protocol.replace(/:$/, '') ||
    'https'
  )
    .split(',')[0]
    .trim()
    .toLowerCase();

  const proto =
    !isLocalHost && (host.endsWith('.run.app') || host.endsWith('.vercel.app') || rawProto !== 'http')
      ? 'https'
      : isLocalHost
      ? rawProto || 'http'
      : 'https';

  const currentOrigin = `${proto}://${host}`;
  const devCallbackUrl = `${DEV_APP_URL}/api/auth/callback/github`;
  const previewCallbackUrl = `${PREVIEW_APP_URL}/api/auth/callback/github`;
  const currentCallbackUrl = `${currentOrigin}/api/auth/callback/github`;

  const callbackUrls = Array.from(
    new Set(
      isLocalHost
        ? [devCallbackUrl, previewCallbackUrl, currentCallbackUrl]
        : [currentCallbackUrl, devCallbackUrl, previewCallbackUrl]
    )
  );

  return NextResponse.json({
    githubEnabled: isGithubConfigured(),
    currentCallbackUrl: isLocalHost ? devCallbackUrl : currentCallbackUrl,
    callbackUrls,
  });
}
