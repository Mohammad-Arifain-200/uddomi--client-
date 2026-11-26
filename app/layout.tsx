import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { AppProviders } from '../src/components/layout/AppProviders';
import { NextAppShell } from '../src/components/layout/NextAppShell';

export const metadata: Metadata = {
  title: 'Uddomi – Empowering People, Inspiring Change',
  description:
    'Uddomi - Empowering People, Inspiring Change. A community-driven event management platform to create, join, and track local social service events.',
  icons: {
    icon: '/logo.png',
  },
  openGraph: {
    title: 'Uddomi – Empowering People, Inspiring Change',
    description:
      'Uddomi - Empowering People, Inspiring Change. A community-driven event management platform to create, join, and track local social service events.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased font-sans selection:bg-emerald-600 selection:text-white">
        <AppProviders>
          <NextAppShell>{children}</NextAppShell>
        </AppProviders>
      </body>
    </html>
  );
}
