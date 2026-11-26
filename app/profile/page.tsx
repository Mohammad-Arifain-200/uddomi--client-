'use client';

import React from 'react';
import { ProfilePage } from '../../src/views/ProfilePage';
import { useAppNavigate } from '../../src/hooks/useAppNavigate';

export default function Page() {
  const navigate = useAppNavigate();
  return <ProfilePage navigate={navigate} />;
}
