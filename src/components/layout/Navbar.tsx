'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Calendar,
  LogOut,
  LogIn,
  Sun,
  Moon,
  ChevronDown,
  PlusCircle,
  ClipboardList,
  Users,
  User,
} from 'lucide-react';

interface NavbarProps {
  currentRoute: string;
  navigate: (route: string, params?: Record<string, string>) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRoute, navigate }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Zone matching Uddomi brand & logo */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/')}
            className="flex items-center gap-2 sm:gap-3 text-left group transition-transform focus:outline-none cursor-pointer"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-emerald-500/30 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0 p-0.5">
              <img
                src="/logo.png"
                alt="Uddomi Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-lg sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                Uddomi
              </span>
              <span className="hidden sm:inline-block text-[11px] font-medium text-emerald-700 dark:text-emerald-400 leading-tight">
                Empowering People, Inspiring Change.
              </span>
            </div>
          </motion.button>
        </div>

        {/* Center / Navigation Zone - Upcoming Events matching UI screenshot */}
        <nav className="flex items-center gap-2 sm:gap-3 min-w-0">
          <motion.button
            type="button"
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/events')}
            className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 shadow-sm cursor-pointer whitespace-nowrap ${
              currentRoute === '/events' || currentRoute.startsWith('/events/')
                ? 'bg-emerald-900 text-white ring-2 ring-emerald-500/30'
                : 'bg-emerald-800 hover:bg-emerald-900 text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="sm:hidden">Events</span>
            <span className="hidden sm:inline">Upcoming Events</span>
          </motion.button>
        </nav>

        {/* Right Action Zone: Theme Switch (Single Button) + Auth Profile */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Single Dark / Light Mode Button: shows Sun when dark mode, shows Moon when light mode */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92, rotate: 180 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-amber-400 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 transition-colors duration-200 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40 shrink-0"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 dark:text-slate-200" />
            )}
          </motion.button>

          {/* Conditional Login / User Profile */}
          {!user ? (
            <motion.button
              type="button"
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/login')}
              className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-full transition-all shadow-sm cursor-pointer whitespace-nowrap"
            >
              <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>Login</span>
            </motion.button>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3" ref={dropdownRef}>
              {/* Profile dropdown trigger */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
                  aria-expanded={dropdownOpen}
                >
                  <img
                    key={user.photoURL}
                    src={user.photoURL}
                    alt={user.name}
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-emerald-600 shadow-sm shrink-0"
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
                  <span className="hidden sm:inline-block text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Hi, {user.name.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </button>

                {/* Hover Tooltip showing full user display name as required */}
                {showTooltip && !dropdownOpen && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1 bg-slate-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap z-50">
                    {user.name} ({user.email})
                  </div>
                )}

                {/* Profile Dropdown Menu with spring pop animation */}
                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -8 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute right-0 mt-3 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50 overflow-hidden"
                    >
                    {/* User Header */}
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                      <img
                        key={user.photoURL}
                        src={user.photoURL}
                        alt={user.name}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-full object-cover border border-emerald-500 shrink-0"
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
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {user.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {user.email}
                        </div>
                        <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {user.accountType}
                        </div>
                      </div>
                    </div>

                    {/* Navigation Items */}
                    <div className="py-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate('/create-event');
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors"
                      >
                        <PlusCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Create Event</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate('/manage-events');
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors"
                      >
                        <ClipboardList className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Manage Events</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate('/joined-events');
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors"
                      >
                        <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Joined Events</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate('/profile');
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors"
                      >
                        <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>My Profile</span>
                      </button>
                    </div>

                    {/* Logout in Dropdown */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          logout();
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-3 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              </div>

              {/* Direct Logout Button on desktop/tablet (also available inside dropdown on mobile) */}
              <button
                type="button"
                onClick={logout}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Logout from account"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
