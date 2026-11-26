'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { EventDetailsPage } from '../../../src/views/EventDetailsPage';
import { useAppNavigate } from '../../../src/hooks/useAppNavigate';

export default function EventDetailPage() {
  const params = useParams();
  const navigate = useAppNavigate();
  const rawId = params?.id;
  const eventId = Array.isArray(rawId) ? rawId[0] : rawId || '';

  return <EventDetailsPage eventId={decodeURIComponent(eventId)} navigate={navigate} />;
}
