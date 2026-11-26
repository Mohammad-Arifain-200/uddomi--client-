'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAppNavigate } from '../../hooks/useAppNavigate';

const PROTECTED_PREFIXES = [
  '/create-event',
  '/manage-events',
  '/edit-event',
  '/joined-events',
  '/profile',
];

export const NextAppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const navigate = useAppNavigate();
  const { user, loading, isLoggingOut } = useAuth();
  const { showToast } = useToast();
  const lastRedirectedPathRef = useRef<string | null>(null);

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  useEffect(() => {
    if (!loading && isProtected && !user) {
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const intendedPath = `${pathname}${search}`;

      if (!isLoggingOut && lastRedirectedPathRef.current !== intendedPath) {
        lastRedirectedPathRef.current = intendedPath;
        showToast('warning', 'Please log in to perform this action.', 'Access Restricted!');
      }

      if (isLoggingOut) {
        router.replace('/login');
      } else {
        router.replace(`/login?callbackUrl=${encodeURIComponent(intendedPath)}`);
      }
    } else if (user || !isProtected) {
      lastRedirectedPathRef.current = null;
    }
  }, [loading, isProtected, user, isLoggingOut, pathname, router, showToast]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar currentRoute={pathname} navigate={navigate} />

      <main className="flex-1 animate-fade-in">
        {isProtected && (loading || !user) ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-4">
            <div className="w-10 h-10 rounded-full border-4 border-emerald-200 dark:border-emerald-900 border-t-emerald-700 dark:border-t-emerald-400 animate-spin" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {loading ? 'Verifying your session...' : 'Redirecting to login...'}
            </p>
          </div>
        ) : (
          children
        )}
      </main>

      <Footer navigate={navigate} />
    </div>
  );
};
