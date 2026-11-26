'use client';

import React from 'react';
import { ManageEventsPage } from '../../src/views/ManageEventsPage';
import { useAppNavigate } from '../../src/hooks/useAppNavigate';

export default function Page() {
  const navigate = useAppNavigate();
  return <ManageEventsPage navigate={navigate} />;
}
