'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import { useToast } from './ToastContext';
import { authClient, buildAuthApiUrl, buildBackendApiUrl } from '../lib/auth-client';
import { setInMemoryAuthToken } from '../services/api';
import {
  resolveImageValidationHttpResult,
  validateClientImageInput,
} from '../utils/imageValidation';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  isLoggingOut: boolean;
  githubEnabled: boolean | null;
  githubCallbackUrls: string[];
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, photoURL: string, password: string) => Promise<boolean>;
  loginWithGithub: () => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (name: string, photoURL: string) => Promise<boolean>;
  validatePassword: (password: string) => { valid: boolean; message?: string };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80';

function mapBetterAuthUserToProfile(baUser: any): UserProfile {
  return {
    id: baUser.legacyId || baUser.id,
    name: baUser.name || baUser.email?.split('@')[0] || 'Volunteer',
    email: (baUser.email || '').toLowerCase(),
    photoURL: baUser.image || DEFAULT_AVATAR,
    accountType: baUser.accountType || 'Standard Volunteer',
    memberSince:
      baUser.memberSince ||
      new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    lastSignedIn: baUser.lastSignedIn,
    timeZone: baUser.timeZone || 'UTC',
  };
}

function purgeLegacyBrowserAuthStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('goodgather_jwt_token');
    localStorage.removeItem('goodgather_auth_user');
    sessionStorage.removeItem('uddomi_ba_session_bearer');
  } catch {
    // Ignore storage access errors
  }
}

async function fetchBetterAuthJwt(sessionBearer?: string | null): Promise<string> {
  try {
    const headers: Record<string, string> = {};
    if (sessionBearer) {
      headers.Authorization = `Bearer ${sessionBearer}`;
    }
    const res = await fetch(buildAuthApiUrl('/api/auth/token'), {
      credentials: 'include',
      headers,
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.token) {
        setInMemoryAuthToken(data.token);
        return data.token;
      }
    }
  } catch {
    // Session cookie remains authoritative when JWT endpoint is temporarily unavailable
  }
  if (sessionBearer && sessionBearer !== 'cookie_session') {
    setInMemoryAuthToken(sessionBearer);
    return sessionBearer;
  }
  setInMemoryAuthToken(null);
  return 'cookie_session';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [githubEnabled, setGithubEnabled] = useState<boolean | null>(null);
  const [githubCallbackUrls, setGithubCallbackUrls] = useState<string[]>([]);
  const sessionBearerRef = useRef<string | null>(null);
  const { showToast } = useToast();

  // Verify authoritative Better Auth HttpOnly session + auth provider status on boot/refresh
  useEffect(() => {
    purgeLegacyBrowserAuthStorage();

    const fetchAuthStatus = async () => {
      try {
        const res = await fetch(buildAuthApiUrl('/api/auth/status'), {
          credentials: 'include',
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data && typeof data.githubEnabled === 'boolean') {
            setGithubEnabled(data.githubEnabled);
            if (Array.isArray(data.callbackUrls)) {
              setGithubCallbackUrls(data.callbackUrls);
            }
          }
        }
      } catch {
        // Keep null if status check fails transiently
      }
    };

    const initializeAuth = async () => {
      try {
        const sessionRes = await authClient.getSession({ query: {} });
        if (sessionRes?.data?.user) {
          const profile = mapBetterAuthUserToProfile(sessionRes.data.user);
          const sessionToken = (sessionRes.data as any)?.session?.token || null;
          sessionBearerRef.current = sessionToken;
          const jwtToken = await fetchBetterAuthJwt(sessionToken);
          setUser(profile);
          setToken(jwtToken);
          return;
        }
      } catch {
        // Session invalid or unavailable
      } finally {
        setLoading(false);
      }

      sessionBearerRef.current = null;
      setInMemoryAuthToken(null);
      setUser(null);
      setToken(null);
    };

    fetchAuthStatus();
    initializeAuth();
  }, []);

  const validatePassword = (password: string) => {
    if (!password || password.length < 6) {
      return { valid: false, message: 'Password must be at least 6 characters long.' };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter (A-Z).' };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter (a-z).' };
    }
    return { valid: true };
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    if (!email || !password) {
      showToast('error', 'Please fill in all mandatory fields before continuing.', 'Missing Information!');
      return false;
    }

    try {
      const res = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
      });

      if (res.error) {
        showToast(
          'error',
          res.error.message || 'Please check your credentials and try again.',
          'Incorrect Email or Password!'
        );
        return false;
      }

      const loginToken = (res.data as any)?.token || null;
      sessionBearerRef.current = loginToken;

      const sessionRes = await authClient.getSession({ query: {} });
      let sessionUser = sessionRes?.data?.user || res.data?.user;
      if (!sessionUser && loginToken) {
        const bearerRes = await fetch(buildAuthApiUrl('/api/auth/get-session'), {
          credentials: 'include',
          headers: { Authorization: `Bearer ${loginToken}` },
        });
        if (bearerRes.ok) {
          const bearerData = await bearerRes.json().catch(() => null);
          sessionUser = bearerData?.user || null;
        }
      }
      if (!sessionUser) {
        showToast('error', 'Failed to establish authenticated session.', 'Authentication Error');
        return false;
      }

      const profile = mapBetterAuthUserToProfile(sessionUser);
      const jwtToken = await fetchBetterAuthJwt(loginToken);

      setIsLoggingOut(false);
      setUser(profile);
      setToken(jwtToken);

      showToast('success', 'Signed in successfully. Great to have you back with us!', 'Welcome Back!');
      return true;
    } catch {
      showToast('error', 'Unable to reach the server. Please check your connection and try again.', 'Connection Problem!');
      return false;
    }
  };

  const register = async (name: string, email: string, photoURL: string, password: string): Promise<boolean> => {
    if (!name.trim()) {
      showToast('error', 'Please fill in all mandatory fields before continuing.', 'Missing Information!');
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      showToast('error', 'Please enter a valid email address.', 'Missing Information!');
      return false;
    }
    if (!photoURL.trim()) {
      showToast('error', 'Please provide a valid and working image URL to complete registration.', 'Profile Photo Is Required!');
      return false;
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      showToast('error', passwordCheck.message || 'Password must meet all security requirements.', 'Missing Information!');
      return false;
    }

    const trimmedPhoto = photoURL.trim();
    const clientPhotoCheck = validateClientImageInput(trimmedPhoto, 3.5 * 1024 * 1024);
    if (!clientPhotoCheck.valid) {
      showToast('error', clientPhotoCheck.errorMessage, clientPhotoCheck.errorTitle);
      return false;
    }

    try {
      try {
        const imgVerifyRes = await fetch(buildBackendApiUrl('/api/validate-image'), {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: trimmedPhoto }),
        });

        // For client-verified data:image/* uploads, only reject if server explicitly returned an invalid payload
        const isClientVerifiedDataUrl = trimmedPhoto.startsWith('data:image/');
        if (imgVerifyRes.status < 500 && !(isClientVerifiedDataUrl && (imgVerifyRes.status === 404 || imgVerifyRes.status === 413))) {
          const imgVerifyBody = await imgVerifyRes.json().catch(() => null);
          if (imgVerifyBody || !isClientVerifiedDataUrl) {
            const resolvedCheck = resolveImageValidationHttpResult(
              imgVerifyRes.ok,
              imgVerifyRes.status,
              imgVerifyBody
            );
            if (!resolvedCheck.valid) {
              showToast('error', resolvedCheck.errorMessage, resolvedCheck.errorTitle);
              return false;
            }
          }
        }
      } catch {
        // Allow registration to proceed if validation service is temporarily unreachable
      }

      const memberSince = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      const res = await (authClient.signUp.email as any)({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        image: trimmedPhoto,
        accountType: 'Standard Volunteer',
        memberSince,
      });

      if (res.error) {
        showToast('error', res.error.message || 'Registration failed.', 'Registration Failed');
        return false;
      }

      const signupToken = (res.data as any)?.token || null;
      sessionBearerRef.current = signupToken;

      const sessionRes = await authClient.getSession({ query: {} });
      let sessionUser = sessionRes?.data?.user || res.data?.user;
      if (!sessionUser && signupToken) {
        const bearerRes = await fetch(buildAuthApiUrl('/api/auth/get-session'), {
          credentials: 'include',
          headers: { Authorization: `Bearer ${signupToken}` },
        });
        if (bearerRes.ok) {
          const bearerData = await bearerRes.json().catch(() => null);
          sessionUser = bearerData?.user || null;
        }
      }
      if (!sessionUser) {
        showToast('error', 'Registration succeeded but session initialization failed.', 'Session Error');
        return false;
      }

      const profile = mapBetterAuthUserToProfile({
        ...sessionUser,
        image: sessionUser.image || trimmedPhoto,
      });
      const jwtToken = await fetchBetterAuthJwt(signupToken);

      setIsLoggingOut(false);
      setUser(profile);
      setToken(jwtToken);

      showToast(
        'success',
        'Your account has been created successfully. Start exploring and joining community events!',
        'Welcome to Uddomi!'
      );
      return true;
    } catch {
      showToast('error', 'Unable to reach the server. Please check your connection and try again.', 'Connection Problem!');
      return false;
    }
  };

  const loginWithOAuth = async (provider: 'github'): Promise<boolean> => {
    const label = 'GitHub';
    const enabled = githubEnabled;
    const missingMsg =
      'Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in environment secrets to enable GitHub OAuth.';

    if (enabled === false) {
      showToast('warning', missingMsg, `${label} OAuth Setup Required`);
      return false;
    }

    const authWindow = window.open('about:blank', `${provider}_oauth_popup`, 'width=600,height=700');
    if (!authWindow) {
      showToast(
        'warning',
        `Please allow popups for this site to sign in with ${label}.`,
        'Popup Blocked'
      );
      return false;
    }

    try {
      try {
        authWindow.document.title = `Connecting to ${label}...`;
        authWindow.document.body.innerHTML = `<div style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#0f172a;">Connecting to ${label}...</div>`;
      } catch {
        // Ignore cross-origin document write errors
      }

      const clientOrigin = window.location.origin;
      const socialRes = await authClient.signIn.social({
        provider,
        callbackURL: `${clientOrigin}/auth/oauth-complete?provider=${provider}`,
        errorCallbackURL: `${clientOrigin}/auth/oauth-complete?provider=${provider}&oauth_error=1`,
        disableRedirect: true,
      });

      const authUrl = socialRes?.data?.url;
      if (socialRes?.error || !authUrl) {
        try {
          authWindow.close();
        } catch {
          // Ignore close error
        }
        const rawMsg = (socialRes?.error?.message || '').toLowerCase();
        const isNotConfigured =
          socialRes?.error?.status === 404 ||
          rawMsg.includes('provider not found') ||
          rawMsg.includes('not found') ||
          socialRes?.error?.code === 'PROVIDER_NOT_FOUND';
        if (isNotConfigured) {
          setGithubEnabled(false);
        }
        showToast(
          isNotConfigured ? 'warning' : 'error',
          isNotConfigured
            ? missingMsg
            : socialRes?.error?.message || `Unable to start ${label} authentication.`,
          isNotConfigured ? `${label} OAuth Setup Required` : `${label} Sign-In Unavailable`
        );
        return false;
      }

      authWindow.location.href = authUrl;

      return await new Promise<boolean>((resolve) => {
        let settled = false;
        let closeGraceTimer: ReturnType<typeof setTimeout> | null = null;
        let oauthChannel: BroadcastChannel | null = null;

        const cleanup = () => {
          window.removeEventListener('message', handleMessage);
          clearInterval(pollTimer);
          if (closeGraceTimer) {
            clearTimeout(closeGraceTimer);
            closeGraceTimer = null;
          }
          if (oauthChannel) {
            try {
              oauthChannel.close();
            } catch {
              // Ignore BroadcastChannel close errors
            }
            oauthChannel = null;
          }
        };

        const finalizeOAuthSession = async (payload?: {
          user?: any;
          jwtToken?: string | null;
          sessionToken?: string | null;
        }): Promise<boolean> => {
          const sessionRes = await authClient.getSession({ query: {} });
          let resolvedUser = sessionRes?.data?.user || null;
          const resolvedJwt = payload?.jwtToken || null;

          if (payload?.sessionToken) {
            sessionBearerRef.current = payload.sessionToken;
          } else if ((sessionRes?.data as any)?.session?.token) {
            sessionBearerRef.current = (sessionRes.data as any).session.token;
          }

          if (!resolvedUser && payload?.sessionToken) {
            const bearerSessionRes = await fetch(buildAuthApiUrl('/api/auth/get-session'), {
              credentials: 'include',
              headers: { Authorization: `Bearer ${payload.sessionToken}` },
            });
            if (bearerSessionRes.ok) {
              const bearerData = await bearerResJson(bearerSessionRes);
              if (bearerData?.user) {
                resolvedUser = bearerData.user;
              }
            }
          }

          if (!resolvedUser && payload?.user) {
            resolvedUser = payload.user;
          }

          if (resolvedUser) {
            const profile = mapBetterAuthUserToProfile(resolvedUser);
            const jwtToken =
              resolvedJwt ||
              (await fetchBetterAuthJwt(payload?.sessionToken || sessionBearerRef.current));
            setInMemoryAuthToken(jwtToken);

            setIsLoggingOut(false);
            setUser(profile);
            setToken(jwtToken);

            showToast(
              'success',
              `Signed in with ${label} as ${profile.name}. Welcome to Uddomi!`,
              `${label} Sign-In Successful!`
            );
            return true;
          }
          return false;
        };

        const bearerResJson = async (res: Response) => {
          try {
            return await res.json();
          } catch {
            return null;
          }
        };

        const processOAuthData = async (data: any) => {
          if (data?.type === 'BETTER_AUTH_OAUTH_ERROR') {
            if (settled) return;
            settled = true;
            cleanup();
            showToast(
              'error',
              data?.error || `${label} authentication failed. Please try again.`,
              `${label} Login Failed`
            );
            resolve(false);
            return;
          }

          if (data?.type === 'BETTER_AUTH_OAUTH_COMPLETE') {
            if (settled) return;
            settled = true;
            cleanup();
            const ok = await finalizeOAuthSession({
              user: data?.user,
              jwtToken: data?.jwtToken,
              sessionToken: data?.sessionToken,
            });
            if (!ok) {
              showToast(
                'error',
                `${label} authentication did not create a session. Please try again.`,
                `${label} Login Failed`
              );
            }
            resolve(ok);
          }
        };

        const handleMessage = async (event: MessageEvent) => {
          if (event.origin !== window.location.origin) {
            return;
          }
          await processOAuthData(event.data);
        };

        window.addEventListener('message', handleMessage);

        try {
          if (typeof BroadcastChannel !== 'undefined') {
            oauthChannel = new BroadcastChannel('uddomi_oauth_channel');
            oauthChannel.onmessage = (event) => {
              void processOAuthData(event.data);
            };
          }
        } catch {
          // BroadcastChannel optional fallback
        }

        const pollTimer = setInterval(() => {
          if (authWindow.closed && !settled && !closeGraceTimer) {
            closeGraceTimer = setTimeout(async () => {
              if (settled) return;
              settled = true;
              cleanup();
              try {
                const ok = await finalizeOAuthSession();
                resolve(ok);
              } catch {
                resolve(false);
              }
            }, 250);
          }
        }, 400);
      });
    } catch {
      try {
        authWindow.close();
      } catch {
        // Ignore close error
      }
      showToast('error', `Unable to initiate ${label} OAuth login. Please try again.`, 'Connection Problem!');
      return false;
    }
  };

  const loginWithGithub = () => loginWithOAuth('github');

  const logout = async (): Promise<void> => {
    setIsLoggingOut(true);
    const activeBearer = sessionBearerRef.current;
    try {
      await authClient.signOut({
        fetchOptions: activeBearer
          ? { headers: { Authorization: `Bearer ${activeBearer}` } }
          : undefined,
      });
    } catch {
      // Clear client state even on transient network errors
    }
    sessionBearerRef.current = null;
    setInMemoryAuthToken(null);
    purgeLegacyBrowserAuthStorage();
    setUser(null);
    setToken(null);
    showToast('info', 'You have been safely logged out. See you again soon!', 'See You Soon!');
  };

  const updateProfile = async (name: string, photoURL: string): Promise<boolean> => {
    if (!user) return false;
    if (!name.trim()) {
      showToast('error', 'Please fill in all mandatory fields before continuing.', 'Missing Information!');
      return false;
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const authBearer =
        token && token !== 'cookie_session' ? token : sessionBearerRef.current;
      if (authBearer) {
        headers.Authorization = `Bearer ${authBearer}`;
      }

      const res = await fetch(buildBackendApiUrl('/api/user/profile'), {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify({ name: name.trim(), photoURL: photoURL.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        await authClient.getSession({ query: { disableCookieCache: true } }).catch(() => {});
        const refreshedJwt = await fetchBetterAuthJwt(sessionBearerRef.current);
        setToken(refreshedJwt);
        showToast('success', 'Your profile details have been saved successfully.', 'Profile Updated!');
        return true;
      }

      const errData = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        showToast('error', errData.error || 'Please log in again to update your profile.', 'Access Restricted!');
      } else {
        showToast('error', errData.error || 'Failed to update profile.', errData.title || 'Missing Information!');
      }
      return false;
    } catch {
      showToast('error', 'Unable to reach the server. Please check your connection and try again.', 'Connection Problem!');
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isLoggingOut,
        githubEnabled,
        githubCallbackUrls,
        login,
        register,
        loginWithGithub,
        logout,
        updateProfile,
        validatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
