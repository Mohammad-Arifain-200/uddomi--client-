'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, X, CheckCircle2, ArrowRight } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface FooterProps {
  navigate: (route: string) => void;
}

type ResourceKey =
  | 'guidelines'
  | 'faqs'
  | 'organizerGuide'
  | 'volunteerResources'
  | 'blog'
  | 'impactStories';

interface ResourceContent {
  title: string;
  subtitle: string;
  items: { heading: string; detail: string }[];
  ctaLabel?: string;
  ctaRoute?: string;
}

const RESOURCE_MODALS: Record<ResourceKey, ResourceContent> = {
  guidelines: {
    title: 'Community Guidelines',
    subtitle: 'Standards that keep Uddomi safe, welcoming, and impactful for every neighbor.',
    items: [
      {
        heading: 'Respect & Inclusivity',
        detail: 'Treat fellow volunteers, organizers, and community recipients with dignity regardless of background.',
      },
      {
        heading: 'Verified Local Initiatives',
        detail: 'Only publish genuine social service events with accurate dates, accessible locations, and honest capacity limits.',
      },
      {
        heading: 'Safety & Accountability',
        detail: 'Honor your RSVPs, notify organizers early if plans change, and follow on-site safety briefings.',
      },
    ],
    ctaLabel: 'Explore Upcoming Events',
    ctaRoute: '/events',
  },
  faqs: {
    title: 'Frequently Asked Questions',
    subtitle: 'Quick answers about organizing and joining events on Uddomi.',
    items: [
      {
        heading: 'How do I join a community event?',
        detail: 'Browse Upcoming Events, open any initiative, and click Join Event while signed in to reserve your volunteer spot.',
      },
      {
        heading: 'Why are past dates blocked when creating an event?',
        detail: 'Uddomi restricts event scheduling to upcoming future dates so volunteers only see active, actionable initiatives.',
      },
      {
        heading: 'Who can edit or delete an event?',
        detail: 'Only the authenticated organizer who created an event can update its details or cancel it from Manage Events.',
      },
    ],
    ctaLabel: 'Create an Event',
    ctaRoute: '/create-event',
  },
  organizerGuide: {
    title: 'Event Organizer Guide',
    subtitle: 'Checklist for hosting smooth neighborhood drives, cleanups, and workshops.',
    items: [
      {
        heading: 'Set Clear Expectations',
        detail: 'Include exact venue landmarks, start/end times, and items volunteers should bring.',
      },
      {
        heading: 'Choose Descriptive Imagery',
        detail: 'Upload or link a clear, verified photograph that authentically represents the work volunteers will do.',
      },
      {
        heading: 'Track Roster Capacity',
        detail: 'Monitor your live volunteer count under Manage Events so supplies match turnout.',
      },
    ],
    ctaLabel: 'Open Manage Events',
    ctaRoute: '/manage-events',
  },
  volunteerResources: {
    title: 'Volunteer Resources',
    subtitle: 'Prepare effectively for field initiatives across Dhaka, Austin, Portland, and beyond.',
    items: [
      {
        heading: 'What to Pack',
        detail: 'Reusable water bottle, comfortable closed-toe shoes, weather-appropriate clothing, and your digital RSVP confirmation.',
      },
      {
        heading: 'Calendar & Reminders',
        detail: 'Use your Joined Events dashboard to review upcoming commitments sorted chronologically and export schedules.',
      },
      {
        heading: 'Community Support',
        detail: 'Reach organizers ahead of time via event contact details if you plan to bring donated goods.',
      },
    ],
    ctaLabel: 'View Joined Events',
    ctaRoute: '/joined-events',
  },
  blog: {
    title: 'Uddomi Field Notes',
    subtitle: 'Updates and stories from neighborhood drives organized on the platform.',
    items: [
      {
        heading: 'Preparing for Winter Clothes Distribution in Mirpur 10',
        detail: 'How student and neighborhood teams sorted over 600 warm jackets and shawls ahead of December cold fronts.',
      },
      {
        heading: 'Running Zero-Plastic Park & Riverbank Cleanups',
        detail: 'Practical sorting workflows for separating recyclables from general litter during 3-hour Saturday cleanups.',
      },
    ],
    ctaLabel: 'Browse Active Drives',
    ctaRoute: '/events',
  },
  impactStories: {
    title: 'Community Impact Stories',
    subtitle: 'Measurable local progress led by everyday volunteers and organizers.',
    items: [
      {
        heading: '500+ Blankets Distributed in Mohammadpur',
        detail: 'Volunteer teams coordinated late-evening outreach around Town Hall and nearby transit stops to support unhoused elders.',
      },
      {
        heading: 'Monthly Neighborhood Food Pantry Packing',
        detail: 'Consistent weekend sorting teams keep staple groceries flowing to working families without disruption.',
      },
    ],
    ctaLabel: 'Join an Upcoming Event',
    ctaRoute: '/events',
  },
};

export const Footer: React.FC<FooterProps> = ({ navigate }) => {
  const { showToast } = useToast();
  const [activeResource, setActiveResource] = useState<ResourceKey | null>(null);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (!activeResource) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveResource(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeResource]);

  const modalContent = activeResource ? RESOURCE_MODALS[activeResource] : null;

  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 transition-colors pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 lg:gap-8 mb-12">
          {/* Brand & Mission column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-emerald-500/30 flex items-center justify-center shadow-xs shrink-0 p-0.5">
                <img
                  src="/logo.png"
                  alt="Uddomi Logo"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                  Uddomi
                </span>
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  Empowering People, Inspiring Change.
                </span>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm leading-relaxed">
              Empowering people and inspiring change. Connecting passionate volunteers and organizers
              with grassroots community and social development projects.
            </p>

            {/* Social Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                aria-label="Uddomi Community Updates on Facebook"
                onClick={() => showToast('info', 'Follow @UddomiCommunity for neighborhood event updates.')}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 hover:text-emerald-700 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95C18.05 21.45 22 17.19 22 12z" />
                </svg>
              </button>

              <button
                type="button"
                aria-label="Uddomi Photos on Instagram"
                onClick={() => showToast('info', 'Explore volunteer field highlights via Impact Stories below.')}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 hover:text-emerald-700 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </button>

              <button
                type="button"
                aria-label="Uddomi Announcements on X"
                onClick={() => showToast('info', 'Browse Upcoming Events to see real-time drive announcements.')}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 hover:text-emerald-700 transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </button>

              <button
                type="button"
                aria-label="Uddomi Partner Network on LinkedIn"
                onClick={() => showToast('info', 'Partner organizations can publish drives anytime via Create Event.')}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 hover:text-emerald-700 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Quick Links / Explore */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
              Explore
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/events')}
                  className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Upcoming Events
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/create-event')}
                  className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Create Event
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  About Us
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveResource('faqs')}
                  className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  How It Works
                </button>
              </li>
            </ul>
          </div>

          {/* Get Involved */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
              Get Involved
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/events')}
                  className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Volunteer
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/create-event')}
                  className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Partner With Us
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveResource('guidelines')}
                  className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Community Guidelines
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveResource('faqs')}
                  className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  FAQs
                </button>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
              Resources
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <button
                  type="button"
                  onClick={() => setActiveResource('organizerGuide')}
                  className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Event Organizer Guide
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveResource('volunteerResources')}
                  className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Volunteer Resources
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveResource('blog')}
                  className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Blog
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveResource('impactStories')}
                  className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Impact Stories
                </button>
              </li>
            </ul>
          </div>

          {/* Contact column */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
              Contact
            </h4>
            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                <a href="mailto:hello@uddomi.org" className="truncate hover:underline">
                  hello@uddomi.org
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                <a href="tel:5035550188" className="hover:underline">
                  (503) 555-0188
                </a>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Dhaka &amp; Portland Chapters</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="pt-8 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
          <div>
            © <span suppressHydrationWarning>{currentYear}</span> Uddomi. Empowering People, Inspiring Change. All rights reserved.
          </div>
        </div>
      </div>

      {/* Resource Information Modal */}
      {modalContent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setActiveResource(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="footer-resource-modal-title"
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3
                  id="footer-resource-modal-title"
                  className="text-xl font-extrabold text-slate-900 dark:text-white"
                >
                  {modalContent.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {modalContent.subtitle}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setActiveResource(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {modalContent.items.map((item) => (
                <div
                  key={item.heading}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800 space-y-1"
                >
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{item.heading}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-6">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveResource(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
              {modalContent.ctaLabel && modalContent.ctaRoute && (
                <button
                  type="button"
                  onClick={() => {
                    const route = modalContent.ctaRoute!;
                    setActiveResource(null);
                    navigate(route);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <span>{modalContent.ctaLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
