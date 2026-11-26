'use client';

import React from 'react';
import { HomePage } from '../src/views/HomePage';
import { useAppNavigate } from '../src/hooks/useAppNavigate';

export default function Page() {
  const navigate = useAppNavigate();
  return <HomePage navigate={navigate} />;
}
