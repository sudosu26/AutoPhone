import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getExecutionHistory, getExecutionById, cancelExecution } from '../api/history';
import type { HistoryFilterParams } from '../api/types';

export const HISTORY_KEYS = {
  all: ['history'] as const,
  list: (params: HistoryFilterParams) => [...HISTORY_KEYS.all, 'list', params] as const,
  detail: (id: string) => [...HISTORY_KEYS.all, 'detail', id] as const,
};

export function useHistory(params: HistoryFilterParams = {}) {
  return useQuery({
    queryKey: HISTORY_KEYS.list(params),
    queryFn: () => getExecutionHistory(params),
    refetchInterval: 10000,
    retry: 1,
  });
}

export function useExecution(id?: string) {
  return useQuery({
    queryKey: HISTORY_KEYS.detail(id || ''),
    queryFn: () => getExecutionById(id!),
    enabled: Boolean(id),
    refetchInterval: 5000,
  });
}

export function useCancelExecution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelExecution(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HISTORY_KEYS.all });
    },
  });
}
