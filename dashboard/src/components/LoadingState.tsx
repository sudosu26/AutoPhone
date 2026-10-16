import React from 'react';

interface LoadingStateProps {
  count?: number;
  variant?: 'cards' | 'rows' | 'table';
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  count = 3,
  variant = 'cards',
  className = '',
}) => {
  const items = Array.from({ length: count }, (_, i) => i);

  if (variant === 'rows') {
    return (
      <div className={`space-y-3 ${className}`}>
        {items.map((i) => (
          <div
            key={i}
            className="flex items-center justify-between p-4 rounded-xl bg-slate-100 dark:bg-navy-900 border border-slate-200 dark:border-navy-700 animate-pulse"
          >
            <div className="flex items-center gap-3 w-1/3">
              <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-navy-800" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 bg-slate-200 dark:bg-navy-800 rounded w-4/5" />
                <div className="h-3 bg-slate-200 dark:bg-navy-800 rounded w-1/2" />
              </div>
            </div>
            <div className="h-4 bg-slate-200 dark:bg-navy-800 rounded w-24" />
            <div className="h-6 bg-slate-200 dark:bg-navy-800 rounded-full w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div
        className={`rounded-xl border border-slate-200 dark:border-navy-700 overflow-hidden bg-white dark:bg-navy-900 ${className}`}
      >
        <div className="h-10 bg-slate-50 dark:bg-navy-800 border-b border-slate-200 dark:border-navy-700" />
        <div className="divide-y divide-slate-100 dark:divide-navy-800">
          {items.map((i) => (
            <div key={i} className="flex items-center p-4 gap-4 animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-navy-800 rounded w-1/4" />
              <div className="h-4 bg-slate-200 dark:bg-navy-800 rounded w-1/6" />
              <div className="h-4 bg-slate-200 dark:bg-navy-800 rounded w-1/4" />
              <div className="h-4 bg-slate-200 dark:bg-navy-800 rounded w-1/6 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 ${className}`}
    >
      {items.map((i) => (
        <div
          key={i}
          className="p-5 rounded-2xl bg-white dark:bg-navy-800/80 border border-slate-200 dark:border-navy-700 shadow-xs animate-pulse space-y-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-navy-700" />
              <div className="space-y-1.5">
                <div className="h-4 bg-slate-200 dark:bg-navy-700 rounded w-28" />
                <div className="h-3 bg-slate-200 dark:bg-navy-700 rounded w-16" />
              </div>
            </div>
            <div className="w-10 h-5 rounded-full bg-slate-200 dark:bg-navy-700" />
          </div>

          <div className="space-y-2 py-1">
            <div className="h-3 bg-slate-200 dark:bg-navy-700 rounded w-full" />
            <div className="h-3 bg-slate-200 dark:bg-navy-700 rounded w-3/4" />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-navy-700/60 flex items-center justify-between">
            <div className="h-3 bg-slate-200 dark:bg-navy-700 rounded w-20" />
            <div className="h-8 bg-slate-200 dark:bg-navy-700 rounded-lg w-20" />
          </div>
        </div>
      ))}
    </div>
  );
};
