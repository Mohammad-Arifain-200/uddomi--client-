'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { UpcomingEventsPage } from '../../src/views/UpcomingEventsPage';
import { EventDetailsPage } from '../../src/views/EventDetailsPage';
import { useAppNavigate } from '../../src/hooks/useAppNavigate';
import { SkeletonCard } from '../../src/components/common/SkeletonCard';

function EventsContent() {
  const navigate = useAppNavigate();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('id');

  if (eventId) {
    return <EventDetailsPage eventId={eventId} navigate={navigate} />;
  }

  return <UpcomingEventsPage navigate={navigate} />;
}

export default function EventsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <SkeletonCard key={n} />
          ))}
        </div>
      }
    >
      <EventsContent />
    </Suspense>
  );
}
