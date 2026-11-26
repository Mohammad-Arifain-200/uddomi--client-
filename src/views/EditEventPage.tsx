'use client';

import React, { useState, useEffect } from 'react';
import { CommunityEvent } from '../types';
import { eventService } from '../services/api';
import { getLocalDateString, validateFutureEventDate } from '../utils/dateValidation';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  compressImageFileToDataUrl,
  validateClientImageInput,
} from '../utils/imageValidation';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Calendar,
  MapPin,
  Image as ImageIcon,
  CheckCircle2,
  X,
  Save,
  Leaf,
  GraduationCap,
  Package,
  Upload,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface EditEventPageProps {
  eventId: string;
  navigate: (route: string, params?: Record<string, string>) => void;
}

export const EditEventPage: React.FC<EditEventPageProps> = ({ eventId, navigate }) => {
  const { user, token, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [event, setEvent] = useState<CommunityEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Form states
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState('Cleanup');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const userId = user?.id || null;
  const userEmail = user?.email || null;

  useEffect(() => {
    if (authLoading) return;

    if (!userId || !userEmail) {
      showToast('error', 'Please log in to edit your event.', 'Authentication Required');
      navigate('/login', { callbackUrl: `/edit-event/${eventId}` });
      return;
    }

    let active = true;
    const fetchEvent = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const data = await eventService.getEventById(eventId);
        if (!active) return;
        if (!data) {
          showToast('error', 'Event not found.', 'Error');
          navigate('/manage-events');
          return;
        }

        // Authorization check: User can only edit their own created event
        if (
          data.organizerId !== userId &&
          data.creatorId !== userId &&
          data.creatorEmail.toLowerCase() !== userEmail.toLowerCase()
        ) {
          showToast('error', 'You can only edit events created by yourself.', 'Access Restricted!');
          navigate('/manage-events');
          return;
        }

        setEvent(data);
        setTitle(data.title);
        setEventType(data.eventType);
        setDate(data.date);
        setTime(data.time || '9:00 AM - 12:00 PM CDT');
        setLocation(data.location);
        setThumbnail(data.thumbnail);
        setDescription(data.description);
      } catch (err: any) {
        if (active) {
          setEvent(null);
          setLoadError(err?.message || 'Unable to load this event for editing.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchEvent();
    return () => {
      active = false;
    };
  }, [eventId, authLoading, userId, userEmail, retryCount]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type.toLowerCase() as any)) {
      showToast('error', 'Unsupported format. Please upload a JPG, PNG, WEBP, or GIF image.', 'Unsupported Image Format');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'Image size exceeds 5MB limit. Please choose a smaller picture.', 'Image Too Large');
      e.target.value = '';
      return;
    }

    try {
      const dataUrl = await compressImageFileToDataUrl(file, {
        maxWidth: 1280,
        maxHeight: 720,
        quality: 0.84,
      });
      const check = validateClientImageInput(dataUrl, 5 * 1024 * 1024);
      if (!check.valid) {
        showToast('error', check.errorMessage, check.errorTitle);
        return;
      }
      setThumbnail(dataUrl);
      showToast('success', 'Your photo has been uploaded and verified.', 'Photo Uploaded Successfully!');
    } catch {
      showToast('error', 'Failed to read the selected image file.', 'Upload Error');
    } finally {
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !token || !event) {
      showToast('error', 'Please log in to perform this action.', 'Access Restricted!');
      return;
    }

    if (!title.trim()) {
      showToast('error', 'Please fill in all mandatory fields before continuing.', 'Missing Information!');
      return;
    }

    const dateCheck = validateFutureEventDate(date);
    if (!dateCheck.valid) {
      showToast('error', dateCheck.message || 'Event date must be strictly in the future.', 'Invalid Event Date');
      return;
    }

    if (!location.trim()) {
      showToast('error', 'Please fill in all mandatory fields before continuing.', 'Missing Information!');
      return;
    }

    if (thumbnail.trim()) {
      const imgCheck = validateClientImageInput(thumbnail.trim(), 5 * 1024 * 1024);
      if (!imgCheck.valid) {
        showToast('error', imgCheck.errorMessage, imgCheck.errorTitle);
        return;
      }
    }

    if (!description.trim() || description.trim().length < 20) {
      showToast('error', 'Please provide a descriptive explanation (minimum 20 characters).', 'Missing Information!');
      return;
    }

    try {
      setSaving(true);
      await eventService.updateEvent(
        event.id,
        {
          title: title.trim(),
          eventType,
          date,
          time: time.trim() || '9:00 AM - 12:00 PM CDT',
          location: location.trim(),
          thumbnail: thumbnail.trim(),
          description: description.trim(),
        },
        user.email,
        token
      );

      showToast('success', 'Event details have been updated.', 'Changes Saved Successfully!');
      navigate('/manage-events');
    } catch (err: any) {
      const msg = err?.message || 'Failed to update event details.';
      if (msg.toLowerCase().includes('forbidden') || msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('only edit')) {
        showToast('error', msg, 'Access Restricted!');
      } else if (msg.toLowerCase().includes('internet connection') || msg.toLowerCase().includes('reach the server')) {
        showToast('error', msg, 'Connection Problem!');
      } else {
        showToast('error', msg, 'Missing Information!');
      }
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse space-y-6">
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="h-12 w-3/4 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="h-96 w-full bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
      </div>
    );
  }

  if (loadError || !event) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Unable to Load Event</h2>
        <p className="text-slate-600 dark:text-slate-400">
          {loadError || 'This event could not be loaded for editing.'}
        </p>
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
            onClick={() => navigate('/manage-events')}
            className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            Manage Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb matching screenshot download__4__fd56fc89.jfif */}
      <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        <button type="button" onClick={() => navigate('/')} className="hover:text-emerald-800 transition-colors cursor-pointer">
          Home
        </button>
        <span>/</span>
        <button
          type="button"
          onClick={() => navigate('/manage-events')}
          className="hover:text-emerald-800 transition-colors cursor-pointer"
        >
          Manage Events
        </button>
        <span>/</span>
        <span className="text-slate-900 dark:text-white font-semibold">Edit Event</span>
      </nav>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Update Event
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          Make changes to your event details below. Click Save Changes when you're done.
        </p>
      </div>

      {/* Form matching download__4__fd56fc89.jfif */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6"
      >
        {/* 1. Title */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
            Event Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
          />
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            A title helps people understand your event.
          </p>
        </div>

        {/* 2. Event Type */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
            Event Type <span className="text-rose-500">*</span>
          </label>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-700 cursor-pointer"
          >
            <option value="Cleanup">Cleanup</option>
            <option value="Plantation">Plantation</option>
            <option value="Donation">Donation</option>
            <option value="Education">Education</option>
            <option value="Environment">Environment</option>
            <option value="Community">Community Relief</option>
            <option value="Health">Healthcare</option>
          </select>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Select the category that best fits your event.
          </p>
        </div>

        {/* 3. Event Date & Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              Event Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              min={getLocalDateString(1)}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-700 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Choose a future date for your event.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              Event Time
            </label>
            <input
              type="text"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="e.g. 9:00 AM - 12:00 PM CDT"
              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Update event schedule hours if needed.
            </p>
          </div>
        </div>

        {/* 4. Location */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
            Location <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <MapPin className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Add the full location so attendees can find you easily.
          </p>
        </div>

        {/* 5. Thumbnail Image (Upload from Device or URL) */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              Thumbnail Image
            </label>

            <label className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition-colors self-start sm:self-auto">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload from Device</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <ImageIcon className="w-4 h-4" />
            </div>
            <input
              type="text"
              inputMode="url"
              value={thumbnail}
              onChange={(e) => setThumbnail(e.target.value)}
              placeholder="https://images.unsplash.com/your-image.jpg"
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Provide a direct URL or upload an image from your device.
          </p>

          {/* Image Preview matching screenshot */}
          {thumbnail && (
            <div className="pt-2">
              <div className="relative max-w-md aspect-16/9 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs">
                <img
                  key={thumbnail}
                  src={thumbnail}
                  alt="Event preview"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onLoad={(e) => {
                    delete e.currentTarget.dataset.fallbackApplied;
                  }}
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (img.dataset.fallbackApplied === '1') return;
                    img.dataset.fallbackApplied = '1';
                    img.src = '/assets/homepage/event_cleanup.png';
                  }}
                />
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">
                Recommended: 1200x630px (16:9) for best results.
              </span>
            </div>
          )}
        </div>

        {/* 6. Description */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              Description <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-slate-400 font-mono">
              {description.length} / 1000
            </span>
          </div>
          <textarea
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            maxLength={1000}
            className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
          />
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Share details about your event, what to bring, and who's invited.
          </p>
        </div>

        {/* Dynamic Validation Status Indicator */}
        {(() => {
          const isValidForm =
            Boolean(title.trim()) &&
            validateFutureEventDate(date).valid &&
            Boolean(location.trim()) &&
            description.trim().length >= 20;

          return isValidForm ? (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>All required fields are complete and look good!</span>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
              <span>
                Please ensure Title, Strictly Future Date, Location, and Description (min 20 characters) are filled accurately.
              </span>
            </div>
          );
        })()}

        {/* Action Buttons matching screenshot download__4__fd56fc89.jfif */}
        <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => navigate('/manage-events')}
            className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Cancel</span>
          </button>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
