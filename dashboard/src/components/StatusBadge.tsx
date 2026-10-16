import React from 'react';
import clsx from 'clsx';
import { EXECUTION_STATUS_CONFIG } from '../utils/constants';
import type { ExecutionStatus } from '../api/types';

interface StatusBadgeProps {
  status: ExecutionStatus | 'enabled' | 'disabled' | 'connected' | 'offline' | string;
  size?: 'sm' | 'md';
  showDot?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showDot = true,
  className,
}) => {
  const normalized = (status || '').toLowerCase();

  let label = status;
  let colorClass = 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  let dotClass = 'bg-slate-400';
  let isPulsing = false;

  if (normalized in EXECUTION_STATUS_CONFIG) {
    const config = EXECUTION_STATUS_CONFIG[normalized as ExecutionStatus];
    label = config.label;
    colorClass = config.color;
    dotClass = config.dot;
    isPulsing = normalized === 'running';
  } else if (normalized === 'enabled') {
    label = 'Enabled';
    colorClass = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    dotClass = 'bg-emerald-400';
  } else if (normalized === 'disabled') {
    label = 'Disabled';
    colorClass = 'bg-slate-500/15 text-slate-400 border-slate-500/30';
    dotClass = 'bg-slate-400';
  } else if (normalized === 'connected') {
    label = 'Connected';
    colorClass = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    dotClass = 'bg-emerald-400';
  } else if (normalized === 'offline') {
    label = 'Offline';
    colorClass = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    dotClass = 'bg-rose-400';
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium rounded-full border transition-colors',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs sm:text-sm',
        colorClass,
        className
      )}
    >
      {showDot && (
        <span
          className={clsx(
            'inline-block rounded-full',
            size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
            dotClass,
            isPulsing && 'animate-ping'
          )}
        />
      )}
      <span className="capitalize">{label}</span>
    </span>
  );
};
