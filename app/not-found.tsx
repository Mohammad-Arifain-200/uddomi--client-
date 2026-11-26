import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, Sprout } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-6">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
        <Sprout className="w-8 h-8" />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Page Not Found
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
          The page you are looking for does not exist or may have been moved.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-semibold shadow-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
        <Link
          href="/events"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm font-semibold transition-colors"
        >
          <Calendar className="w-4 h-4" />
          <span>Upcoming Events</span>
        </Link>
      </div>
    </div>
  );
}
