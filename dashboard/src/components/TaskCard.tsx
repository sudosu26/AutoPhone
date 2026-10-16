import React from 'react';
import type { TaskResponse, AdapterType } from '../api/types';
import { StatusBadge } from './StatusBadge';
import { truncateText, formatRelativeTime } from '../utils/format';
import {
  Terminal,
  Globe,
  Smartphone,
  FolderOpen,
  Play,
  Trash2,
  Calendar,
  Clock,
  Layers,
} from 'lucide-react';

interface TaskCardProps {
  task: TaskResponse;
  onRun: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
  onClick: (id: string) => void;
  isRunning?: boolean;
}

export const getAdapterIcon = (type: AdapterType | string) => {
  switch (type) {
    case 'shell':
      return <Terminal className="w-4 h-4 text-emerald-500" />;
    case 'http':
      return <Globe className="w-4 h-4 text-blue-500" />;
    case 'app_launch':
      return <Smartphone className="w-4 h-4 text-purple-500" />;
    case 'file_ops':
      return <FolderOpen className="w-4 h-4 text-amber-500" />;
    default:
      return <Layers className="w-4 h-4 text-slate-400" />;
  }
};

export const getAdapterLabel = (type: AdapterType | string) => {
  switch (type) {
    case 'shell':
      return 'Shell';
    case 'http':
      return 'HTTP';
    case 'app_launch':
      return 'App Launch';
    case 'file_ops':
      return 'File Ops';
    default:
      return type;
  }
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onRun,
  onToggle,
  onDelete,
  onClick,
  isRunning = false,
}) => {
  const hasSchedule = task.schedules && task.schedules.length > 0;
  const activeSchedule = hasSchedule ? task.schedules.find((s) => s.enabled) || task.schedules[0] : null;

  return (
    <div
      onClick={() => onClick(task.id)}
      className="group relative flex flex-col justify-between p-5 rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800/80 shadow-xs hover:border-blue-400 dark:hover:border-navy-600 hover:shadow-md transition-all cursor-pointer"
    >
      <div>
        {/* Header row: Adapter badge & Toggle */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-navy-900 border border-slate-200/80 dark:border-navy-700 text-slate-700 dark:text-slate-300">
              {getAdapterIcon(task.adapter_type)}
              <span>{getAdapterLabel(task.adapter_type)}</span>
            </span>

            {activeSchedule && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                title={`Schedule: ${activeSchedule.cron_expression}`}
              >
                <Calendar className="w-3 h-3" />
                <span className="truncate max-w-[90px]">{activeSchedule.cron_expression}</span>
              </span>
            )}
          </div>

          {/* Toggle Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={task.enabled}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(task.id, !task.enabled);
            }}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-navy-900 ${
              task.enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-navy-700'
            }`}
            title={task.enabled ? 'Enabled' : 'Disabled'}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                task.enabled ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Task Name & Description */}
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
          {task.name}
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[2rem] leading-relaxed">
          {truncateText(task.description || 'No description provided.', 110)}
        </p>

        {/* Last Execution Info */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-navy-700/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            {task.last_execution ? (
              <>
                <StatusBadge status={task.last_execution.status} size="sm" />
                <span className="text-[11px] text-slate-400 dark:text-navy-300 truncate">
                  {formatRelativeTime(task.last_execution.started_at)}
                </span>
              </>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-navy-300">
                <Clock className="w-3 h-3" /> Never run
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons Footer */}
      <div className="mt-4 flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRun(task.id);
          }}
          disabled={isRunning}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 rounded-xl transition-all shadow-xs cursor-pointer"
          title="Run task immediately"
        >
          <Play className={`w-3.5 h-3.5 fill-current ${isRunning ? 'animate-spin' : ''}`} />
          <span>{isRunning ? 'Running...' : 'Run'}</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
          title="Delete task"
          aria-label="Delete task"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
