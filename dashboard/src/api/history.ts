import { apiClient } from './client';
import type { ExecutionResponse, HistoryFilterParams, PaginatedResult } from './types';

export async function getExecutionHistory(
  params: HistoryFilterParams = {}
): Promise<PaginatedResult<ExecutionResponse>> {
  const { page = 1, page_size = 25, status, task_id, search } = params;

  const queryParams: Record<string, any> = {
    page,
    page_size,
    limit: page_size,
    offset: (page - 1) * page_size,
  };

  if (status && status !== 'all') {
    queryParams.status = status;
  }
  if (task_id) {
    queryParams.task_id = task_id;
  }
  if (search) {
    queryParams.search = search;
  }

  // Try /api/v1/history, fallback to /api/v1/executions
  try {
    const response = await apiClient.get<any, any>('/api/v1/history', { params: queryParams });
    if (Array.isArray(response)) {
      return {
        items: response,
        total: response.length,
        page,
        page_size,
        total_pages: Math.ceil(response.length / page_size) || 1,
      };
    }
    return {
      items: response.items || [],
      total: response.total ?? (response.items?.length || 0),
      page: response.page || page,
      page_size: response.page_size || page_size,
      total_pages: response.total_pages || Math.ceil((response.total || 0) / page_size) || 1,
    };
  } catch (firstErr) {
    try {
      const response = await apiClient.get<any, any>('/api/v1/executions', { params: queryParams });
      if (Array.isArray(response)) {
        return {
          items: response,
          total: response.length,
          page,
          page_size,
          total_pages: Math.ceil(response.length / page_size) || 1,
        };
      }
      return {
        items: response.items || [],
        total: response.total ?? (response.items?.length || 0),
        page: response.page || page,
        page_size: response.page_size || page_size,
        total_pages: response.total_pages || 1,
      };
    } catch {
      throw firstErr;
    }
  }
}

export async function getExecutionById(id: string): Promise<ExecutionResponse> {
  try {
    return await apiClient.get<any, ExecutionResponse>(`/api/v1/history/${id}`);
  } catch {
    return await apiClient.get<any, ExecutionResponse>(`/api/v1/executions/${id}`);
  }
}

export async function cancelExecution(id: string): Promise<ExecutionResponse> {
  try {
    return await apiClient.post<any, ExecutionResponse>(`/api/v1/executions/${id}/cancel`);
  } catch {
    return await apiClient.post<any, ExecutionResponse>(`/api/v1/history/${id}/cancel`);
  }
}
