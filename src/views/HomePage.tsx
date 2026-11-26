'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'motion/react';
import { CommunityEvent } from '../types';
import { eventService } from '../services/api';
import { SkeletonCard } from '../components/common/SkeletonCard';
import { AnimatedCounter, TiltCard } from '../components/common/AnimatedComponents';
import { useToast } from '../context/ToastContext';
import {
  Users,
  Calendar,
  Sparkles,
  Heart,
  ArrowRight,
  PlusCircle,
  MapPin,
  CalendarDays,
  Sprout,
  Leaf,
  BookOpen,
  ChevronDown,
  Camera,
  Mail,
  Send,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface HomePageProps {
  navigate: (route: string, params?: Record<string, string>) => void;
}

const STATIC_GALLERY_PHOTOS = [
  {
    src: '/assets/homepage/event_cleanup.jpg',
    fallback: '/assets/homepage/event_cleanup.png',
    title: 'Neighborhood Park Cleanup',
    category: 'Environment',
  },
  {
    src: '/assets/homepage/about_sprout.jpg',
    fallback: '/assets/homepage/about_sprout.png',
    title: 'Urban Tree Plantation',
    category: 'Plantation',
  },
  {
    src: '/assets/homepage/event_foodpantry.jpg',
    fallback: '/assets/homepage/event_foodpantry.png',
    title: 'Community Food Pantry Packing',
    category: 'Community Support',
  },
  {
    src: '/assets/homepage/event_homework.jpg',
    fallback: '/assets/homepage/event_homework.png',
    title: 'Youth Tutoring & Mentorship',
    category: 'Education',
  },
  {
    src: '/assets/homepage/hero_community.jpg',
    fallback: '/assets/homepage/hero_community.png',
    title: 'Volunteer Coordination Drive',
    category: 'Civic Action',
  },
  {
    src: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=900&q=80',
    fallback: '/assets/homepage/hero_community.png',
    title: 'Winter Clothes & Blanket Aid',
    category: 'Donation',
  },
];

const ABOUT_PILLARS = [
  {
    number: '01',
    title: 'Organize Drives',
    summary: 'Launch events in minutes',
    route: '/create-event',
    icon: Calendar,
    image: '/assets/homepage/hero_community.jpg',
    fallbackImage: '/assets/homepage/hero_community.png',
    captionKicker: 'Effortless Planning',
    captionMeta: 'Custom Schedules',
    captionText: 'Set schedules, locations & goals quickly.',
  },
  {
    number: '02',
    title: 'Connect Locals',
    summary: 'Mobilize neighbors nearby',
    route: '/events',
    icon: Users,
    image: '/assets/homepage/event_cleanup.jpg',
    fallbackImage: '/assets/homepage/event_cleanup.png',
    captionKicker: 'Shared Civic Action',
    captionMeta: 'Local Chapters',
    captionText: 'Turn goodwill into coordinated momentum.',
  },
  {
    number: '03',
    title: 'Create Impact',
    summary: 'Track verified milestones',
    route: '/joined-events',
    icon: Sprout,
    image: '/assets/homepage/about_sprout.jpg',
    fallbackImage: '/assets/homepage/about_sprout.png',
    captionKicker: 'Greener Tomorrow',
    captionMeta: '78+ Local Chapters',
    captionText: 'Small actions grow into lasting change.',
  },
];

export const HomePage: React.FC<HomePageProps> = ({ navigate }) => {
  const { showToast } = useToast();
  const [featuredEvents, setFeaturedEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [activePillarIndex, setActivePillarIndex] = useState<number>(2);

  useEffect(() => {
    let active = true;
    const fetchRecentEvents = async () => {
      try {
        setLoading(true);
        setEventsError(null);
        // MongoDB .limit(6) requirement
        const events = await eventService.getEvents({ limit: 6, onlyUpcoming: true });
        if (active) {
          setFeaturedEvents(events);
        }
      } catch (err: any) {
        if (active) {
          setFeaturedEvents([]);
          setEventsError(err?.message || 'Unable to load upcoming events right now.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    fetchRecentEvents();
    return () => {
      active = false;
    };
  }, [retryCount]);

  const formatDateDisplay = (dateStr: string) => {
    try {
      const date = new Date(dateStr + 'T00:00:00');
      if (Number.isNaN(date.getTime())) {
        return dateStr;
      }
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Helper for category pill icon and label matching screenshot
  const getCategoryInfo = (eventType: string) => {
    switch (eventType) {
      case 'Cleanup':
      case 'Plantation':
      case 'Environment':
        return { label: eventType === 'Cleanup' ? 'Environment' : eventType, icon: Leaf, bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'Education':
        return { label: 'Education', icon: BookOpen, bg: 'bg-sky-50 text-sky-800 border-sky-200' };
      case 'Health':
        return { label: 'Healthcare', icon: Heart, bg: 'bg-rose-50 text-rose-800 border-rose-200' };
      case 'Donation':
      case 'Community':
      default:
        return { label: eventType || 'Community', icon: Users, bg: 'bg-amber-50 text-amber-900 border-amber-200' };
    }
  };

  // Scroll progress animation across the page
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  // Smooth scroll helper
  const scrollToStats = () => {
    const el = document.getElementById('stats-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToFeatured = () => {
    const el = document.getElementById('featured-events-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      navigate('/events');
    }
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim() || !newsletterEmail.includes('@')) {
      showToast('error', 'Please enter a valid email address to subscribe.', 'Missing Information!');
      return;
    }
    showToast(
      'success',
      `Subscribed ${newsletterEmail.trim()} to weekly neighborhood event updates.`,
      'Subscribed Successfully!'
    );
    setNewsletterEmail('');
  };

  return (
    <div className="space-y-16 sm:space-y-24 pb-16 overflow-hidden relative">
      {/* Scroll Progress Bar at the top of the viewport */}
      <motion.div
        style={{ scaleX }}
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400 z-50 origin-left pointer-events-none shadow-sm shadow-emerald-500/20"
      />

      {/* 1. Hero Section matching GoodGather Community Events Homepage.png with Advanced Spring & Motion */}
      <section className="relative pt-4 sm:pt-10 overflow-hidden">
        {/* Subtle Ambient Background Mesh Orbs */}
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-emerald-400/10 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
        <div className="absolute top-40 right-10 w-80 h-80 bg-teal-400/10 dark:bg-teal-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" style={{ animationDelay: '2s' }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Left Content */}
            <motion.div
              initial={false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6 space-y-6"
            >
              {/* Pill badge: [🌱 Community Event Platform] */}
              <motion.div
                initial={false}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, type: 'spring', stiffness: 260, damping: 20 }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-xs font-semibold tracking-wide shadow-2xs hover:scale-105 transition-transform cursor-default"
              >
                <Sprout className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 animate-spin-slow" />
                <span>Community Event Platform</span>
              </motion.div>

              {/* Main Headline */}
              <motion.h1
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.14]"
              >
                Bring People Together Through Meaningful{' '}
                <span className="text-emerald-700 dark:text-emerald-400 relative inline-block">
                  Community Events
                  <span className="absolute bottom-1 left-0 w-full h-1 bg-emerald-500/20 rounded-full" />
                </span>
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl"
              >
                Create, manage, and join local events that bring people closer, solve real community
                needs, and create a positive, lasting impact.
              </motion.p>

              {/* Action Buttons with Spring Micro-Interactions */}
              <motion.div
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-wrap items-center gap-4 pt-2"
              >
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={scrollToFeatured}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-sm shadow-md hover:shadow-xl transition-shadow cursor-pointer group"
                >
                  <span>Explore Upcoming Events</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-200" />
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => navigate('/create-event')}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-emerald-900 dark:text-emerald-300 border border-emerald-800 dark:border-emerald-600 font-semibold text-sm shadow-2xs hover:shadow-md transition-shadow cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 text-emerald-700 dark:text-emerald-400 group-hover:rotate-90 transition-transform duration-300" />
                  <span>Create an Event</span>
                </motion.button>
              </motion.div>

              {/* Animated Interactive Scroll Down Indicator Button */}
              <motion.div
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="pt-4"
              >
                <button
                  type="button"
                  onClick={scrollToStats}
                  className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs hover:shadow-md hover:border-emerald-500/50 hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer group transition-all"
                  aria-label="Scroll down to statistics and about sections"
                >
                  {/* Animated Mouse Silhouette with Rolling Wheel */}
                  <div className="w-4 h-6 rounded-full border-2 border-emerald-700/80 dark:border-emerald-400/80 flex items-start justify-center p-0.5 shrink-0 group-hover:border-emerald-600 transition-colors">
                    <motion.div
                      animate={{ y: [0, 6, 0], opacity: [1, 0.2, 1] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-1 h-1.5 rounded-full bg-emerald-700 dark:bg-emerald-400"
                    />
                  </div>
                  <span>Scroll down to explore</span>
                  <ChevronDown className="w-4 h-4 text-emerald-700 dark:text-emerald-400 group-hover:translate-y-1 transition-transform animate-bounce shrink-0" />
                </button>
              </motion.div>
            </motion.div>

            {/* Right Hero Image matching GoodGather Community Events Homepage.png with organic curve & clean background */}
            <motion.div
              initial={false}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6 relative flex items-center justify-center lg:justify-end"
            >
              <div className="relative w-full max-w-lg lg:max-w-none group">
                {/* Decorative Organic Backdrop Shadow & Warm Amber Glow (matches screenshot) */}
                <div className="absolute -top-3 -right-3 -left-2 -bottom-2 bg-gradient-to-br from-amber-400/25 via-emerald-500/15 to-teal-500/20 rounded-tl-[90px] sm:rounded-tl-[135px] rounded-br-[80px] sm:rounded-br-[100px] rounded-tr-[36px] rounded-bl-[56px] blur-[3px] -rotate-1 pointer-events-none group-hover:scale-101 transition-transform duration-500" />

                {/* Main Hero Photo Container with Organic Curve Mask - No Awkward White Borders */}
                <div className="relative overflow-hidden rounded-tl-[80px] sm:rounded-tl-[125px] rounded-br-[70px] sm:rounded-br-[90px] rounded-tr-[28px] sm:rounded-tr-[36px] rounded-bl-[44px] sm:rounded-bl-[56px] shadow-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 aspect-4/3 sm:aspect-16/11">
                  <img
                    src="/assets/homepage/hero_community.jpg"
                    alt="Community volunteers working together in community garden"
                    className="w-full h-full object-cover select-none transition-transform duration-700 group-hover:scale-105 ease-out"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.dataset.fallbackApplied) return;
                      target.dataset.fallbackApplied = '1';
                      target.src = '/assets/homepage/hero_community.png';
                    }}
                  />

                  {/* Soft subtle gradient overlay for readability and polish */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none" />
                </div>

                {/* Floating Glassmorphism Badge 1: 100% Volunteer Driven */}
                <motion.div
                  animate={{ y: [-3, 3, -3] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -bottom-3 sm:bottom-4 left-2 sm:left-4 px-3.5 py-2.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-3 z-10"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                    🌱
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">100% Volunteer Driven</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">78+ Local Communities</div>
                  </div>
                </motion.div>

                {/* Floating Glassmorphism Badge 2: Live Events Today */}
                <motion.div
                  animate={{ y: [3, -3, 3] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute top-3 sm:top-5 right-3 sm:right-5 px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-lg border border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 z-10"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span>Active Events Today</span>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. Stats Bar matching GoodGather Community Events Homepage.png with Animated Counters */}
      <section id="stats-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <motion.div
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden"
        >
          {/* Stat 1: 2,843+ Active Volunteers */}
          <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="flex items-center gap-4 p-2 rounded-xl transition-colors hover:bg-emerald-50/40 dark:hover:bg-slate-800/60 group cursor-default"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900 transition-all duration-300 shadow-2xs">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
                <AnimatedCounter end={2843} suffix="+" />
              </div>
              <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                Active Volunteers
              </div>
            </div>
          </motion.div>

          {/* Stat 2: 156+ Events This Year */}
          <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="flex items-center gap-4 p-2 rounded-xl transition-colors hover:bg-emerald-50/40 dark:hover:bg-slate-800/60 group cursor-default"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900 transition-all duration-300 shadow-2xs">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
                <AnimatedCounter end={156} suffix="+" />
              </div>
              <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                Events This Year
              </div>
            </div>
          </motion.div>

          {/* Stat 3: 78+ Communities Impacted */}
          <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="flex items-center gap-4 p-2 rounded-xl transition-colors hover:bg-emerald-50/40 dark:hover:bg-slate-800/60 group cursor-default"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900 transition-all duration-300 shadow-2xs">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
                <AnimatedCounter end={78} suffix="+" />
              </div>
              <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                Communities Impacted
              </div>
            </div>
          </motion.div>

          {/* Stat 4: 12,500+ Hours Volunteered */}
          <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="flex items-center gap-4 p-2 rounded-xl transition-colors hover:bg-emerald-50/40 dark:hover:bg-slate-800/60 group cursor-default"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900 transition-all duration-300 shadow-2xs">
              <Heart className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
                <AnimatedCounter end={12500} suffix="+" />
              </div>
              <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                Hours Volunteered
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* 3. About Section — Compact Editorial Split */}
      <section id="about-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="relative rounded-3xl bg-slate-50/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800/90 p-5 sm:p-8 shadow-sm overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(rgba(16,185,129,0.1)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(52,211,153,0.07)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_top_right,black_20%,transparent_75%)] pointer-events-none"
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-9 items-center relative z-10">
            {/* Left Compact Visual Frame */}
            <motion.div
              initial={false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-5"
            >
              <div className="relative w-full aspect-16/10 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-700/70 bg-slate-900 group shadow-md">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={ABOUT_PILLARS[activePillarIndex].image}
                    src={ABOUT_PILLARS[activePillarIndex].image}
                    alt={ABOUT_PILLARS[activePillarIndex].captionText}
                    initial={{ opacity: 0.4, scale: 1.03 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0.4 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full h-full object-cover select-none transition-transform duration-700 ease-out group-hover:scale-105"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.dataset.fallbackApplied) return;
                      target.dataset.fallbackApplied = '1';
                      target.src = ABOUT_PILLARS[activePillarIndex].fallbackImage;
                    }}
                  />
                </AnimatePresence>

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-transparent pointer-events-none" />

                {/* Top Compact Switcher */}
                <div className="absolute top-3 right-3 flex items-center gap-1 bg-slate-950/50 backdrop-blur-md p-1 rounded-lg border border-white/10 z-10">
                  {ABOUT_PILLARS.map((pillar, idx) => (
                    <button
                      key={pillar.number}
                      type="button"
                      onClick={() => setActivePillarIndex(idx)}
                      aria-label={`Preview ${pillar.title}`}
                      className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold transition-all cursor-pointer tabular-nums ${
                        activePillarIndex === idx
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {pillar.number}
                    </button>
                  ))}
                </div>

                {/* Bottom Unboxed Caption */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={ABOUT_PILLARS[activePillarIndex].captionKicker}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-x-0 bottom-0 p-4 sm:p-5 space-y-1"
                  >
                    <div className="flex items-center gap-2 text-xs font-medium text-emerald-300">
                      <Sprout className="w-3.5 h-3.5 shrink-0" />
                      <span>{ABOUT_PILLARS[activePillarIndex].captionKicker}</span>
                      <span aria-hidden="true" className="text-emerald-500/60">·</span>
                      <span className="text-slate-300">{ABOUT_PILLARS[activePillarIndex].captionMeta}</span>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-white line-clamp-1">
                      {ABOUT_PILLARS[activePillarIndex].captionText}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Right Compact Content & Horizontal Tiles */}
            <motion.div
              initial={false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.5, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-7 space-y-5"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="h-px w-6 bg-emerald-600 dark:bg-emerald-400" aria-hidden="true" />
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    About Uddomi
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight [text-wrap:balance]">
                  A Simpler Way to Build{' '}
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Stronger Communities
                  </span>
                </h2>

                <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed max-w-xl">
                  Create, manage, and join meaningful neighborhood initiatives — from clean-up
                  drives to tree plantations and community education.
                </p>
              </div>

              {/* Compact 3-Column Interactive Step Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {ABOUT_PILLARS.map((pillar, idx) => {
                  const Icon = pillar.icon;
                  const isSelected = activePillarIndex === idx;

                  return (
                    <button
                      key={pillar.number}
                      type="button"
                      onMouseEnter={() => setActivePillarIndex(idx)}
                      onFocus={() => setActivePillarIndex(idx)}
                      onClick={() => navigate(pillar.route)}
                      className={`p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer group ${
                        isSelected
                          ? 'bg-white dark:bg-slate-800/80 border-emerald-500/60 shadow-sm'
                          : 'bg-white/60 dark:bg-slate-800/35 border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-mono text-[11px] font-semibold text-slate-400 dark:text-slate-500 tabular-nums">
                          {pillar.number}
                        </span>
                      </div>
                      <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white whitespace-nowrap truncate">
                        {pillar.title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {pillar.summary}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Compact Action & Inline Trust Footer */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => navigate('/events')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs sm:text-sm shadow-sm transition-colors cursor-pointer whitespace-nowrap shrink-0 group"
                  >
                    <span>Explore Drives</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/create-event')}
                    className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:underline underline-offset-4 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Host an event
                  </button>
                </div>

                <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  Free &amp; Open · Community Verified
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>


      {/* 4. Recent Upcoming Events Section (6 Events via MongoDB .limit(6)) */}
      <section id="featured-events-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <motion.div
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8"
        >
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Live From Community Feed
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Recent <span className="text-emerald-700 dark:text-emerald-400 italic">Upcoming Events</span>
            </h2>
          </div>
          <motion.button
            type="button"
            whileHover={{ x: 3 }}
            onClick={() => navigate('/events')}
            className="flex items-center gap-1.5 text-sm font-bold text-emerald-800 dark:text-emerald-400 hover:text-emerald-900 hover:underline cursor-pointer group self-start sm:self-auto"
          >
            <span>View All Events</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-200" />
          </motion.button>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : eventsError ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/50 p-10 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Unable to load upcoming events
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              {eventsError}
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setRetryCount((c) => c + 1)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-sm shadow-sm cursor-pointer transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        ) : featuredEvents.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
              <CalendarDays className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              No upcoming community drives scheduled yet
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Be the first organizer to launch a neighborhood cleanup, plantation, or aid drive.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => navigate('/create-event')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-sm shadow-sm cursor-pointer transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create an Event</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {featuredEvents.slice(0, 6).map((event, index) => {
              const cat = getCategoryInfo(event.eventType);
              const CatIcon = cat.icon;

              return (
                <motion.div
                  key={event.id}
                  initial={false}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 0.5, delay: (index % 3) * 0.06, ease: [0.16, 1, 0.3, 1] }}
                >
                  <TiltCard
                    onClick={() => navigate('/events', { id: event.id })}
                    className="h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-emerald-950/15 dark:hover:shadow-emerald-900/25 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-colors duration-300 flex flex-col group cursor-pointer"
                  >
                    {/* Event Thumbnail with Category Pill & Shimmer Sweep */}
                    <div className="relative aspect-16/10 overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img
                        src={event.thumbnail}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (target.dataset.fallbackApplied) return;
                          target.dataset.fallbackApplied = '1';
                          target.src = '/assets/homepage/event_cleanup.png';
                        }}
                      />

                      {/* Hover shimmer sweep */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

                      {/* Clean Category Pill Tag */}
                      <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/95 dark:bg-slate-900/90 text-xs font-semibold text-emerald-800 dark:text-emerald-300 shadow-sm flex items-center gap-1.5 backdrop-blur-xs border border-slate-200/50 dark:border-slate-700 animate-fade-in z-10">
                        <CatIcon className="w-3.5 h-3.5" />
                        <span>{cat.label}</span>
                      </div>
                    </div>

                    {/* Clean Content */}
                    <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
                      <div className="space-y-2.5">
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors duration-200">
                          {event.title}
                        </h3>

                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <MapPin className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition-transform duration-200" />
                          <span className="truncate">{event.location}</span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <CalendarDays className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition-transform duration-200" />
                          <span>{formatDateDisplay(event.date)}</span>
                        </div>
                      </div>

                      {/* Animated Circular Arrow Button at bottom right */}
                      <div className="pt-4 flex items-center justify-end">
                        <div className="w-9 h-9 rounded-full border border-emerald-600 dark:border-emerald-500 text-emerald-700 dark:text-emerald-400 flex items-center justify-center transition-all duration-300 group-hover:bg-emerald-700 group-hover:text-white group-hover:scale-115 group-hover:shadow-md group-hover:shadow-emerald-700/30 group-hover:rotate-[-45deg]">
                          <ArrowRight className="w-4 h-4 transition-transform duration-300" />
                        </div>
                      </div>
                    </div>
                  </TiltCard>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. Static Community Service Gallery Section */}
      <section id="gallery-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <motion.div
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8"
        >
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              <Camera className="w-3.5 h-3.5" />
              <span>Community Service Gallery</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Moments of <span className="text-emerald-700 dark:text-emerald-400 italic">Collective Action</span>
            </h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md">
            Snapshots from neighborhood cleanups, tree plantations, food distributions, and education drives led by local volunteers.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {STATIC_GALLERY_PHOTOS.map((photo, idx) => (
            <motion.div
              key={photo.title}
              initial={false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.5, delay: (idx % 3) * 0.06 }}
              className="group relative aspect-4/3 rounded-2xl overflow-hidden border border-slate-200/90 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <img
                src={photo.src}
                alt={photo.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.dataset.fallbackApplied) return;
                  target.dataset.fallbackApplied = '1';
                  target.src = photo.fallback;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-5 flex items-end justify-between gap-2">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-600/90 text-white text-[10px] font-bold uppercase tracking-wider mb-1.5">
                    {photo.category}
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                    {photo.title}
                  </h3>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 6. Newsletter Subscription Section */}
      <section id="newsletter-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <motion.div
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-10 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-8"
        >
          <div className="space-y-2 max-w-xl text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <Mail className="w-3.5 h-3.5" />
              <span>Community Newsletter</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Never Miss a Local <span className="text-emerald-700 dark:text-emerald-400">Volunteer Drive</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Get weekly updates on upcoming cleanups, donation campaigns, tree plantations, and community workshops near you.
            </p>
          </div>

          <form
            onSubmit={handleNewsletterSubmit}
            className="w-full max-w-md flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
          >
            <div className="relative flex-1">
              <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Enter your email address"
                aria-label="Email address for newsletter"
                className="w-full pl-11 pr-4 py-3.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="px-6 py-3.5 rounded-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <span>Subscribe</span>
              <Send className="w-4 h-4" />
            </motion.button>
          </form>
        </motion.div>
      </section>

      {/* 5. Call To Action Banner matching GoodGather Community Events Homepage.png */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={false}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="bg-emerald-900 dark:bg-emerald-950 rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-white shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col md:flex-row items-center justify-between gap-6 border border-emerald-800 relative overflow-hidden group"
        >
          {/* Subtle animated background glow */}
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-emerald-700/30 rounded-full blur-3xl pointer-events-none group-hover:scale-120 transition-transform duration-700 animate-pulse-glow" />

          {/* Left: Icon + Heading */}
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl border-2 border-emerald-400/40 bg-emerald-800/70 flex items-center justify-center text-white shrink-0 group-hover:scale-108 group-hover:rotate-3 transition-transform duration-300">
              <Users className="w-6 h-6 text-emerald-200" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug">
              Join a Community <br className="hidden sm:inline" />
              That Creates <span className="text-lime-300">Real Change</span>
            </h2>
          </div>

          {/* Center Divider line */}
          <div className="hidden lg:block w-px h-12 bg-emerald-700/60 shrink-0 relative z-10" />

          {/* Center Description */}
          <p className="text-emerald-100 text-sm max-w-xs text-center md:text-left leading-relaxed relative z-10">
            Be a volunteer, organize an event, or support a cause in your area.
          </p>

          {/* Right Button */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/register')}
            className="px-6 py-3.5 rounded-full bg-white hover:bg-emerald-50 text-emerald-950 font-bold text-sm shadow-md hover:shadow-xl transition-all shrink-0 flex items-center gap-2 cursor-pointer group/btn relative z-10"
          >
            <span>Join as a Volunteer</span>
            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1.5 transition-transform duration-200" />
          </motion.button>
        </motion.div>
      </section>
    </div>
  );
};
