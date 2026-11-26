'use client';

import React from 'react';
import { CreateEventPage } from '../../src/views/CreateEventPage';
import { useAppNavigate } from '../../src/hooks/useAppNavigate';

export default function Page() {
  const navigate = useAppNavigate();
  return <CreateEventPage navigate={navigate} />;
}
