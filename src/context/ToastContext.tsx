'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ToastMessage } from '../types';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X, Sparkles } from 'lucide-react';

interface ToastContextType {
  showToast: (
    type: 'success' | 'error' | 'warning' | 'info',
    message: string,
    title?: string,
    duration?: number
  ) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Individual Toast Item with hover-pause and animated progress bar
const ToastItem: React.FC<{
  toast: ToastMessage;
  onRemove: (id: string) => void;
}> = ({ toast, onRemove }) => {
  const [isPaused, setIsPaused] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const duration = toast.duration || 4500;

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 250);
  }, [onRemove, toast.id]);

  useEffect(() => {
    if (isPaused) return;

    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, handleDismiss, isPaused]);

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';
  const isWarning = toast.type === 'warning';

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="status"
      aria-live="polite"
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-300 ${
        isExiting ? 'opacity-0 -translate-y-3 scale-95' : 'animate-toast-in'
      } ${
        isSuccess
          ? 'bg-white/95 dark:bg-slate-900/95 border-emerald-500/40 text-slate-900 dark:text-white shadow-emerald-950/15 dark:shadow-emerald-950/50'
          : isError
          ? 'bg-white/95 dark:bg-slate-900/95 border-rose-500/40 text-slate-900 dark:text-white shadow-rose-950/15 dark:shadow-rose-950/50'
          : isWarning
          ? 'bg-white/95 dark:bg-slate-900/95 border-amber-500/40 text-slate-900 dark:text-white shadow-amber-950/15 dark:shadow-amber-950/50'
          : 'bg-white/95 dark:bg-slate-900/95 border-emerald-600/40 text-slate-900 dark:text-white shadow-emerald-950/15 dark:shadow-emerald-950/50'
      }`}
    >
      <div className="flex items-start gap-3.5 p-4 sm:p-4.5">
        {/* Animated Icon Badge */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-xs transition-transform duration-300 ${
            isSuccess
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/80 ring-4 ring-emerald-500/10'
              : isError
              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/80 ring-4 ring-rose-500/10'
              : isWarning
              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/80 ring-4 ring-amber-500/10'
              : 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800/80 ring-4 ring-teal-500/10'
          }`}
        >
          {isSuccess && <CheckCircle2 className="w-5 h-5 animate-scale-in" />}
          {isError && <AlertCircle className="w-5 h-5 animate-scale-in" />}
          {isWarning && <AlertTriangle className="w-5 h-5 animate-scale-in" />}
          {!isSuccess && !isError && !isWarning && <Sparkles className="w-5 h-5 animate-scale-in" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
              {toast.title}
            </h4>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isSuccess
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                  : isError
                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                  : isWarning
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                  : 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300'
              }`}
            >
              {isSuccess ? 'Success' : isError ? 'Attention' : isWarning ? 'Notice' : 'Update'}
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed break-words font-normal">
            {toast.message}
          </p>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Animated Countdown Progress Bar */}
      <div className="w-full h-1 bg-slate-100 dark:bg-slate-800/80 overflow-hidden">
        <div
          className={`h-full transition-all ${
            isSuccess
              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
              : isError
              ? 'bg-gradient-to-r from-rose-500 to-red-400'
              : isWarning
              ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
              : 'bg-gradient-to-r from-emerald-500 to-cyan-400'
          }`}
          style={{
            animation: `toastProgress ${duration}ms linear forwards`,
            animationPlayState: isPaused ? 'paused' : 'running',
          }}
        />
      </div>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (
      type: 'success' | 'error' | 'warning' | 'info',
      message: string,
      title?: string,
      duration?: number
    ) => {
      const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const defaultTitle =
        type === 'success'
          ? 'Success'
          : type === 'error'
          ? 'Action Required'
          : type === 'warning'
          ? 'Notice'
          : 'Uddomi Update';

      const newToast: ToastMessage = {
        id,
        type,
        title: title || defaultTitle,
        message,
        duration: duration || 4500,
      };

      // Keep max 4 toasts at once to prevent screen clutter
      setToasts((prev) => [...prev.slice(-3), newToast]);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {/* Toast Render Container with sleek z-index and top positioning */}
      <div className="fixed top-4 sm:top-6 right-3 sm:right-6 z-50 flex flex-col gap-3 max-w-[92vw] sm:max-w-md w-full pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
