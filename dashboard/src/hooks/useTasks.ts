import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  runTask,
  toggleTask,
  getTaskExecutions,
} from '../api/tasks';
import type { TaskResponse, TaskCreate, TaskUpdate } from '../api/types';
import { DEFAULT_REFRESH_INTERVAL } from '../utils/constants';

export const TASK_KEYS = {
  all: ['tasks'] as const,
  lists: () => [...TASK_KEYS.all, 'list'] as const,
  list: (filters?: Record<string, any>) => [...TASK_KEYS.lists(), filters] as const,
  details: () => [...TASK_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...TASK_KEYS.details(), id] as const,
  executions: (id: string) => [...TASK_KEYS.detail(id), 'executions'] as const,
};

export function useTasks(filters?: { enabled?: boolean; search?: string; task_type?: string }) {
  return useQuery({
    queryKey: TASK_KEYS.list(filters),
    queryFn: () => getTasks(filters),
    refetchInterval: DEFAULT_REFRESH_INTERVAL,
    retry: 1,
  });
}

export function useTask(id?: string) {
  return useQuery({
    queryKey: TASK_KEYS.detail(id || ''),
    queryFn: () => getTaskById(id!),
    enabled: Boolean(id),
    refetchInterval: DEFAULT_REFRESH_INTERVAL,
    retry: 1,
  });
}

export function useTaskExecutions(id?: string, limit = 20) {
  return useQuery({
    queryKey: [...TASK_KEYS.executions(id || ''), limit],
    queryFn: () => getTaskExecutions(id!, limit),
    enabled: Boolean(id),
    refetchInterval: 10000,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (task: TaskCreate) => createTask(task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.all });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: TaskUpdate }) =>
      updateTask(id, updates),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.lists() });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.all });
    },
  });
}

export function useRunTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => runTask(id),
    onSuccess: (_, taskId) => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.detail(taskId) });
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
  });
}

export function useToggleTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      toggleTask(id, enabled),
    // Optimistic update
    onMutate: async ({ id, enabled }) => {
      await queryClient.cancelQueries({ queryKey: TASK_KEYS.all });
      const previousTasks = queryClient.getQueryData<TaskResponse[]>(TASK_KEYS.list());

      if (previousTasks) {
        queryClient.setQueryData<TaskResponse[]>(
          TASK_KEYS.list(),
          previousTasks.map((t) => (t.id === id ? { ...t, enabled } : t))
        );
      }

      const prevTask = queryClient.getQueryData<TaskResponse>(TASK_KEYS.detail(id));
      if (prevTask) {
        queryClient.setQueryData<TaskResponse>(TASK_KEYS.detail(id), {
          ...prevTask,
          enabled,
        });
      }

      return { previousTasks, prevTask };
    },
    onError: (_err, { id }, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(TASK_KEYS.list(), context.previousTasks);
      }
      if (context?.prevTask) {
        queryClient.setQueryData(TASK_KEYS.detail(id), context.prevTask);
      }
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.all });
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.detail(id) });
    },
  });
}
