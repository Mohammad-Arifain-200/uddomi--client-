import React from 'react';

export const SkeletonCard: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm animate-pulse flex flex-col h-full">
      <div className="w-full h-48 bg-slate-200 dark:bg-slate-800 rounded-xl mb-4"></div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-20 h-4 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="w-16 h-4 bg-slate-200 dark:bg-slate-800 rounded"></div>
      </div>
      <div className="w-3/4 h-6 bg-slate-200 dark:bg-slate-800 rounded mb-2"></div>
      <div className="w-1/2 h-4 bg-slate-200 dark:bg-slate-800 rounded mb-4"></div>
      <div className="w-full h-12 bg-slate-100 dark:bg-slate-800/60 rounded mb-4 mt-auto"></div>
      <div className="w-full h-10 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
    </div>
  );
};
