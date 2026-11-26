'use client';

import React from 'react';
import { JoinedEventsPage } from '../../src/views/JoinedEventsPage';
import { useAppNavigate } from '../../src/hooks/useAppNavigate';

export default function Page() {
  const navigate = useAppNavigate();
  return <JoinedEventsPage navigate={navigate} />;
}
