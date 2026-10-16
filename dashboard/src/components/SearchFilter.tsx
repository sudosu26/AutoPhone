import React from 'react';
import { Search, X, Filter } from 'lucide-react';
import { ADAPTER_TYPES } from '../utils/constants';

interface SearchFilterProps {
  search: string;
  onSearchChange: (search: string) => void;
  statusFilter?: string;
  onStatusChange?: (status: string) => void;
  typeFilter?: string;
  onTypeChange?: (type: string) => void;
  searchPlaceholder?: string;
  statusOptions?: { value: string; label: string }[];
  className?: string;
}

const DEFAULT_STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'running', label: 'Running' },
  { value: 'failed', label: 'Failed' },
  { value: 'pending', label: 'Pending' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const SearchFilter: React.FC<SearchFilterProps> = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  typeFilter,
  onTypeChange,
  searchPlaceholder = 'Search tasks...',
  statusOptions = DEFAULT_STATUS_OPTIONS,
  className = '',
}) => {
  const hasActiveFilters = Boolean(
    search ||
      (statusFilter && statusFilter !== 'all') ||
      (typeFilter && typeFilter !== 'all')
  );

  const handleReset = () => {
    onSearchChange('');
    if (onStatusChange) onStatusChange('all');
    if (onTypeChange) onTypeChange('all');
  };

  return (
    <div
      className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 shadow-xs transition-colors ${className}`}
    >
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-navy-300 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-10 pr-9 py-2 text-sm bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        {/* Type Filter */}
        {onTypeChange && (
          <div className="relative flex-1 sm:w-44">
            <select
              value={typeFilter || 'all'}
              onChange={(e) => onTypeChange(e.target.value)}
              className="w-full pl-3 pr-8 py-2 text-sm bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer transition-colors"
            >
              <option value="all">All Types</option>
              {ADAPTER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        )}

        {/* Status Filter */}
        {onStatusChange && (
          <div className="relative flex-1 sm:w-40">
            <select
              value={statusFilter || 'all'}
              onChange={(e) => onStatusChange(e.target.value)}
              className="w-full pl-3 pr-8 py-2 text-sm bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer transition-colors"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 border-t-4 border-l-4 border-r-4 border-transparent border-t-slate-400 w-0 h-0" />
          </div>
        )}

        {/* Reset Filter Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 dark:bg-navy-800 hover:bg-slate-200 dark:hover:bg-navy-700 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
};
