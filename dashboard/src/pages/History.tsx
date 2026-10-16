import React, { useState } from 'react';
import { useHistory, useCancelExecution } from '../hooks/useHistory';
import { useNavigation } from '../context/NavigationContext';
import { StatusBadge } from '../components/StatusBadge';
import { SearchFilter } from '../components/SearchFilter';
import { LogViewer } from '../components/LogViewer';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { formatDate, formatDuration, formatRelativeTime } from '../utils/format';
import type { ExecutionStatus } from '../api/types';
import {
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Ban,
  X,
  ExternalLink,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'running', label: 'Running' },
  { value: 'failed', label: 'Failed' },
  { value: 'pending', label: 'Pending' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const History: React.FC = () => {
  const { params, navigate } = useNavigation();
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [search, setSearch] = useState(params.search || '');
  const [statusFilter, setStatusFilter] = useState<string>(params.status || 'all');
  const [taskIdFilter, setTaskIdFilter] = useState<string | undefined>(params.task_id);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filterParams = {
    page,
    page_size: pageSize,
    status: (statusFilter !== 'all' ? statusFilter : undefined) as ExecutionStatus | undefined,
    task_id: taskIdFilter || undefined,
    search: search.trim() || undefined,
  };

  const { data, isLoading, error, refetch } = useHistory(filterParams);
  const cancelMutation = useCancelExecution();

  const executions = data?.items || [];
  const totalPages = data?.total_pages || 1;
  const total = data?.total ?? executions.length;

  const handleToggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleCancelRun = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await cancelMutation.mutateAsync(id);
      refetch();
    } catch (err) {
      console.error('Failed to cancel execution:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Execution History
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Audit logs and detailed output from automated and manual task executions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-navy-800 hover:bg-slate-50 dark:hover:bg-navy-700 border border-slate-200 dark:border-navy-700 rounded-xl transition-colors shadow-xs cursor-pointer w-fit"
          title="Refresh history"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Task ID filter tag if filtered by task */}
      {taskIdFilter && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300">
          <span>Filtering by task:</span>
          <span className="font-mono font-bold">{taskIdFilter}</span>
          <button
            type="button"
            onClick={() => setTaskIdFilter(undefined)}
            className="ml-auto p-1 hover:bg-blue-200/50 dark:hover:bg-blue-900/50 rounded-lg"
            title="Remove task filter"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search & Filters */}
      <SearchFilter
        search={search}
        onSearchChange={(s) => {
          setSearch(s);
          setPage(1);
        }}
        statusFilter={statusFilter}
        onStatusChange={(st) => {
          setStatusFilter(st);
          setPage(1);
        }}
        statusOptions={STATUS_OPTIONS}
        searchPlaceholder="Search by task name or execution ID..."
      />

      {/* Content Area */}
      {isLoading ? (
        <LoadingState count={8} variant="table" />
      ) : error ? (
        <ErrorState
          title="Failed to load execution logs"
          message="Could not retrieve history entries from the backend."
          onRetry={() => refetch()}
        />
      ) : executions.length === 0 ? (
        <EmptyState
          icon={<Clock className="w-8 h-8" />}
          title="No executions found"
          description={
            search || statusFilter !== 'all' || taskIdFilter
              ? 'No execution entries match your current filters. Try resetting the filters.'
              : 'Tasks have not been run yet. Execute tasks to record runtime output.'
          }
          actionLabel="View All Tasks"
          onAction={() => navigate('tasks')}
        />
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800/80 shadow-xs overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3.5 bg-slate-50 dark:bg-navy-900/80 border-b border-slate-200 dark:border-navy-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <div className="col-span-4">Task</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-3">Started At</div>
            <div className="col-span-2">Duration</div>
            <div className="col-span-1 text-right">Details</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-slate-100 dark:divide-navy-700/60">
            {executions.map((exec) => {
              const isExpanded = expandedId === exec.id;
              const isRunning = exec.status === 'running' || exec.status === 'pending';

              return (
                <div key={exec.id} className="transition-colors">
                  <div
                    onClick={() => handleToggleExpand(exec.id)}
                    className="p-4 sm:px-6 flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 items-start md:items-center hover:bg-slate-50/70 dark:hover:bg-navy-700/30 cursor-pointer"
                  >
                    {/* Task Column */}
                    <div className="md:col-span-4 min-w-0 w-full">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                          {exec.task_name || 'Unnamed Task'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('task-detail', { id: exec.task_id });
                          }}
                          className="text-slate-400 hover:text-blue-500 p-0.5 rounded"
                          title="Go to task"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 dark:text-navy-300 truncate">
                        ID: {exec.id}
                      </div>
                    </div>

                    {/* Status Column */}
                    <div className="md:col-span-2">
                      <StatusBadge status={exec.status} size="sm" />
                    </div>

                    {/* Started At Column */}
                    <div className="md:col-span-3 text-xs text-slate-600 dark:text-slate-300">
                      <div title={formatDate(exec.started_at)}>
                        {formatRelativeTime(exec.started_at)}
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-navy-300">
                        {formatDate(exec.started_at)}
                      </div>
                    </div>

                    {/* Duration Column */}
                    <div className="md:col-span-2 text-xs font-mono text-slate-600 dark:text-slate-300">
                      {formatDuration(exec.duration_ms)}
                    </div>

                    {/* Actions / Expand Toggle Column */}
                    <div className="md:col-span-1 flex items-center justify-end gap-2 w-full md:w-auto">
                      {isRunning && (
                        <button
                          type="button"
                          onClick={(e) => handleCancelRun(e, exec.id)}
                          disabled={cancelMutation.isPending}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                          title="Cancel running task"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}

                      <div className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="px-4 sm:px-6 pb-5 pt-2 bg-slate-50/50 dark:bg-navy-900/40 border-t border-slate-100 dark:border-navy-700/60 space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Execution Output & Diagnostic Dump</span>
                        {exec.completed_at && (
                          <span>Completed: {formatDate(exec.completed_at)}</span>
                        )}
                      </div>

                      <LogViewer
                        result={exec.result}
                        error={exec.error_message}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-slate-50 dark:bg-navy-900/60 border-t border-slate-200 dark:border-navy-700 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Page <span className="font-semibold text-slate-800 dark:text-white">{page}</span> of{' '}
                <span className="font-semibold text-slate-800 dark:text-white">{totalPages}</span> (
                {total} total records)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors cursor-pointer"
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors cursor-pointer"
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
