'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  compressImageFileToDataUrl,
  validateClientImageInput,
} from '../utils/imageValidation';
import {
  Upload,
  Link as LinkIcon,
  Save,
  X,
  Calendar,
  Shield,
  Mail,
  Clock,
  Globe,
  Sprout,
  User,
} from 'lucide-react';

interface ProfilePageProps {
  navigate: (route: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ navigate }) => {
  const { user, updateProfile } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (user) {
      setName(user.name);
      setPhotoURL(user.photoURL);
    }
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <h2 className="text-xl font-bold">Please log in to view your profile</h2>
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="px-4 py-2 bg-emerald-800 text-white rounded-lg cursor-pointer"
        >
          Go to Login
        </button>
      </div>
    );
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type.toLowerCase() as any)) {
      showToast('error', 'Unsupported format. Please upload a JPG, PNG, WEBP, or GIF photo.', 'Unsupported Image Format');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'File size exceeds 5MB limit. Please choose a smaller photo.', 'Image Too Large');
      e.target.value = '';
      return;
    }

    try {
      const newImg = await compressImageFileToDataUrl(file, {
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.84,
      });
      const check = validateClientImageInput(newImg, 3 * 1024 * 1024);
      if (!check.valid) {
        showToast('error', check.errorMessage, check.errorTitle);
        return;
      }
      setPhotoURL(newImg);
      showToast('success', 'Your photo has been uploaded and verified.', 'Photo Uploaded Successfully!');
    } catch {
      showToast('error', 'Failed to read the selected photo file.', 'Upload Error');
    } finally {
      e.target.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('error', 'Please fill in all mandatory fields before continuing.', 'Missing Information!');
      return;
    }

    if (photoURL.trim()) {
      const imgCheck = validateClientImageInput(photoURL.trim(), 3 * 1024 * 1024);
      if (!imgCheck.valid) {
        showToast('error', imgCheck.errorMessage, imgCheck.errorTitle);
        return;
      }
    }

    try {
      setSaving(true);
      await updateProfile(name, photoURL);
    } catch (err: any) {
      showToast('error', 'Unable to reach the server. Please check your internet connection.', 'Connection Problem!');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Header matching download_993af081.png */}
      <div className="space-y-1.5">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          My Profile
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Update your profile information and photo.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Profile Edit Form */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Profile Photo Section matching screenshot */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Profile Photo
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-emerald-600/30 shadow-md shrink-0">
                  <img
                    key={photoURL || user.photoURL}
                    src={photoURL || user.photoURL}
                    alt={name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    onLoad={(e) => {
                      delete e.currentTarget.dataset.fallbackApplied;
                    }}
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (img.dataset.fallbackApplied === '1') return;
                      img.dataset.fallbackApplied = '1';
                      img.src =
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';
                    }}
                  />
                </div>

                <div className="flex-1 space-y-3 w-full">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    JPG, PNG or WEBP. Max size 3MB.
                  </span>

                  <label className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <div className="flex items-center gap-2">
                    <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">or</span>
                    <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <LinkIcon className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      inputMode="url"
                      value={photoURL}
                      onChange={(e) => setPhotoURL(e.target.value)}
                      placeholder="Paste photo URL or upload image"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    Use a public image URL from the web.
                  </span>
                </div>
              </div>
            </div>

            {/* Name input */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            {/* Email (Read-only as shown in screenshot) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Email
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
              />
              <p className="text-[11px] text-slate-400">Email cannot be changed.</p>
            </div>

            {/* Action buttons */}
            <div className="pt-4 flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Profile'}</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Right Account Details Column matching download_993af081.png */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex items-center gap-2 font-bold text-base text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
              <User className="w-5 h-5 text-emerald-800" />
              <span>Account Details</span>
            </div>

            <div className="space-y-4 text-xs">
              {/* Member Since */}
              <div className="flex items-center justify-between py-1">
                <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>Member since</span>
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {user.memberSince || 'May 12, 2024'}
                </span>
              </div>

              {/* Account Type */}
              <div className="flex items-center justify-between py-1">
                <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Shield className="w-4 h-4 text-slate-400" />
                  <span>Account type</span>
                </span>
                <span className="font-semibold text-emerald-800 dark:text-emerald-400">
                  {user.accountType}
                </span>
              </div>

              {/* Email */}
              <div className="flex items-center justify-between py-1">
                <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>Email</span>
                </span>
                <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[160px]">
                  {user.email}
                </span>
              </div>

              {/* Last signed in */}
              <div className="flex items-center justify-between py-1">
                <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>Last signed in</span>
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {user.lastSignedIn || 'Nov 01, 2026, 9:42 AM'}
                </span>
              </div>

              {/* Time zone */}
              <div className="flex items-center justify-between py-1">
                <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <span>Time zone</span>
                </span>
                <span className="font-semibold text-slate-900 dark:text-white text-right">
                  {user.timeZone || '(GMT-4) Eastern Time (US & Canada)'}
                </span>
              </div>
            </div>

            {/* Motivational message matching screenshot */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-start gap-3 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
              <Sprout className="w-5 h-5 text-emerald-800 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  Your impact matters
                </h4>
                <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-0.5 leading-relaxed">
                  Thanks for being part of the Uddomi community and helping empower people
                  and inspire positive change across local neighborhoods.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
