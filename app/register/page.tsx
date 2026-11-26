'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RegisterPage } from '../../src/views/RegisterPage';
import { useAppNavigate } from '../../src/hooks/useAppNavigate';
import { sanitizeCallbackUrl } from '../../src/utils/authRedirect';

function RegisterRouteContent() {
  const navigate = useAppNavigate();
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get('callbackUrl');
  const redirectTo = rawCallbackUrl ? sanitizeCallbackUrl(rawCallbackUrl, '/events') : undefined;

  return <RegisterPage navigate={navigate} redirectTo={redirectTo} />;
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-4 border-emerald-200 border-t-emerald-700 animate-spin" />
        </div>
      }
    >
      <RegisterRouteContent />
    </Suspense>
  );
}
