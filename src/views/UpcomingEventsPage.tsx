'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CommunityEvent } from '../types';
import { eventService } from '../services/api';
import { SkeletonCard } from '../components/common/SkeletonCard';
import {
  Search,
  MapPin,
  Sparkles,
  Leaf,
  GraduationCap,
  Package,
  Heart,
  X,
  ChevronRight,
  PlusCircle,
  Calendar,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface UpcomingEventsPageProps {
  navigate: (route: string, params?: Record<string, string>) => void;
}

export const UpcomingEventsPage: React.FC<UpcomingEventsPageProps> = ({ navigate }) => {
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const categories: { label: string; icon: React.ReactNode }[] = [
    { label: 'All', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { label: 'Cleanup', icon: <Leaf className="w-3.5 h-3.5" /> },
    { label: 'Donation', icon: <Package className="w-3.5 h-3.5" /> },
    { label: 'Plantation', icon: <Leaf className="w-3.5 h-3.5" /> },
    { label: 'Education', icon: <GraduationCap className="w-3.5 h-3.5" /> },
    { label: 'Community', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { label: 'Health', icon: <Heart className="w-3.5 h-3.5" /> },
  ];

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const fetchUpcomingEvents = async () => {
      try {
        setLoading(true);
        setError(null);
        // Strictly upcoming events (past dates filtered out)
        const data = await eventService.getEvents({
          category: selectedCategory,
          search: debouncedSearch,
          onlyUpcoming: true,
          signal: controller.signal,
        });
        if (active) {
          setEvents(data);
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        if (active) {
          setEvents([]);
          setError(err?.message || 'Unable to load upcoming events right now.');
        }
      } finally {
        if (active && !controller.signal.aborted) {
          setLoading(false);
        }
      }
    };
    fetchUpcomingEvents();
    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedCategory, debouncedSearch, retryCount]);

  // Extract date components for the prominent calendar badge
  const parseEventDate = (dateStr: string, timeStr: string) => {
    try {
      const date = new Date(dateStr + 'T00:00:00');
      if (Number.isNaN(date.getTime())) {
        return { month: 'TBD', day: '--', dayOfWeek: 'Soon', timePart: (timeStr || '9:00 AM').split('-')[0].trim() };
      }
      const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
      const day = date.getDate().toString().padStart(2, '0');
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
      const timePart = (timeStr || '9:00 AM').split('-')[0].trim();
      return { month, day, dayOfWeek, timePart };
    } catch {
      return { month: 'TBD', day: '--', dayOfWeek: 'Soon', timePart: '9:00 AM' };
    }
  };

  const getCategoryIcon = (eventType: string) => {
    const type = (eventType || '').toLowerCase();
    if (type.includes('clean') || type.includes('environment')) {
      return <Leaf className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />;
    }
    if (type.includes('plant') || type.includes('tree')) {
      return <Leaf className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />;
    }
    if (type.includes('donat') || type.includes('cloth')) {
      return <Package className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />;
    }
    if (type.includes('educat') || type.includes('homework') || type.includes('school')) {
      return <GraduationCap className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />;
    }
    return <Heart className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Header matching screenshot download (2).jfif */}
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-3"
      >
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Upcoming Events
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
          Join hands, make a difference. Explore and participate in meaningful events happening in
          your community.
        </p>
      </motion.div>

      {/* Search Bar & Category Filters Strip matching screenshot download (2).jfif */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative w-full md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events by name, location, or keyword..."
            className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-sm text-slate-900 dark:text-white placeholder:text-slate-400 shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-700 dark:focus:ring-emerald-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search query"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills matching screenshot download (2).jfif */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.label;
            return (
              <button
                type="button"
                key={cat.label}
                onClick={() => setSelectedCategory(cat.label)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold shrink-0 cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'bg-emerald-900 dark:bg-emerald-800 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-emerald-700 dark:hover:border-emerald-500'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <SkeletonCard key={n} />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/50 p-8 space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Unable to load events
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            {error}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setRetryCount((c) => c + 1)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-800 hover:bg-emerald-900 text-white cursor-pointer transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      ) : events.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            No upcoming events found
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {searchQuery || selectedCategory !== 'All'
              ? 'Try adjusting your search terms or filters to find other community events.'
              : 'Be the first to launch an event in your neighborhood!'}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            {(searchQuery || selectedCategory !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
              >
                Reset Filters
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/create-event')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-800 hover:bg-emerald-900 text-white cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Event</span>
            </button>
          </div>
        </div>
      ) : (
        /* Event Cards Grid exactly matching screenshot download (2).jfif */
        <motion.div
          key={`${selectedCategory}:${debouncedSearch}:${events.length}`}
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.04,
              },
            },
          }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {events.map((evt) => {
            const { month, day, dayOfWeek, timePart } = parseEventDate(evt.date, evt.time);

            return (
              <motion.div
                key={evt.id}
                variants={{
                  hidden: { opacity: 0, y: 16, scale: 0.99 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
                  },
                }}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.25 }}
                onClick={() => navigate('/events', { id: evt.id })}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group cursor-pointer"
              >
                {/* Image & Date Header Block matching screenshot */}
                <div className="relative aspect-16/10 overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={evt.thumbnail}
                    alt={evt.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (img.dataset.fallbackApplied === '1') return;
                      img.dataset.fallbackApplied = '1';
                      img.src =
                        'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=800&q=80';
                    }}
                  />

                  {/* Date Badge (Top-Left block as shown in screenshot download (2).jfif) */}
                  <div className="absolute top-3 left-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs rounded-xl p-2.5 shadow-md text-center min-w-[65px] border border-slate-200/60 dark:border-slate-700">
                    <div className="text-[10px] font-extrabold uppercase text-rose-600 dark:text-rose-400 tracking-wider">
                      {month}
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white leading-none my-0.5">
                      {day}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-none">
                      {dayOfWeek}
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                      {timePart}
                    </div>
                  </div>
                </div>

                {/* Event Details Content matching screenshot download (2).jfif */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    {/* Event Type / Category tag pill */}
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                      {getCategoryIcon(evt.eventType)}
                      <span>{evt.eventType}</span>
                    </div>

                    {/* Title */}
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors duration-200">
                      {evt.title}
                    </h3>

                    {/* Location with Pin */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{evt.location}</span>
                    </div>

                    {/* Excerpt Description */}
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {evt.description}
                    </p>
                  </div>

                  {/* Clean full-width View Event Button matching download (2).jfif */}
                  <div className="pt-2">
                    <div className="w-full py-2.5 px-4 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-1 shadow-sm transition-colors group-hover:bg-emerald-800">
                      <span>View Event</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
};
