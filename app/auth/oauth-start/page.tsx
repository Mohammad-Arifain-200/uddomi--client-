'use client';

import React, { useEffect, useState } from 'react';
import { authClient } from '@/src/lib/auth-client';

export default function OAuthStartPage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [providerLabel, setProviderLabel] = useState<string>('OAuth');

  useEffect(() => {
    let cancelled = false;

    const startSocialOAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const provider = 'github' as const;
      const label = 'GitHub';
      if (!cancelled) {
        setProviderLabel(label);
      }

      try {
        const clientOrigin = window.location.origin;
        const callbackURL =
          params.get('callbackURL') || `${clientOrigin}/auth/oauth-complete?provider=${provider}`;

        const res = await authClient.signIn.social({
          provider,
          callbackURL,
          errorCallbackURL: `${clientOrigin}/auth/oauth-complete?provider=${provider}&oauth_error=1`,
          disableRedirect: true,
        });

        const authUrl = res?.data?.url;
        if (res?.error || !authUrl) {
          const msg =
            res?.error?.message ||
            'GitHub OAuth is not configured. Please verify GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.';
          if (!cancelled) {
            setErrorMessage(msg);
          }
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(
              { type: 'BETTER_AUTH_OAUTH_ERROR', error: msg },
              window.location.origin
            );
          }
          return;
        }

        window.location.href = authUrl;
      } catch {
        const msg = `Unable to initiate ${label} OAuth login. Please try again.`;
        if (!cancelled) {
          setErrorMessage(msg);
        }
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            { type: 'BETTER_AUTH_OAUTH_ERROR', error: msg },
            window.location.origin
          );
        }
      }
    };

    startSocialOAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  if (errorMessage) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm font-bold text-rose-600">{providerLabel} Sign-In Error</p>
        <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm">{errorMessage}</p>
        <button
          type="button"
          onClick={() => window.close()}
          className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
        >
          Close Window
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="w-10 h-10 rounded-full border-4 border-emerald-200 border-t-emerald-700 animate-spin" />
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        Connecting to {providerLabel}...
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Redirecting securely to {providerLabel} authorization.
      </p>
    </div>
  );
}
