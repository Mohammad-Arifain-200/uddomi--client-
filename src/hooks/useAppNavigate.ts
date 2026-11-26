'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

export type AppNavigateFn = (route: string, params?: Record<string, string>) => void;

export function buildAppRouteUrl(route: string, params?: Record<string, string>): string {
  if (params && params.id) {
    if (route === '/events') {
      const rest = { ...params };
      delete rest.id;
      const qs = new URLSearchParams(rest).toString();
      return `/events/${encodeURIComponent(params.id)}${qs ? `?${qs}` : ''}`;
    }
    if (route === '/edit-event') {
      const rest = { ...params };
      delete rest.id;
      const qs = new URLSearchParams(rest).toString();
      return `/edit-event/${encodeURIComponent(params.id)}${qs ? `?${qs}` : ''}`;
    }
  }

  if (params && Object.keys(params).length > 0) {
    return `${route}?${new URLSearchParams(params).toString()}`;
  }

  return route;
}

export function useAppNavigate(): AppNavigateFn {
  const router = useRouter();

  return useCallback(
    (route: string, params?: Record<string, string>) => {
      const url = buildAppRouteUrl(route, params);
      router.push(url);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [router]
  );
}
