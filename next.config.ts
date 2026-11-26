import type { NextConfig } from 'next';

const defaultLocalBackend = `http://127.0.0.1:${process.env.BACKEND_PORT || '4000'}`;
const externalBackendTarget = (
  process.env.API_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  ''
)
  .trim()
  .replace(/\/+$/, '');

const shouldRewriteToBackend =
  process.env.VERCEL === '1' || process.env.USE_EXTERNAL_BACKEND === '1'
    ? Boolean(externalBackendTarget)
    : true;

const API_BACKEND_URL =
  process.env.VERCEL === '1' || process.env.USE_EXTERNAL_BACKEND === '1'
    ? externalBackendTarget
    : defaultLocalBackend;

const extractHostname = (value?: string): string | null => {
  if (!value) return null;
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
};

const envAllowedOrigins = [
  process.env.CLIENT_URL,
  process.env.APP_URL,
  process.env.BETTER_AUTH_URL,
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  process.env.NEXT_PUBLIC_API_URL,
  process.env.API_BACKEND_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.replace(/^https?:\/\//i, '')}` : undefined,
  process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/^https?:\/\//i, '')}`
    : undefined,
  ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS || '').split(','),
]
  .map((item) => extractHostname(item?.trim()))
  .filter((host): host is string => Boolean(host));

const allowedDevOrigins = Array.from(
  new Set([
    'localhost',
    '**.localhost',
    '127.0.0.1',
    '**.run.app',
    '**.googleusercontent.com',
    '**.aistudio.google.com',
    '**.vercel.app',
    ...envAllowedOrigins,
  ])
);

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['mongodb'],
  allowedDevOrigins,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    if (!shouldRewriteToBackend || !API_BACKEND_URL) {
      return { beforeFiles: [] };
    }
    return {
      beforeFiles: [
        {
          source: '/api/:path((?!auth(?:/|$)).*)',
          destination: `${API_BACKEND_URL}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
