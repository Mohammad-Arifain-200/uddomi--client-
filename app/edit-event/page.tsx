'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { EditEventPage } from '../../src/views/EditEventPage';
import { useAppNavigate } from '../../src/hooks/useAppNavigate';

function EditEventContent() {
  const navigate = useAppNavigate();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('id') || '';

  if (!eventId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">No Event Selected</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Choose an event from your Manage Events dashboard to edit its details.
        </p>
        <button
          onClick={() => navigate('/manage-events')}
          className="px-5 py-2.5 rounded-xl bg-emerald-800 text-white font-semibold text-sm hover:bg-emerald-900 cursor-pointer"
        >
          Go to Manage Events
        </button>
      </div>
    );
  }

  return <EditEventPage eventId={eventId} navigate={navigate} />;
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse space-y-6">
          <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-12 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-96 w-full bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      }
    >
      <EditEventContent />
    </Suspense>
  );
}
