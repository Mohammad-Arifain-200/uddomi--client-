'use client';

import { createAuthClient } from 'better-auth/react';
import { jwtClient } from 'better-auth/client/plugins';

const normalizePublicBaseUrl = (value: string): string => {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(trimmed)) {
    return `http://${trimmed}`;
  }
  return `https://${trimmed}`;
};

const RAW_PUBLIC_API_URL = normalizePublicBaseUrl(
  process.env.NEXT_PUBLIC_API_URL || ''
);

const RAW_PUBLIC_AUTH_URL = normalizePublicBaseUrl(
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL || RAW_PUBLIC_API_URL
);

export const isLocalOrPreviewHost = (hostname?: string): boolean => {
  if (!hostname) return false;
  const host = hostname.toLowerCase();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.run.app')
  );
};

export const getPublicApiBaseUrl = (): string => {
  if (typeof window !== 'undefined' && isLocalOrPreviewHost(window.location.hostname)) {
    return '';
  }
  return RAW_PUBLIC_API_URL;
};

export const getPublicAuthBaseUrl = (): string => {
  if (typeof window !== 'undefined' && isLocalOrPreviewHost(window.location.hostname)) {
    return '';
  }
  return RAW_PUBLIC_AUTH_URL;
};

export const PUBLIC_API_BASE_URL = getPublicApiBaseUrl();
export const PUBLIC_AUTH_BASE_URL = getPublicAuthBaseUrl();

export const buildAuthApiUrl = (path: string): string => {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const base = getPublicAuthBaseUrl();
  return base ? `${base}${normalized}` : normalized;
};

export const buildBackendApiUrl = (path: string): string => {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const base = getPublicApiBaseUrl();
  return base ? `${base}${normalized}` : normalized;
};

export const authClient = createAuthClient({
  ...(PUBLIC_AUTH_BASE_URL ? { baseURL: PUBLIC_AUTH_BASE_URL } : {}),
  basePath: '/api/auth',
  fetchOptions: {
    credentials: 'include',
  },
  plugins: [jwtClient()],
});
