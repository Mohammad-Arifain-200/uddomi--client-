'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CommunityEvent } from '../types';
import { eventService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  MapPin,
  Calendar,
  Clock,
  User,
  Users,
  Share2,
  Bookmark,
  CheckCircle,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Package,
  Leaf,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface EventDetailsPageProps {
  eventId: string;
  navigate: (route: string, params?: Record<string, string>) => void;
}

export const EventDetailsPage: React.FC<EventDetailsPageProps> = ({ eventId, navigate }) => {
  const [event, setEvent] = useState<CommunityEvent | null>(null);
  const [moreEvents, setMoreEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [joining, setJoining] = useState(false);
  const { user, token } = useAuth();
  const { showToast } = useToast();
  const userEmail = user?.email || null;

  useEffect(() => {
    let active = true;
    const fetchEventData = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const data = await eventService.getEventById(eventId);
        if (!active) return;
        setEvent(data);

        if (!data) {
          setMoreEvents([]);
          setIsSaved(false);
          return;
        }

        // Secondary calls should not break primary event view if one fails
        const [all, favIds] = await Promise.all([
          eventService.getEvents({ limit: 4, onlyUpcoming: true }).catch(() => []),
          userEmail && token ? eventService.getUserFavorites(token).catch(() => []) : Promise.resolve([]),
        ]);

        if (!active) return;
        setMoreEvents(all.filter((e) => e.id !== eventId));
        setIsSaved(favIds.includes(eventId));
      } catch (err: any) {
        if (active) {
          setEvent(null);
          setLoadError(err?.message || 'Unable to load event details right now.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchEventData();
    return () => {
      active = false;
    };
  }, [eventId, userEmail, token, retryCount]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse space-y-6">
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="h-96 w-full bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Unable to Load Event</h2>
        <p className="text-slate-600 dark:text-slate-400">{loadError}</p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setRetryCount((c) => c + 1)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-800 text-white font-semibold text-sm hover:bg-emerald-900 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/events')}
            className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            Back to Upcoming Events
          </button>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Event Not Found</h2>
        <p className="text-slate-500 dark:text-slate-400">
          The event you are looking for does not exist or may have been removed.
        </p>
        <button
          type="button"
          onClick={() => navigate('/events')}
          className="px-5 py-2.5 rounded-xl bg-emerald-800 text-white font-semibold text-sm hover:bg-emerald-900 cursor-pointer"
        >
          Back to Upcoming Events
        </button>
      </div>
    );
  }

  const isUserJoined = Boolean(
    user && (event.joinedUsers || []).some((e) => e.trim().toLowerCase() === user.email.trim().toLowerCase())
  );

  const isEventFull =
    !isUserJoined && Boolean(event.capacity && event.joinedUsers.length >= event.capacity);

  const handleJoinToggle = async () => {
    if (!user || !token) {
      showToast('warning', 'Please log in to perform this action.', 'Access Restricted!');
      navigate('/login', { callbackUrl: `/events/${event.id}` });
      return;
    }

    if (isEventFull) {
      showToast('warning', 'This event has reached full volunteer capacity.', 'Event Full');
      return;
    }

    try {
      setJoining(true);
      if (isUserJoined) {
        const updated = await eventService.leaveEvent(event.id, user.email, token);
        setEvent(updated);
        showToast('info', `You have cancelled your participation for "${event.title}".`, 'Participation Cancelled');
      } else {
        const updated = await eventService.joinEvent(event.id, user.email, token);
        setEvent(updated);
        showToast(
          'success',
          `You have successfully joined "${event.title}". Thank you for supporting the community!`,
          "You're In!"
        );
      }
    } catch (err: any) {
      const msg = err?.message || 'Unable to update participation.';
      if (msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('log in')) {
        showToast('error', msg, 'Access Restricted!');
      } else if (msg.toLowerCase().includes('internet connection') || msg.toLowerCase().includes('reach the server')) {
        showToast('error', msg, 'Connection Problem!');
      } else {
        showToast('error', msg, 'Action Failed');
      }
    } finally {
      setJoining(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        showToast('success', 'Event link copied to clipboard. Share it with friends!', 'Link Copied Successfully!');
        return;
      }
    } catch {
      // Fallback below when iframe blocks clipboard API
    }
    try {
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (copied) {
        showToast('success', 'Event link copied to clipboard. Share it with friends!', 'Link Copied Successfully!');
        return;
      }
    } catch {
      // Final fallback
    }
    showToast('info', `Share link: ${shareUrl}`, 'Event Link Ready');
  };

  const handleSaveToggle = async () => {
    if (!user || !token) {
      showToast('warning', 'Please log in to save events to your favorites.', 'Access Restricted!');
      navigate('/login', { callbackUrl: `/events/${event.id}` });
      return;
    }

    try {
      const result = await eventService.toggleFavorite(event.id, token);
      setIsSaved(result.favorited);
      if (result.favorited) {
        showToast('success', 'Event has been added to your favorites.', 'Added to Your Favorites!');
      } else {
        showToast('info', 'Event removed from your favorites.', 'Removed from Favorites');
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to update favorite status.';
      showToast('error', msg, msg.toLowerCase().includes('log in') ? 'Access Restricted!' : 'Action Failed');
    }
  };

  // Google Calendar URL builder
  const googleCalendarUrl = (() => {
    const title = encodeURIComponent(event.title);
    const details = encodeURIComponent(event.description + '\n\nLocation: ' + event.location);
    const location = encodeURIComponent(event.location);
    const dateFormatted = event.date.replace(/-/g, '');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${dateFormatted}T090000Z/${dateFormatted}T120000Z`;
  })();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Breadcrumb Navigation matching screenshot download_84e78d9b.jfif */}
      <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        <button type="button" onClick={() => navigate('/')} className="hover:text-emerald-800 transition-colors cursor-pointer">
          Home
        </button>
        <span>/</span>
        <button type="button" onClick={() => navigate('/events')} className="hover:text-emerald-800 transition-colors cursor-pointer">
          Upcoming Events
        </button>
        <span>/</span>
        <span className="text-slate-900 dark:text-white font-semibold truncate max-w-xs">
          Event Details
        </span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Main Content */}
        <div className="lg:col-span-8 space-y-8">
          {/* Main Hero Banner with overlay badges */}
          <div className="relative aspect-16/9 rounded-3xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
            <img
              key={event.thumbnail}
              src={event.thumbnail}
              alt={event.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onLoad={(e) => {
                delete e.currentTarget.dataset.fallbackApplied;
              }}
              onError={(e) => {
                const img = e.currentTarget;
                if (img.dataset.fallbackApplied === '1') return;
                img.dataset.fallbackApplied = '1';
                img.src =
                  'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=1200&q=80';
              }}
            />
            {/* Top Overlays */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="px-3.5 py-1.5 rounded-full bg-white/95 dark:bg-slate-900/90 text-xs font-semibold text-emerald-800 dark:text-emerald-300 shadow-sm flex items-center gap-1.5 backdrop-blur-xs">
                <Leaf className="w-3.5 h-3.5" />
                <span>{event.eventType}</span>
              </span>
            </div>

            <div className="absolute top-4 right-4">
              <span className="px-3.5 py-1.5 rounded-full bg-white/95 dark:bg-slate-900/90 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-sm flex items-center gap-1.5 backdrop-blur-xs">
                <Calendar className="w-3.5 h-3.5 text-emerald-800" />
                <span>{event.date}</span>
              </span>
            </div>
          </div>

          {/* Title & Metadata Strip */}
          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {event.title}
            </h1>

            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-800 shrink-0" />
                <span>{event.location}</span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-800 shrink-0" />
                <span>{event.date}</span>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-800 shrink-0" />
                <span>{event.time}</span>
              </div>
            </div>

            {/* Organizer & Interest Count */}
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Organized by</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {event.creatorName}
                </span>
              </div>
              <span>·</span>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-800" />
                <span className="font-semibold text-slate-900 dark:text-white">
                  {event.joinedUsers.length} people are joined
                </span>
              </div>
            </div>
          </div>

          {/* Primary Action Buttons matching screenshot with spring feedback */}
          <div className="flex flex-wrap items-center gap-3 pt-2 pb-4 border-b border-slate-200 dark:border-slate-800">
            <motion.button
              type="button"
              whileHover={{ scale: isEventFull ? 1 : 1.03, y: isEventFull ? 0 : -1 }}
              whileTap={{ scale: isEventFull ? 1 : 0.97 }}
              onClick={handleJoinToggle}
              disabled={joining || isEventFull}
              className={`px-6 py-3 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2 ${
                isEventFull
                  ? 'bg-slate-400 dark:bg-slate-700 text-white cursor-not-allowed'
                  : isUserJoined
                  ? 'bg-emerald-900 hover:bg-emerald-950 text-white cursor-pointer'
                  : 'bg-emerald-800 hover:bg-emerald-900 text-white cursor-pointer'
              }`}
            >
              {isUserJoined ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-300" />
                  <span>Joined (Cancel Participation)</span>
                </>
              ) : isEventFull ? (
                <>
                  <Users className="w-4 h-4" />
                  <span>Event Full</span>
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  <span>{joining ? 'Joining...' : 'Join Event'}</span>
                </>
              )}
            </motion.button>

            <motion.button
              type="button"
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSaveToggle}
              className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
                isSaved
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-700 dark:text-amber-400'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              <span>{isSaved ? 'Saved' : 'Save Event'}</span>
            </motion.button>

            <motion.button
              type="button"
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleShare}
              className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </motion.button>

            <motion.a
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              href={googleCalendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer"
              title="Add event to Google Calendar"
            >
              <Calendar className="w-4 h-4 text-emerald-800" />
              <span>Add to Calendar</span>
            </motion.a>
          </div>

          {!user && (
            <p className="text-xs text-slate-500 italic">
              * Log in to join this event and save your volunteer spot.
            </p>
          )}

          {/* About This Event narrative */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">About this event</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>

          {/* What to Bring section */}
          <div className="space-y-3 pt-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-800" />
              <span>What to Bring</span>
            </h3>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              {(event.whatToBring || [
                'Reusable water bottle to stay hydrated',
                'Comfortable clothes and closed-toe footwear',
                'Friendly positive energy',
              ]).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-700 mt-2 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Community Impact section */}
          <div className="space-y-3 pt-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Leaf className="w-4 h-4 text-emerald-800" />
              <span>Community Impact</span>
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
              {event.impactStatement ||
                'Your participation helps solve localized needs, improves environment and human dignity, and builds stronger bonds among neighbors.'}
            </p>
          </div>
        </div>

        {/* Right Sidebar matching screenshot download_84e78d9b.jfif */}
        <div className="lg:col-span-4 space-y-6">
          {/* Event Details Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Event Details</h3>

            <div className="space-y-4 text-sm divide-y divide-slate-100 dark:divide-slate-800/80">
              {/* Date */}
              <div className="flex items-start gap-3 pt-3 first:pt-0">
                <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-slate-400 uppercase font-semibold">Date & Time</div>
                  <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                    {event.date}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{event.time}</div>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start gap-3 pt-3">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-slate-400 uppercase font-semibold">Location</div>
                  <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                    {event.location}
                  </div>
                  {event.address && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {event.address}
                    </div>
                  )}
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(
                      event.address || event.location
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 dark:text-emerald-400 hover:underline mt-1"
                  >
                    <span>View on map</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Event Type */}
              <div className="flex items-start gap-3 pt-3">
                <Leaf className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-slate-400 uppercase font-semibold">Event Type</div>
                  <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                    {event.eventType}
                  </div>
                </div>
              </div>

              {/* Organizer */}
              <div className="flex items-start gap-3 pt-3">
                <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-slate-400 uppercase font-semibold">Organizer</div>
                  <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                    {event.creatorName}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {event.creatorEmail}
                  </div>
                </div>
              </div>

              {/* Capacity */}
              <div className="flex items-start gap-3 pt-3">
                <Users className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div className="w-full">
                  <div className="text-xs text-slate-400 uppercase font-semibold">Capacity</div>
                  <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                    {event.capacity || 100} volunteers
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {event.joinedUsers.length} people joined
                  </div>
                  {/* Capacity progress meter */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
                    <div
                      className="bg-emerald-700 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          (event.joinedUsers.length / (event.capacity || 100)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Open to Public Box matching screenshot */}
          <div className="bg-amber-50/70 dark:bg-amber-950/30 p-5 rounded-2xl border border-amber-200/60 dark:border-amber-900/40 text-amber-950 dark:text-amber-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Open to the public</span>
            </div>
            <p className="text-xs text-amber-900/80 dark:text-amber-300 leading-relaxed">
              This is a public event and anyone can view the details. Log in to join and stay updated!
            </p>
          </div>
        </div>
      </div>

      {/* Bottom "More Upcoming Events" Section matching download_84e78d9b.jfif */}
      {moreEvents.length > 0 && (
        <div className="pt-10 border-t border-slate-200 dark:border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">More upcoming events</h3>
            <button
              type="button"
              onClick={() => navigate('/events')}
              className="text-xs font-bold text-emerald-800 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View all events</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {moreEvents.slice(0, 4).map((item) => (
              <div
                key={item.id}
                onClick={() => navigate('/events', { id: item.id })}
                className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all cursor-pointer group flex items-start gap-3"
              >
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-16 h-16 rounded-lg object-cover shrink-0 group-hover:scale-105 transition-transform"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (img.dataset.fallbackApplied === '1') return;
                    img.dataset.fallbackApplied = '1';
                    img.src =
                      'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=400&q=80';
                  }}
                />
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-400 block truncate">
                    {item.eventType}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-800">
                    {item.title}
                  </h4>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                    {item.date}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{item.location}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
