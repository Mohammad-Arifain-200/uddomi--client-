'use client';

import React, { useState, useEffect } from 'react';
import { CommunityEvent } from '../types';
import { eventService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { SkeletonCard } from '../components/common/SkeletonCard';
import {
  PlusCircle,
  Calendar,
  MapPin,
  Users,
  Edit3,
  Trash2,
  Leaf,
  AlertTriangle,
  X,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface ManageEventsPageProps {
  navigate: (route: string, params?: Record<string, string>) => void;
}

export const ManageEventsPage: React.FC<ManageEventsPageProps> = ({ navigate }) => {
  const { user, token, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [myEvents, setMyEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [eventToDelete, setEventToDelete] = useState<CommunityEvent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const userEmail = user?.email || null;

  useEffect(() => {
    if (authLoading) return;
    if (!userEmail || !token) {
      setLoading(false);
      return;
    }

    let active = true;
    const fetchMyEvents = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await eventService.getUserCreatedEvents(userEmail, token);
        if (active) {
          setMyEvents(data);
        }
      } catch (err: any) {
        if (active) {
          const msg = err?.message || 'Unable to load your created events.';
          setMyEvents([]);
          setError(msg);
          showToast('error', msg, 'Failed to Load Events');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchMyEvents();
    return () => {
      active = false;
    };
  }, [authLoading, userEmail, token, retryCount, showToast]);

  const confirmDelete = async () => {
    if (!eventToDelete || !user || !token) return;

    try {
      setDeleting(true);
      await eventService.deleteEvent(eventToDelete.id, user.email, token);
      setMyEvents((prev) => prev.filter((e) => e.id !== eventToDelete.id));
      showToast('success', `Event "${eventToDelete.title}" has been deleted.`, 'Event Removed Successfully');
      setEventToDelete(null);
    } catch (err: any) {
      const msg = err?.message || 'Failed to delete event.';
      if (msg.toLowerCase().includes('forbidden') || msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('only delete')) {
        showToast('error', msg, 'Access Restricted!');
      } else if (msg.toLowerCase().includes('internet connection') || msg.toLowerCase().includes('reach the server')) {
        showToast('error', msg, 'Connection Problem!');
      } else {
        showToast('error', msg, 'Action Failed');
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Top Header matching screenshot download__5__f9fb8896.jfif */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Manage My Events
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl mt-1 leading-relaxed">
            These are events you've created. Edit details, update information, or remove events that
            are no longer needed.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/create-event')}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm shadow-sm transition-all self-start sm:self-auto cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create New Event</span>
        </button>
      </div>

      {/* Events Grid */}
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
            Unable to load your events
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            {error}
          </p>
          <button
            type="button"
            onClick={() => setRetryCount((c) => c + 1)}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-sm shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        </div>
      ) : myEvents.length === 0 ? (
        /* Empty State */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-800 dark:text-emerald-400">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            You haven't created any events yet
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Ready to lead a neighborhood project? Click below to create your very first community event
            and rally volunteers.
          </p>
          <button
            type="button"
            onClick={() => navigate('/create-event')}
            className="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-sm shadow-sm cursor-pointer"
          >
            Create Your First Event
          </button>
        </div>
      ) : (
        /* Grid of User-Created Event Cards matching download__5__f9fb8896.jfif */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myEvents.map((evt) => (
            <div
              key={evt.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-emerald-950/15 dark:hover:shadow-emerald-900/25 hover:-translate-y-2 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-all duration-300 flex flex-col justify-between group"
            >
              {/* Event Cover Photo */}
              <div className="relative aspect-16/10 overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img
                  src={evt.thumbnail}
                  alt={evt.title}
                  className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (img.dataset.fallbackApplied === '1') return;
                    img.dataset.fallbackApplied = '1';
                    img.src =
                      'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=800&q=80';
                  }}
                />
                {/* Subtle hover shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  {/* Date and Category Bar */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{evt.date}</span>
                    </span>

                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold text-[11px] flex items-center gap-1">
                      <Leaf className="w-3 h-3" />
                      <span>{evt.eventType}</span>
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1">
                    {evt.title}
                  </h3>

                  {/* Location */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{evt.location}</span>
                  </div>

                  {/* Description excerpt */}
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {evt.description}
                  </p>

                  {/* Registered count */}
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 pt-1">
                    <Users className="w-3.5 h-3.5 text-emerald-800" />
                    <span>{evt.joinedUsers.length} volunteers registered</span>
                  </div>
                </div>

                {/* Edit & Delete Action Buttons matching screenshot */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/edit-event', { id: evt.id })}
                    className="flex-1 py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEventToDelete(evt)}
                    className="flex-1 py-2 px-3 rounded-lg border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info notice box matching screenshot */}
      <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-800 dark:text-emerald-400 shrink-0">
          <Leaf className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Don't see an event here?
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            Only events you created with this account ({user?.email}) will appear on this page.
            Create a new event to get started!
          </p>
        </div>
      </div>

      {/* Custom Delete Confirmation Modal (No window.confirm!) */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Event</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to delete{' '}
              <span className="font-bold text-slate-900 dark:text-white">
                "{eventToDelete.title}"
              </span>
              ? All registered volunteers will be notified.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEventToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm cursor-pointer"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
