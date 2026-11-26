'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { buildAuthApiUrl } from '@/src/lib/auth-client';

export default function OAuthCompletePage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [providerLabel, setProviderLabel] = useState<string>('OAuth');
  const [popupStandaloneDone, setPopupStandaloneDone] = useState(false);

  useEffect(() => {
    const completeOAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const rawProvider = params.get('provider');
      const label = rawProvider === 'github' ? 'GitHub' : 'Social';
      setProviderLabel(label);

      const oauthError = params.get('error') || params.get('oauth_error');
      const errorDescription = params.get('error_description');

      const notifyOpenerAndClose = (payload: Record<string, any>) => {
        try {
          if (typeof BroadcastChannel !== 'undefined') {
            const channel = new BroadcastChannel('uddomi_oauth_channel');
            channel.postMessage(payload);
            channel.close();
          }
        } catch {
          // Ignore BroadcastChannel errors
        }

        try {
          if (typeof window !== 'undefined' && window.opener && !window.opener.closed) {
            window.opener.postMessage(payload, window.location.origin);
            window.close();
            return true;
          }
        } catch {
          // Ignore cross-origin errors
        }
        return false;
      };

      if (oauthError) {
        const msg =
          errorDescription ||
          (oauthError === '1'
            ? `${label} authentication failed or was cancelled.`
            : `${label} authentication failed (${oauthError}).`);
        setErrorMessage(msg);
        notifyOpenerAndClose({ type: 'BETTER_AUTH_OAUTH_ERROR', error: msg });
        return;
      }

      let jwtToken: string | null = null;
      let sessionToken: string | null = null;
      let sessionUser: any = null;

      try {
        const sessionRes = await fetch(buildAuthApiUrl('/api/auth/get-session'), {
          credentials: 'include',
        });
        sessionToken = sessionRes.headers.get('set-auth-token');
        if (sessionRes.ok) {
          const data = await sessionRes.json().catch(() => null);
          sessionUser = data?.user || null;
          if (!sessionToken && data?.session?.token) {
            sessionToken = data.session.token;
          }
        }

        const tokenRes = await fetch(buildAuthApiUrl('/api/auth/token'), {
          credentials: 'include',
          headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {},
        });
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json().catch(() => null);
          if (tokenData?.token) {
            jwtToken = tokenData.token;
          }
        }
      } catch {
        // Session will still be checked by opener via HttpOnly cookie or BroadcastChannel
      }

      const closedViaOpener = notifyOpenerAndClose({
        type: 'BETTER_AUTH_OAUTH_COMPLETE',
        user: sessionUser,
        jwtToken,
        sessionToken,
      });
      if (closedViaOpener) {
        return;
      }

      if (typeof window !== 'undefined' && window.name.includes('oauth_popup')) {
        window.close();
        setPopupStandaloneDone(true);
        return;
      }

      router.replace('/events');
    };

    completeOAuth();
  }, [router]);

  if (errorMessage) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm font-bold text-rose-600">{providerLabel} Sign-In Failed</p>
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

  if (popupStandaloneDone) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
          {providerLabel} Sign-In Successful
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm">
          You can close this window and return to Uddomi.
        </p>
        <div className="flex items-center gap-2 mt-1">
          <button
            type="button"
            onClick={() => window.close()}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
          >
            Close Window
          </button>
          <button
            type="button"
            onClick={() => router.replace('/events')}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-semibold cursor-pointer"
          >
            Continue to Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="w-10 h-10 rounded-full border-4 border-emerald-200 border-t-emerald-700 animate-spin" />
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        Completing {providerLabel} sign-in...
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        This window will close automatically.
      </p>
    </div>
  );
}
