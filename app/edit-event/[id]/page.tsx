'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { EditEventPage } from '../../../src/views/EditEventPage';
import { useAppNavigate } from '../../../src/hooks/useAppNavigate';

export default function EditEventByIdPage() {
  const params = useParams();
  const navigate = useAppNavigate();
  const rawId = params?.id;
  const eventId = Array.isArray(rawId) ? rawId[0] : rawId || '';

  return <EditEventPage eventId={decodeURIComponent(eventId)} navigate={navigate} />;
}
