import React, { useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useTask, useTaskExecutions, useRunTask, useToggleTask, useDeleteTask } from '../hooks/useTasks';
import { StatusBadge } from '../components/StatusBadge';
import { ExecutionTimeline } from '../components/ExecutionTimeline';
import { LogViewer } from '../components/LogViewer';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { getAdapterIcon, getAdapterLabel } from '../components/TaskCard';
import { formatDate, formatRelativeTime } from '../utils/format';
import type { ExecutionResponse } from '../api/types';
import {
  ArrowLeft,
  Play,
  Trash2,
  Calendar,
  Clock,
  Code2,
  Activity,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';

export const TaskDetail: React.FC = () => {
  const { params, goBack, navigate } = useNavigation();
  const taskId = params.id;

  const { data: task, isLoading: taskLoading, error: taskError, refetch: refetchTask } = useTask(taskId);
  const { data: executions, isLoading: execsLoading, refetch: refetchExecs } = useTaskExecutions(taskId, 30);

  const runMutation = useRunTask();
  const toggleMutation = useToggleTask();
  const deleteMutation = useDeleteTask();

  const [selectedExecution, setSelectedExecution] = useState<ExecutionResponse | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);

  const handleRefresh = () => {
    refetchTask();
    refetchExecs();
  };

  const handleRun = async () => {
    if (!taskId) return;
    try {
      const res = await runMutation.mutateAsync(taskId);
      if (res) setSelectedExecution(res);
      handleRefresh();
    } catch (err) {
      console.error('Failed to run task:', err);
    }
  };

  const handleToggle = () => {
    if (!task) return;
    toggleMutation.mutate({ id: task.id, enabled: !task.enabled });
  };

  const handleDelete = async () => {
    if (!task) return;
    try {
      await deleteMutation.mutateAsync(task.id);
      navigate('tasks');
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleCopyConfig = async () => {
    if (!task) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(task.config, null, 2));
      setCopiedConfig(true);
      setTimeout(() => setCopiedConfig(false), 2000);
    } catch {
      // ignore
    }
  };

  if (taskLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-slate-200 dark:bg-navy-800 rounded-xl w-32 animate-pulse" />
        <LoadingState count={1} variant="cards" />
      </div>
    );
  }

  if (taskError || !task) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <ErrorState
          title="Task not found"
          message="Could not load the requested task details. It may have been deleted or the ID is invalid."
          onRetry={handleRefresh}
        />
      </div>
    );
  }

  // Active execution for viewer: explicit selection or most recent from list or task
  const activeExecution =
    selectedExecution ||
    (executions && executions.length > 0 ? executions[0] : task.last_execution) ||
    null;

  return (
    <div className="space-y-6">
      {/* Top back & actions bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Tasks</span>
        </button>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleRefresh}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-xl transition-colors"
            title="Refresh details"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Toggle Enabled */}
          <button
            type="button"
            onClick={handleToggle}
            disabled={toggleMutation.isPending}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
              task.enabled
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                : 'bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-navy-700 hover:bg-slate-200 dark:hover:bg-navy-700'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${task.enabled ? 'bg-emerald-500' : 'bg-slate-400'}`}
            />
            <span>{task.enabled ? 'Task Enabled' : 'Task Disabled'}</span>
          </button>

          {/* Run Now Button */}
          <button
            type="button"
            onClick={handleRun}
            disabled={runMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-70 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${runMutation.isPending ? 'animate-spin' : ''}`} />
            <span>{runMutation.isPending ? 'Triggering...' : 'Run Now'}</span>
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40 rounded-xl transition-colors cursor-pointer"
            title="Delete task"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>

      {/* Main Task Header Card */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-navy-900 border border-slate-200 dark:border-navy-700 text-slate-700 dark:text-slate-300">
                {getAdapterIcon(task.adapter_type)}
                <span>{getAdapterLabel(task.adapter_type)}</span>
              </span>
              <span className="text-xs font-mono text-slate-400 dark:text-navy-300">
                ID: {task.id}
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {task.name}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
              {task.description || 'No description provided.'}
            </p>
          </div>

          {/* Last execution badge */}
          {task.last_execution && (
            <div className="sm:text-right shrink-0">
              <div className="text-xs text-slate-400 dark:text-navy-300 mb-1">Last Run Status</div>
              <StatusBadge status={task.last_execution.status} size="md" />
              <div className="text-[11px] text-slate-400 mt-1">
                {formatRelativeTime(task.last_execution.started_at)}
              </div>
            </div>
          )}
        </div>

        {/* Metadata info pills */}
        <div className="pt-4 border-t border-slate-100 dark:border-navy-700/60 flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Created: {formatDate(task.created_at)}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-slate-400" />
            <span>Updated: {formatRelativeTime(task.updated_at)}</span>
          </div>

          {task.schedules && task.schedules.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span className="font-mono text-blue-600 dark:text-blue-400">
                Cron: {task.schedules.map((s) => s.cron_expression).join(', ')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Config & Schedules + Execution Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Configuration & Schedule Detail (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Adapter Config Card */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                  Adapter Config
                </h3>
              </div>

              <button
                type="button"
                onClick={handleCopyConfig}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors cursor-pointer"
              >
                {copiedConfig ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy JSON</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 font-mono text-xs text-blue-300 overflow-x-auto max-h-72 border border-slate-800">
              <pre>{JSON.stringify(task.config, null, 2)}</pre>
            </div>
          </div>

          {/* Schedules Section */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-500" />
              <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                Schedules
              </h3>
            </div>

            {!task.schedules || task.schedules.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-navy-300">
                No automatic cron schedules attached to this task. It runs only when manually triggered or invoked by webhook.
              </p>
            ) : (
              <div className="space-y-3">
                {task.schedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-navy-700 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {schedule.cron_expression}
                      </div>
                      {schedule.next_run && (
                        <div className="text-[11px] text-slate-400">
                          Next run: {formatDate(schedule.next_run)}
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        schedule.enabled
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-200 dark:bg-navy-800 text-slate-500'
                      }`}
                    >
                      {schedule.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Execution History & Log Viewer (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Output Viewer for Active Execution */}
          {activeExecution && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Run Result ({formatRelativeTime(activeExecution.started_at)})
                </span>
                <StatusBadge status={activeExecution.status} size="sm" />
              </div>
              <LogViewer
                result={activeExecution.result}
                error={activeExecution.error_message}
              />
            </div>
          )}

          {/* Timeline of past runs */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                  Execution Timeline
                </h3>
              </div>
              <span className="text-xs text-slate-400 dark:text-navy-300">
                {executions?.length || 0} runs recorded
              </span>
            </div>

            {execsLoading ? (
              <div className="py-6 text-center text-xs text-slate-400 animate-pulse">
                Loading execution history...
              </div>
            ) : (
              <ExecutionTimeline
                executions={executions || []}
                selectedId={activeExecution?.id}
                onSelectExecution={(exec) => setSelectedExecution(exec)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Task"
        message={`Are you sure you want to permanently delete "${task.name}"? This action cannot be undone.`}
        confirmLabel="Confirm Delete"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};
