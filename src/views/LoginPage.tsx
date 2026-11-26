'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { sanitizeCallbackUrl } from '../utils/authRedirect';
import { Mail, Lock, Eye, EyeOff, LogIn, Heart, Github, Copy, Check, Info } from 'lucide-react';

interface LoginPageProps {
  navigate: (route: string) => void;
  redirectTo?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({ navigate, redirectTo }) => {
  const {
    login,
    loginWithGithub,
    githubEnabled,
    githubCallbackUrls,
    user,
    loading,
    isLoggingOut,
  } = useAuth();
  const { showToast } = useToast();

  const targetRoute = sanitizeCallbackUrl(redirectTo, '/events');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [setupProvider, setSetupProvider] = useState<'github' | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user && !isLoggingOut && !submitting) {
      try {
        const bounceKey = 'uddomi_redirect_guard';
        const last = sessionStorage.getItem(bounceKey);
        const now = Date.now();
        if (last) {
          const parsed = JSON.parse(last);
          if (parsed?.route === targetRoute && now - parsed?.ts < 2500) {
            return;
          }
        }
        sessionStorage.setItem(bounceKey, JSON.stringify({ route: targetRoute, ts: now }));
      } catch {
        // Ignore sessionStorage errors
      }
      navigate(targetRoute);
    }
  }, [loading, user, isLoggingOut, submitting, navigate, targetRoute]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('error', 'Please fill in all mandatory fields before continuing.', 'Missing Information!');
      return;
    }

    try {
      setSubmitting(true);
      const success = await login(email, password);
      if (success) {
        navigate(targetRoute);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGithubLogin = async () => {
    if (githubEnabled === false) {
      setSetupProvider('github');
      await loginWithGithub();
      return;
    }

    try {
      setSubmitting(true);
      const success = await loginWithGithub();
      if (success) {
        navigate(targetRoute);
      } else {
        setSetupProvider('github');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCallbackUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      showToast('success', 'Callback URL copied to clipboard.', 'Copied!');
      setTimeout(() => setCopiedUrl((prev) => (prev === url ? null : prev)), 2000);
    } catch {
      showToast('info', url, 'GitHub Callback URL');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
        {/* Left Form Column matching screenshot download__1__6b070018.png */}
        <div className="p-8 sm:p-12 flex flex-col justify-center space-y-6">
          {/* Logo & Tagline */}
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-emerald-500/30 flex items-center justify-center shadow-xs shrink-0 p-0.5">
                <img
                  src="/logo.png"
                  alt="Uddomi Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                  Uddomi
                </span>
                <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 leading-tight">
                  Empowering People, Inspiring Change.
                </span>
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Welcome back
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Log in to continue making a difference.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-700 shadow-xs"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-700 shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Login Button matching screenshot */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{submitting ? 'Signing in...' : 'Login'}</span>
            </button>
          </form>

          {/* Or Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
            <span className="text-xs text-slate-400 uppercase font-medium">or</span>
            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
          </div>

          {/* GitHub Sign-In Button */}
          <div>
            <button
              type="button"
              onClick={handleGithubLogin}
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
            >
              <Github className="w-4 h-4" />
              <span>Continue with GitHub</span>
            </button>
          </div>

          {setupProvider === 'github' && githubEnabled === false && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 text-xs space-y-2">
              <div className="flex items-start gap-2 text-amber-900 dark:text-amber-200 font-semibold">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  GitHub OAuth requires <code className="font-mono">GITHUB_CLIENT_ID</code> and{' '}
                  <code className="font-mono">GITHUB_CLIENT_SECRET</code> in environment secrets.
                </span>
              </div>
              {githubCallbackUrls.length > 0 && (
                <div className="space-y-1.5 pl-6">
                  <div className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
                    Authorization Callback URL:
                  </div>
                  {githubCallbackUrls.map((url) => (
                    <div
                      key={url}
                      className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-amber-200/80 dark:border-amber-900/60"
                    >
                      <code className="text-[10px] font-mono text-slate-700 dark:text-slate-300 truncate">
                        {url}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopyCallbackUrl(url)}
                        className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 shrink-0 cursor-pointer"
                        title="Copy callback URL"
                      >
                        {copiedUrl === url ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Register Link */}
          <div className="text-center text-xs text-slate-600 dark:text-slate-400 pt-2">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() =>
                navigate(
                  redirectTo && targetRoute !== '/events'
                    ? `/register?callbackUrl=${encodeURIComponent(targetRoute)}`
                    : '/register'
                )
              }
              className="font-bold text-emerald-800 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Register
            </button>
          </div>
        </div>

        {/* Right Photo Column matching screenshot download__1__6b070018.png */}
        <div className="hidden lg:relative lg:flex flex-col justify-end p-10 bg-slate-900 text-white overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1000&q=80"
            alt="Community volunteers"
            className="absolute inset-0 w-full h-full object-cover opacity-60"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/60 to-transparent"></div>

          <div className="relative z-10 space-y-4 max-w-sm">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-emerald-300">
              <Heart className="w-5 h-5 fill-current" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
              Good people. <br /> Stronger communities.
            </h2>
            <p className="text-xs text-emerald-100/90 leading-relaxed">
              Join events, meet kind people, and make an impact—together.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
