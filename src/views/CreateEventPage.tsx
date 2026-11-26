'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { eventService } from '../services/api';
import { getLocalDateString, validateFutureEventDate } from '../utils/dateValidation';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  compressImageFileToDataUrl,
  validateClientImageInput,
} from '../utils/imageValidation';
import {
  Calendar,
  MapPin,
  Image as ImageIcon,
  FileText,
  Clock,
  Sparkles,
  Leaf,
  GraduationCap,
  Package,
  Heart,
  Lightbulb,
  Check,
  Lock,
  Upload,
} from 'lucide-react';

interface CreateEventPageProps {
  navigate: (route: string, params?: Record<string, string>) => void;
}

const PRESET_THUMBNAILS = [
  {
    label: 'Park & Street Cleanup',
    url: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Tree Plantation & Gardening',
    url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Winter Clothes Distribution',
    url: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Food Pantry & Meal Packing',
    url: 'https://images.unsplash.com/photo-1593113646773-028c64a8f1b8?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Youth Education & Tutoring',
    url: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Community Health Camp',
    url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80',
  },
];

export const CreateEventPage: React.FC<CreateEventPageProps> = ({ navigate }) => {
  const { user, token } = useAuth();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState('Cleanup');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('9:00 AM - 1:00 PM');
  const [location, setLocation] = useState('');
  const [thumbnail, setThumbnail] = useState(
    'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=1200&q=80'
  );
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState('50');
  const [submitting, setSubmitting] = useState(false);

  // Minimum allowed date is tomorrow (strictly future)
  const tomorrowStr = getLocalDateString(1);

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

    if (!user || !token) {
      showToast('error', 'Please log in to perform this action.', 'Access Restricted!');
      navigate('/login');
      return;
    }

    if (!title.trim()) {
      showToast('error', 'Please enter a clear event title before continuing.', 'Missing Information!');
      return;
    }

    const dateCheck = validateFutureEventDate(date);
    if (!dateCheck.valid) {
      showToast('error', dateCheck.message || 'Please select a valid future event date.', 'Invalid Event Date');
      return;
    }

    if (!location.trim()) {
      showToast('error', 'Please provide the event location before continuing.', 'Missing Information!');
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
      showToast('error', 'Please provide a descriptive explanation (minimum 20 characters).', 'Description Too Short');
      return;
    }

    try {
      setSubmitting(true);
      await eventService.createEvent(
        {
          title: title.trim(),
          eventType,
          date,
          time: time.trim() || '9:00 AM - 1:00 PM',
          location: location.trim(),
          thumbnail: thumbnail.trim() || PRESET_THUMBNAILS[0].url,
          description: description.trim(),
          capacity: parseInt(capacity) || 50,
          creatorEmail: user.email,
          creatorName: user.name,
          creatorId: user.id,
          whatToBring: [
            'Comfortable work attire & closed-toe shoes',
            'Reusable water bottle',
            'Enthusiastic spirit to help neighbors',
          ],
          impactStatement:
            'Every volunteer hour directly benefits neighbors in need and strengthens our local community ties.',
        },
        token
      );

      showToast(
        'success',
        'Your community event has been published successfully.',
        'Your Event Is Live!'
      );

      setTimeout(() => {
        navigate('/events');
      }, 1000);
    } catch (err: any) {
      const msg = err?.message || 'Failed to create event.';
      if (msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('log in')) {
        showToast('error', msg, 'Access Restricted!');
      } else if (msg.toLowerCase().includes('internet connection') || msg.toLowerCase().includes('reach the server')) {
        showToast('error', msg, 'Connection Problem!');
      } else {
        showToast('error', msg, 'Missing Information!');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb matching screenshot download__3__480ebd2b.jfif */}
      <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        <button type="button" onClick={() => navigate('/')} className="hover:text-emerald-800 transition-colors cursor-pointer">
          Home
        </button>
        <span>/</span>
        <span className="text-slate-900 dark:text-white font-semibold">Create Event</span>
      </nav>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Create a Community Event
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
          Start something meaningful! Share your idea, gather volunteers, and make a positive impact in
          your neighborhood.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Form Column */}
        <form onSubmit={handleSubmit} className="lg:col-span-8 space-y-6">
          {/* 1. Title */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              Event Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a clear and engaging event title"
              required
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 shadow-xs"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Be specific so people know what it's about (e.g. Winter Clothes Distribution – Mirpur 10).
            </p>
          </div>

          {/* 2. Event Type with Dropdown + Quick Chips */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              Event Type <span className="text-rose-500">*</span>
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-700 shadow-xs cursor-pointer"
            >
              <option value="Cleanup">Cleanup</option>
              <option value="Plantation">Plantation</option>
              <option value="Donation">Donation</option>
              <option value="Education">Education</option>
              <option value="Community">Community Relief</option>
              <option value="Health">Healthcare</option>
            </select>

            {/* Quick tags matching screenshot */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {['Cleanup', 'Plantation', 'Donation', 'Education'].map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setEventType(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    eventType === cat
                      ? 'bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-400 text-emerald-800 dark:text-emerald-300'
                      : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {cat === 'Cleanup' && <Leaf className="w-3.5 h-3.5" />}
                  {cat === 'Plantation' && <Leaf className="w-3.5 h-3.5" />}
                  {cat === 'Donation' && <Package className="w-3.5 h-3.5" />}
                  {cat === 'Education' && <GraduationCap className="w-3.5 h-3.5" />}
                  <span>{cat}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Choose the category that best fits your event.
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
                min={tomorrowStr}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-700 shadow-xs cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Choose a future date for your event (past dates cannot be added).
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
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-700 shadow-xs"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Specify morning, afternoon, or evening shifts.
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
                placeholder="Enter the full location (e.g., Mirpur 10, Dhaka or Greenwood Park, Austin)"
                required
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-700 shadow-xs"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Include venue or landmark so volunteers can find it easily.
            </p>
          </div>

          {/* 5. Event Cover Image (Upload from Device / URL / Presets) */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Event Cover Image
              </label>

              {/* Upload button from device */}
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

            {/* Current Image Preview */}
            {thumbnail && (
              <div className="relative aspect-16/9 max-w-md rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-slate-100 dark:bg-slate-800">
                <img
                  key={thumbnail}
                  src={thumbnail}
                  alt="Selected event cover"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onLoad={(e) => {
                    delete e.currentTarget.dataset.fallbackApplied;
                  }}
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (img.dataset.fallbackApplied === '1') return;
                    img.dataset.fallbackApplied = '1';
                    img.src = PRESET_THUMBNAILS[0].url;
                  }}
                />
                <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-xs text-[11px] text-white font-medium">
                  Current Cover Preview
                </div>
              </div>
            )}

            {/* Direct URL input (supports both http(s) URLs and uploaded base64 data:image URLs) */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                Or paste direct image URL:
              </span>
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
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-700 shadow-xs"
                />
              </div>
            </div>

            {/* Quick preset thumbnail choices */}
            <div className="pt-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
                Or choose from community presets:
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PRESET_THUMBNAILS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setThumbnail(preset.url)}
                    className={`relative rounded-lg overflow-hidden aspect-video border-2 transition-all ${
                      thumbnail === preset.url
                        ? 'border-emerald-600 scale-102 ring-2 ring-emerald-500/30'
                        : 'border-transparent opacity-75 hover:opacity-100'
                    }`}
                    title={preset.label}
                  >
                    <img
                      src={preset.url}
                      alt={preset.label}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (img.dataset.fallbackApplied === '1') return;
                        img.dataset.fallbackApplied = '1';
                        img.src = '/assets/homepage/event_cleanup.png';
                      }}
                    />
                    {thumbnail === preset.url && (
                      <div className="absolute inset-0 bg-emerald-950/40 flex items-center justify-center text-white">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 6. Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Description <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {description.length} / 1000 characters
              </span>
            </div>
            <textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your event, goals, activities, what to bring, and how volunteers can help."
              required
              maxLength={1000}
              className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 shadow-xs"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Provide details to inspire and inform volunteers.
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-6 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              <span>{submitting ? 'Publishing Event...' : 'Create Event'}</span>
            </button>
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mt-3">
              <Lock className="w-3.5 h-3.5" />
              <span>By creating an event, you agree to our Community Guidelines.</span>
            </div>
          </div>
        </form>

        {/* Right Encouragement Column matching screenshot download__3__480ebd2b.jfif */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-800 dark:text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
              Bring Neighbors Together
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Great events start with simple ideas and caring people. Your event can spark connection
              and create lasting change across the neighborhood.
            </p>

            <div className="relative aspect-4/3 rounded-xl overflow-hidden shadow-xs">
              <img
                src="https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=600&q=80"
                alt="Community volunteers"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const img = e.currentTarget;
                  if (img.dataset.fallbackApplied === '1') return;
                  img.dataset.fallbackApplied = '1';
                  img.src = '/assets/homepage/hero_community.png';
                }}
              />
            </div>
          </div>

          {/* Tip Card */}
          <div className="bg-amber-50/70 dark:bg-amber-950/30 p-5 rounded-2xl border border-amber-200/60 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs">
              <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Tip: Clear details attract 3x more volunteers!</span>
            </div>
            <p className="text-xs text-amber-900/80 dark:text-amber-300 leading-relaxed">
              Specify what tools you provide, what clothes attendees should wear, and exact meetup
              coordinates so everyone arrives prepared.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
