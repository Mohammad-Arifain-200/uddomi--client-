'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { sanitizeCallbackUrl } from '../utils/authRedirect';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  compressImageFileToDataUrl,
  validateClientImageInput,
} from '../utils/imageValidation';
import {
  User,
  Mail,
  Image as ImageIcon,
  Lock,
  Eye,
  EyeOff,
  Check,
  Heart,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Github,
  Copy,
  Info,
} from 'lucide-react';

interface RegisterPageProps {
  navigate: (route: string) => void;
  redirectTo?: string;
}

/**
 * Validates that the input is a genuine, reachable, and loadable image resource.
 * Rejects empty strings, malformed URLs, non-image document links (PDF/HTML/TXT),
 * and broken links that fail to render an image element.
 */
export const validateImageUrl = (
  url: string
): Promise<{ valid: boolean; errorTitle: string; errorMessage: string }> => {
  return new Promise((resolve) => {
    const trimmed = (url || '').trim();

    const formatCheck = validateClientImageInput(trimmed, 3.5 * 1024 * 1024);
    if (!formatCheck.valid) {
      return resolve({
        valid: false,
        errorTitle: formatCheck.errorTitle,
        errorMessage: formatCheck.errorMessage,
      });
    }

    // 3. Real Asynchronous Image Loading Test in the DOM
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    let isSettled = false;

    const timer = setTimeout(() => {
      if (isSettled) return;
      isSettled = true;
      img.onload = null;
      img.onerror = null;
      resolve({
        valid: false,
        errorTitle: 'Unable to Load Image!',
        errorMessage: 'The image URL took too long to respond or could not be loaded.',
      });
    }, 6000);

    img.onload = () => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timer);
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        resolve({
          valid: true,
          errorTitle: 'Profile Photo Verified Successfully!',
          errorMessage: '',
        });
      } else {
        resolve({
          valid: false,
          errorTitle: 'Unable to Load Image!',
          errorMessage: 'The image file appears corrupted or cannot be displayed.',
        });
      }
    };

    img.onerror = () => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timer);
      resolve({
        valid: false,
        errorTitle: 'Unable to Load Image!',
        errorMessage: 'Could not load image from this URL. Please verify the link is working.',
      });
    };

    img.src = trimmed;
  });
};

export const RegisterPage: React.FC<RegisterPageProps> = ({ navigate, redirectTo }) => {
  const {
    register,
    loginWithGithub,
    githubEnabled,
    githubCallbackUrls,
    validatePassword,
    user,
    loading,
    isLoggingOut,
  } = useAuth();
  const { showToast } = useToast();

  const targetRoute = sanitizeCallbackUrl(redirectTo, '/events');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [photoURL, setPhotoURL] = useState('');
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

  // Photo Validation State
  const [photoStatus, setPhotoStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [photoFeedback, setPhotoFeedback] = useState<{ title: string; message: string }>({
    title: '',
    message: '',
  });
  const verifiedPhotoUrlRef = useRef('');

  // Debounced auto-validation on photo URL changes
  const validationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (validationDebounceRef.current) {
      clearTimeout(validationDebounceRef.current);
    }

    const trimmed = photoURL.trim();
    if (!trimmed) {
      setPhotoStatus('idle');
      setPhotoFeedback({ title: '', message: '' });
      verifiedPhotoUrlRef.current = '';
      return;
    }

    // Skip re-check if already verified matching URL
    if (trimmed === verifiedPhotoUrlRef.current) {
      setPhotoStatus('valid');
      return;
    }

    setPhotoStatus('checking');
    validationDebounceRef.current = setTimeout(async () => {
      const result = await validateImageUrl(trimmed);
      if (cancelled) return;
      if (result.valid) {
        setPhotoStatus('valid');
        verifiedPhotoUrlRef.current = trimmed;
        setPhotoFeedback({
          title: 'Profile Photo Verified Successfully!',
          message: '',
        });
      } else {
        setPhotoStatus('invalid');
        verifiedPhotoUrlRef.current = '';
        setPhotoFeedback({
          title: result.errorTitle,
          message: result.errorMessage,
        });
      }
    }, 600);

    return () => {
      cancelled = true;
      if (validationDebounceRef.current) {
        clearTimeout(validationDebounceRef.current);
      }
    };
  }, [photoURL]);

  // Real-time password criteria (assignment specification: uppercase, lowercase, min 6 chars)
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasLength = password.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast('error', 'Please fill in all mandatory fields before continuing.', 'Missing Information!');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      showToast('error', 'Please enter a valid email address.', 'Missing Information!');
      return;
    }

    // 1. Check if photoURL is empty
    if (!photoURL.trim()) {
      setPhotoStatus('invalid');
      setPhotoFeedback({
        title: 'Profile Photo Is Required!',
        message: 'Please provide a valid and working image URL to complete registration.',
      });
      showToast('error', 'Please provide a valid and working image URL to complete registration.', 'Profile Photo Is Required!');
      return;
    }

    // 2. Strict Live Verification Check (skip re-testing DOM image if already verified)
    setSubmitting(true);
    const trimmedPhotoUrl = photoURL.trim();
    if (trimmedPhotoUrl !== verifiedPhotoUrlRef.current) {
      const photoCheck = await validateImageUrl(trimmedPhotoUrl);
      if (!photoCheck.valid) {
        setSubmitting(false);
        setPhotoStatus('invalid');
        setPhotoFeedback({
          title: photoCheck.errorTitle,
          message: photoCheck.errorMessage,
        });
        showToast('error', photoCheck.errorMessage, photoCheck.errorTitle);
        return; // STRICT BLOCK: Registration must NOT proceed!
      }
      verifiedPhotoUrlRef.current = trimmedPhotoUrl;
    }

    setPhotoStatus('valid');

    // 3. Password Validation
    const check = validatePassword(password);
    if (!check.valid) {
      setSubmitting(false);
      showToast('error', check.message || 'Password requirements not met.', 'Missing Information!');
      return;
    }

    try {
      const success = await register(name, email, photoURL.trim(), password);
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type.toLowerCase() as any)) {
      showToast('error', 'Unsupported format. Please upload a JPG, PNG, WEBP, or GIF image.', 'Unsupported Image Format');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'Photo size exceeds 5MB limit. Please select a smaller photo.', 'Image Too Large');
      e.target.value = '';
      return;
    }

    setPhotoStatus('checking');
    try {
      const dataUrl = await compressImageFileToDataUrl(file, {
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.84,
      });
      const result = await validateImageUrl(dataUrl);
      if (result.valid) {
        verifiedPhotoUrlRef.current = dataUrl;
        setPhotoURL(dataUrl);
        setPhotoStatus('valid');
        setPhotoFeedback({
          title: 'Profile Photo Verified Successfully!',
          message: '',
        });
        showToast('success', 'Your photo has been uploaded and verified.', 'Photo Uploaded Successfully!');
      } else {
        setPhotoURL(dataUrl);
        setPhotoStatus('invalid');
        setPhotoFeedback({
          title: result.errorTitle,
          message: result.errorMessage,
        });
        showToast('error', result.errorMessage, result.errorTitle);
      }
    } catch {
      setPhotoStatus('invalid');
      showToast('error', 'Failed to read the selected image file.', 'Upload Error');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
        {/* Left Form Column matching screenshot download__2__7d5927da.png */}
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
              Join the community
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Create an account to connect, share opportunities, and make a positive impact together.
            </p>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Name */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-700 shadow-xs"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-700 shadow-xs"
                />
              </div>
            </div>

            {/* Mandatory Photo URL (Strict Validation & Live Preview) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Photo URL <span className="text-rose-500">*</span>
                </label>
                <label className="cursor-pointer text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 hover:underline flex items-center gap-1">
                  <span>Upload photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    inputMode="url"
                    value={photoURL}
                    onChange={(e) => setPhotoURL(e.target.value)}
                    placeholder="Paste working image URL or upload photo"
                    required
                    className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 shadow-xs transition-colors ${
                      photoStatus === 'invalid'
                        ? 'border-rose-400 focus:ring-rose-500'
                        : photoStatus === 'valid'
                        ? 'border-emerald-500 focus:ring-emerald-600'
                        : 'border-slate-200 dark:border-slate-700 focus:ring-emerald-700'
                    }`}
                  />
                </div>

                {/* Status Indicator Icon or Thumbnail */}
                {photoStatus === 'checking' && (
                  <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                  </div>
                )}
                {photoStatus === 'valid' && (
                  <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-emerald-500 shrink-0 shadow-xs ring-2 ring-emerald-500/20">
                    <img
                      key={photoURL}
                      src={photoURL}
                      alt="Verified Profile Preview"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onLoad={(e) => {
                        delete e.currentTarget.dataset.fallbackApplied;
                      }}
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (img.dataset.fallbackApplied === '1') return;
                        img.dataset.fallbackApplied = '1';
                        img.src =
                          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80';
                      }}
                    />
                  </div>
                )}
                {photoStatus === 'invalid' && (
                  <div className="w-9 h-9 rounded-full bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center shrink-0 border border-rose-300 dark:border-rose-800 text-rose-600">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                )}
              </div>

              {/* Status and Feedback Messages */}
              {photoStatus === 'checking' && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 pt-0.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Verifying image content...</span>
                </div>
              )}

              {photoStatus === 'valid' && (
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 pt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Profile Photo Verified Successfully!</span>
                </div>
              )}

              {photoStatus === 'invalid' && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs space-y-0.5">
                  <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-bold text-xs">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{photoFeedback.title || 'Invalid Photo URL!'}</span>
                  </div>
                  <p className="text-[11px] text-rose-600 dark:text-rose-300 pl-5">
                    {photoFeedback.message}
                  </p>
                </div>
              )}
            </div>

            {/* Password with Eye Toggle */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
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

              {/* Password Validation Checklist */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs space-y-2 mt-2">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Password Requirements:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  <div
                    className={`flex items-center gap-1.5 transition-colors ${
                      hasUppercase ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Check className={`w-3.5 h-3.5 ${hasUppercase ? 'stroke-[2.5]' : 'opacity-30'}`} />
                    <span>Uppercase (A-Z)</span>
                  </div>

                  <div
                    className={`flex items-center gap-1.5 transition-colors ${
                      hasLowercase ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Check className={`w-3.5 h-3.5 ${hasLowercase ? 'stroke-[2.5]' : 'opacity-30'}`} />
                    <span>Lowercase (a-z)</span>
                  </div>

                  <div
                    className={`flex items-center gap-1.5 transition-colors ${
                      hasLength ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Check className={`w-3.5 h-3.5 ${hasLength ? 'stroke-[2.5]' : 'opacity-30'}`} />
                    <span>Min 6 characters</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Create Account Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              <span>{submitting ? 'Verifying & Creating...' : 'Create Account'}</span>
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

          {/* Login Link */}
          <div className="text-center text-xs text-slate-600 dark:text-slate-400">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() =>
                navigate(
                  redirectTo && targetRoute !== '/events'
                    ? `/login?callbackUrl=${encodeURIComponent(targetRoute)}`
                    : '/login'
                )
              }
              className="font-bold text-emerald-800 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Login
            </button>
          </div>
        </div>

        {/* Right Photo Column matching screenshot download__2__7d5927da.png */}
        <div className="hidden lg:relative lg:flex flex-col justify-end p-10 bg-slate-900 text-white overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1000&q=80"
            alt="Volunteers planting saplings"
            className="absolute inset-0 w-full h-full object-cover opacity-60"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/60 to-transparent"></div>

          {/* Wooden sign mockup matching screenshot */}
          <div className="relative z-10 self-end p-5 rounded-2xl bg-emerald-900/80 backdrop-blur-md border border-emerald-700/60 shadow-xl max-w-xs text-center space-y-1">
            <h3 className="text-lg font-extrabold text-white tracking-wide">
              Small actions.
            </h3>
            <h4 className="text-xl font-black text-emerald-300">
              Big impact.
            </h4>
            <div className="text-emerald-200 pt-1">
              <Heart className="w-4 h-4 mx-auto fill-current text-rose-300" />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
