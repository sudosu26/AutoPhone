import { apiClient } from './client';
import type { DeviceStatusResponse } from './types';

export async function getDeviceStatus(): Promise<DeviceStatusResponse> {
  const response = await apiClient.get<any, DeviceStatusResponse>('/api/v1/device/status');
  return response;
}

export async function refreshDeviceStatus(): Promise<DeviceStatusResponse> {
  try {
    const response = await apiClient.post<any, DeviceStatusResponse>('/api/v1/device/refresh');
    return response;
  } catch {
    return getDeviceStatus();
  }
}

export async function pingDevice(): Promise<{ alive: boolean; latency_ms: number }> {
  const start = performance.now();
  try {
    await apiClient.get('/api/v1/device/ping');
    const latency_ms = Math.round(performance.now() - start);
    return { alive: true, latency_ms };
  } catch {
    // Try pinging status
    try {
      await apiClient.get('/api/v1/device/status');
      return { alive: true, latency_ms: Math.round(performance.now() - start) };
    } catch {
      return { alive: false, latency_ms: -1 };
    }
  }
}
