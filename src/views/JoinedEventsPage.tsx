'use client';

import React, { useState, useEffect } from 'react';
import { CommunityEvent } from '../types';
import { eventService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { SkeletonCard } from '../components/common/SkeletonCard';
import {
  Calendar,
  MapPin,
  Clock,
  User,
  Users,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface JoinedEventsPageProps {
  navigate: (route: string, params?: Record<string, string>) => void;
}

export const JoinedEventsPage: React.FC<JoinedEventsPageProps> = ({ navigate }) => {
  const { user, token, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [joinedEvents, setJoinedEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const userEmail = user?.email || null;

  useEffect(() => {
    if (authLoading) return;
    if (!userEmail || !token) {
      setLoading(false);
      return;
    }

    let active = true;
    const fetchJoinedEvents = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await eventService.getUserJoinedEvents(userEmail, token);
        if (active) {
          setJoinedEvents(data);
        }
      } catch (err: any) {
        if (active) {
          const msg = err?.message || 'Unable to load your joined events.';
          setJoinedEvents([]);
          setError(msg);
          showToast('error', msg, 'Failed to Load Joined Events');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchJoinedEvents();
    return () => {
      active = false;
    };
  }, [authLoading, userEmail, token, retryCount, showToast]);

  const handleLeaveEvent = async (event: CommunityEvent) => {
    if (!user || !token) {
      showToast('warning', 'Please log in to perform this action.', 'Access Restricted!');
      navigate('/login');
      return;
    }

    try {
      await eventService.leaveEvent(event.id, user.email, token);
      setJoinedEvents((prev) => prev.filter((e) => e.id !== event.id));
      showToast('info', `You have cancelled your participation for "${event.title}".`, 'Participation Cancelled');
    } catch (err: any) {
      const msg = err?.message || 'Failed to cancel participation.';
      if (msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('log in')) {
        showToast('error', msg, 'Access Restricted!');
      } else if (msg.toLowerCase().includes('internet connection') || msg.toLowerCase().includes('reach the server')) {
        showToast('error', msg, 'Connection Problem!');
      } else {
        showToast('error', msg, 'Action Failed');
      }
    }
  };

  const getGoogleCalendarUrl = (event: CommunityEvent) => {
    const title = encodeURIComponent(event.title);
    const details = encodeURIComponent(event.description + '\n\nLocation: ' + event.location);
    const location = encodeURIComponent(event.location);
    const dateFormatted = event.date.replace(/-/g, '');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${dateFormatted}T090000Z/${dateFormatted}T120000Z`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
            {joinedEvents.length} Joined Events
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          My Joined Events
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
          Community drives and neighborhood initiatives you've registered to attend. Sorted
          chronologically by event date.
        </p>
      </div>

      {/* Events List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <SkeletonCard key={n} />
          ))}
        </div>
      ) : error ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/50 p-12 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            Unable to load joined events
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            {error}
          </p>
          <button
            type="button"
            onClick={() => setRetryCount((c) => c + 1)}
            className="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-sm shadow-sm inline-flex items-center gap-2 cursor-pointer transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        </div>
      ) : joinedEvents.length === 0 ? (
        /* Empty State */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-800 dark:text-emerald-400">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            You haven't joined any events yet
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Discover upcoming cleanups, food packing drives, and clothes distributions in your local
            area and be part of positive change.
          </p>
          <button
            type="button"
            onClick={() => navigate('/events')}
            className="px-6 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm shadow-sm inline-flex items-center gap-2 cursor-pointer transition-colors"
          >
            <span>Explore Upcoming Events</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Grid of Joined Events sorted by date */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {joinedEvents.map((evt) => (
            <div
              key={evt.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
            >
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

                {/* Participation Status tag */}
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-emerald-800 text-white text-xs font-bold shadow-md flex items-center gap-1.5 backdrop-blur-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Participation Confirmed</span>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-400 font-bold">
                    <span>{evt.eventType}</span>
                    <span className="text-slate-400 font-mono font-normal">{evt.date}</span>
                  </div>

                  <h3
                    onClick={() => navigate('/events', { id: evt.id })}
                    className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1 hover:text-emerald-800 cursor-pointer transition-colors"
                  >
                    {evt.title}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{evt.location}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{evt.time}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Organized by {evt.creatorName}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigate('/events', { id: evt.id })}
                      className="flex-1 py-2 px-3 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <a
                      href={getGoogleCalendarUrl(evt)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer inline-flex items-center justify-center"
                      title="Add to Google Calendar"
                    >
                      <Calendar className="w-4 h-4 text-emerald-800" />
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleLeaveEvent(evt)}
                    className="w-full py-1.5 text-[11px] font-semibold text-rose-600 hover:text-rose-700 text-center hover:underline cursor-pointer"
                  >
                    Cancel Participation
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
