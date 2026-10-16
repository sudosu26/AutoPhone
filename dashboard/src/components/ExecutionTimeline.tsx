import React from 'react';
import type { ExecutionResponse } from '../api/types';
import { StatusBadge } from './StatusBadge';
import { formatDate, formatDuration, formatRelativeTime } from '../utils/format';
import { Clock, Terminal, ChevronRight } from 'lucide-react';

interface ExecutionTimelineProps {
  executions: ExecutionResponse[];
  onSelectExecution?: (execution: ExecutionResponse) => void;
  selectedId?: string;
  className?: string;
}

export const ExecutionTimeline: React.FC<ExecutionTimelineProps> = ({
  executions,
  onSelectExecution,
  selectedId,
  className = '',
}) => {
  if (!executions || executions.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-slate-400 dark:text-navy-300">
        No execution runs recorded yet.
      </div>
    );
  }

  return (
    <div className={`relative pl-6 space-y-6 ${className}`}>
      {/* Vertical continuous line */}
      <div className="absolute left-2.75 top-3 bottom-3 w-0.5 bg-slate-200 dark:bg-navy-700 pointer-events-none" />

      {executions.map((exec) => {
        const isSelected = selectedId === exec.id;
        const status = exec.status?.toLowerCase();
        let dotBg = 'bg-slate-400 ring-slate-200 dark:ring-navy-800';

        if (status === 'completed') {
          dotBg = 'bg-emerald-500 ring-emerald-100 dark:ring-emerald-950/60';
        } else if (status === 'failed') {
          dotBg = 'bg-rose-500 ring-rose-100 dark:ring-rose-950/60';
        } else if (status === 'running') {
          dotBg = 'bg-blue-500 ring-blue-100 dark:ring-blue-950/60 animate-pulse';
        } else if (status === 'pending') {
          dotBg = 'bg-amber-500 ring-amber-100 dark:ring-amber-950/60';
        }

        return (
          <div
            key={exec.id}
            onClick={() => onSelectExecution && onSelectExecution(exec)}
            className={`relative group rounded-xl p-3.5 transition-all cursor-pointer border ${
              isSelected
                ? 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-300 dark:border-blue-700 shadow-xs'
                : 'bg-white dark:bg-navy-800/80 border-slate-200 dark:border-navy-700 hover:border-slate-300 dark:hover:border-navy-600 hover:shadow-xs'
            }`}
          >
            {/* Timeline node circle */}
            <div
              className={`absolute -left-[1.85rem] top-4 w-3.5 h-3.5 rounded-full ring-4 ${dotBg} transition-transform group-hover:scale-125`}
            />

            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={exec.status} size="sm" />
                  {exec.task_name && (
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                      {exec.task_name}
                    </span>
                  )}
                  {exec.result?.exit_code !== undefined && (
                    <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-navy-900 text-slate-600 dark:text-navy-300 border border-slate-200 dark:border-navy-700">
                      exit: {exec.result.exit_code}
                    </span>
                  )}
                  {exec.result?.status_code !== undefined && (
                    <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-navy-900 text-slate-600 dark:text-navy-300 border border-slate-200 dark:border-navy-700">
                      HTTP {exec.result.status_code}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span title={formatDate(exec.started_at)}>
                    {formatRelativeTime(exec.started_at)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {formatDuration(exec.duration_ms)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 text-slate-400 group-hover:text-blue-500 transition-colors shrink-0">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            {/* Error snippet if failed */}
            {exec.error_message && (
              <div className="mt-2.5 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 text-xs font-mono text-rose-700 dark:text-rose-300 line-clamp-2">
                {exec.error_message}
              </div>
            )}

            {/* Stdout preview if stdout exists and no error */}
            {!exec.error_message && exec.result?.stdout && (
              <div className="mt-2 p-1.5 rounded-lg bg-slate-50 dark:bg-navy-900 text-[11px] font-mono text-slate-600 dark:text-navy-300 line-clamp-1 flex items-center gap-1.5">
                <Terminal className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{exec.result.stdout}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
