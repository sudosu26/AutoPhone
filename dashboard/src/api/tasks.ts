import { apiClient } from './client';
import type { TaskResponse, TaskCreate, TaskUpdate, ExecutionResponse } from './types';

export async function getTasks(params?: {
  enabled?: boolean;
  search?: string;
  task_type?: string;
}): Promise<TaskResponse[]> {
  const response = await apiClient.get<any, TaskResponse[]>('/api/v1/tasks', { params });
  return Array.isArray(response) ? response : (response as any)?.items || [];
}

export async function getTaskById(id: string): Promise<TaskResponse> {
  const response = await apiClient.get<any, TaskResponse>(`/api/v1/tasks/${id}`);
  return response;
}

export async function createTask(task: TaskCreate): Promise<TaskResponse> {
  const response = await apiClient.post<any, TaskResponse>('/api/v1/tasks', task);
  return response;
}

export async function updateTask(id: string, updates: TaskUpdate): Promise<TaskResponse> {
  const response = await apiClient.put<any, TaskResponse>(`/api/v1/tasks/${id}`, updates);
  return response;
}

export async function deleteTask(id: string): Promise<{ success: boolean }> {
  const response = await apiClient.delete<any, any>(`/api/v1/tasks/${id}`);
  return response || { success: true };
}

export async function runTask(id: string): Promise<ExecutionResponse> {
  const response = await apiClient.post<any, ExecutionResponse>(`/api/v1/tasks/${id}/run`);
  return response;
}

export async function toggleTask(id: string, enabled: boolean): Promise<TaskResponse> {
  // Can be a PATCH or PUT update
  try {
    const response = await apiClient.patch<any, TaskResponse>(`/api/v1/tasks/${id}`, { enabled });
    return response;
  } catch {
    const response = await apiClient.put<any, TaskResponse>(`/api/v1/tasks/${id}`, { enabled });
    return response;
  }
}

export async function getTaskExecutions(id: string, limit = 20): Promise<ExecutionResponse[]> {
  try {
    const response = await apiClient.get<any, ExecutionResponse[]>(`/api/v1/tasks/${id}/executions`, {
      params: { limit },
    });
    return Array.isArray(response) ? response : (response as any)?.items || [];
  } catch {
    // Fallback query by task_id on history
    const response = await apiClient.get<any, any>('/api/v1/history', {
      params: { task_id: id, limit },
    });
    return Array.isArray(response) ? response : response?.items || [];
  }
}
