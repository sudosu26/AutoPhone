import React, { useState, useMemo } from 'react';
import { useTasks, useRunTask, useToggleTask, useDeleteTask } from '../hooks/useTasks';
import { useNavigation } from '../context/NavigationContext';
import { TaskCard } from '../components/TaskCard';
import { SearchFilter } from '../components/SearchFilter';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Plus, RefreshCw, Layers } from 'lucide-react';

const TASK_STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'enabled', label: 'Enabled Only' },
  { value: 'disabled', label: 'Disabled Only' },
  { value: 'completed', label: 'Last Run Succeeded' },
  { value: 'failed', label: 'Last Run Failed' },
  { value: 'running', label: 'Currently Running' },
];

export const Tasks: React.FC = () => {
  const { navigate } = useNavigation();
  const { data: tasks, isLoading, error, refetch } = useTasks();
  const runMutation = useRunTask();
  const toggleMutation = useToggleTask();
  const deleteMutation = useDeleteTask();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];

    return tasks.filter((task) => {
      // Search term
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = task.name.toLowerCase().includes(query);
        const matchesDesc = (task.description || '').toLowerCase().includes(query);
        if (!matchesName && !matchesDesc) return false;
      }

      // Type filter
      if (typeFilter !== 'all' && task.adapter_type !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === 'enabled' && !task.enabled) return false;
      if (statusFilter === 'disabled' && task.enabled) return false;
      if (statusFilter === 'completed' && task.last_execution?.status !== 'completed') return false;
      if (statusFilter === 'failed' && task.last_execution?.status !== 'failed') return false;
      if (statusFilter === 'running' && task.last_execution?.status !== 'running') return false;

      return true;
    });
  }, [tasks, search, typeFilter, statusFilter]);

  const handleRun = async (id: string) => {
    try {
      setRunningTaskId(id);
      await runMutation.mutateAsync(id);
    } catch (err) {
      console.error('Failed to trigger task execution:', err);
    } finally {
      setRunningTaskId(null);
    }
  };

  const handleToggle = (id: string, enabled: boolean) => {
    toggleMutation.mutate({ id, enabled });
  };

  const handleDeleteConfirm = async () => {
    if (!taskToDelete) return;
    try {
      await deleteMutation.mutateAsync(taskToDelete);
      setTaskToDelete(null);
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Automation Tasks
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Configure, trigger, and inspect automated workflows on your phone.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-navy-800 hover:bg-slate-50 dark:hover:bg-navy-700 border border-slate-200 dark:border-navy-700 rounded-xl transition-colors shadow-xs cursor-pointer"
            title="Refresh task list"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('task-create')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <SearchFilter
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        statusOptions={TASK_STATUS_OPTIONS}
        searchPlaceholder="Search tasks by name or description..."
      />

      {/* Main Content Area */}
      {isLoading ? (
        <LoadingState count={6} variant="cards" />
      ) : error ? (
        <ErrorState
          title="Could not load tasks"
          message="Failed to retrieve automation tasks from the PhonePilot server."
          onRetry={() => refetch()}
        />
      ) : tasks?.length === 0 ? (
        <EmptyState
          icon={<Layers className="w-8 h-8" />}
          title="No tasks created yet"
          description="Build your first automated task for shell execution, HTTP requests, or app launches."
          actionLabel="Create Task"
          onAction={() => navigate('task-create')}
        />
      ) : filteredTasks.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800/50">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            No tasks match your filter criteria. Try resetting filters or changing the search query.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onRun={handleRun}
              onToggle={handleToggle}
              onDelete={(id) => setTaskToDelete(id)}
              onClick={(id) => navigate('task-detail', { id })}
              isRunning={runningTaskId === task.id}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(taskToDelete)}
        title="Delete Task"
        message="Are you sure you want to delete this task? All execution histories and schedules attached will be affected."
        confirmLabel="Delete Task"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setTaskToDelete(null)}
      />
    </div>
  );
};
