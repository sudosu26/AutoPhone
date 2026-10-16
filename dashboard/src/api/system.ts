import { apiClient } from './client';
import type { SystemDiagnosticsResponse, ConnectivityTestResult, AuditLogResponse } from './types';

export async function getDiagnostics(): Promise<SystemDiagnosticsResponse> {
  try {
    return await apiClient.get<any, SystemDiagnosticsResponse>('/api/v1/system/diagnostics');
  } catch {
    return await apiClient.get<any, SystemDiagnosticsResponse>('/api/v1/diagnostics');
  }
}

export async function getHealth(): Promise<{ status: string; uptime?: number; version?: string; timestamp?: string }> {
  try {
    return await apiClient.get<any, any>('/api/v1/system/health');
  } catch {
    try {
      return await apiClient.get<any, any>('/health');
    } catch {
      return await apiClient.get<any, any>('/api/v1/health');
    }
  }
}

export async function getAuditLogs(limit = 50): Promise<AuditLogResponse[]> {
  try {
    const res = await apiClient.get<any, any>('/api/v1/system/audit', { params: { limit } });
    return Array.isArray(res) ? res : res?.items || [];
  } catch {
    const res = await apiClient.get<any, any>('/api/v1/audit', { params: { limit } });
    return Array.isArray(res) ? res : res?.items || [];
  }
}

export async function testConnectivity(service: 'backend' | 'tailscale' | 'ssh' | 'termux'): Promise<ConnectivityTestResult> {
  const start = performance.now();
  try {
    const res = await apiClient.post<any, ConnectivityTestResult>('/api/v1/system/test-connectivity', { service });
    return res;
  } catch (err: any) {
    const latency_ms = Math.round(performance.now() - start);
    if (service === 'backend') {
      try {
        await apiClient.get('/api/v1/system/health');
        return {
          service: 'backend',
          name: 'FastAPI Backend',
          status: 'connected',
          latency_ms,
          message: 'Backend server is responsive',
        };
      } catch (backendErr: any) {
        return {
          service: 'backend',
          name: 'FastAPI Backend',
          status: 'error',
          latency_ms,
          message: backendErr.message || 'Unable to connect to backend',
        };
      }
    }
    
    // For other services, return informative failure or simulation
    return {
      service,
      name: service === 'tailscale' ? 'Tailscale Mesh VPN' : service === 'ssh' ? 'SSH Daemon' : 'Termux Runtime',
      status: 'error',
      latency_ms,
      message: err.message || `Failed to probe ${service}`,
    };
  }
}

export async function testAllConnectivity(): Promise<ConnectivityTestResult[]> {
  try {
    const res = await apiClient.get<any, ConnectivityTestResult[]>('/api/v1/system/connectivity');
    if (Array.isArray(res)) return res;
  } catch {
    // Probe manually
  }

  const services: Array<'backend' | 'tailscale' | 'ssh' | 'termux'> = ['backend', 'tailscale', 'ssh', 'termux'];
  const results = await Promise.allSettled(services.map((s) => testConnectivity(s)));
  
  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    return {
      service: services[i],
      name: services[i].toUpperCase(),
      status: 'error',
      message: 'Probe request failed',
    };
  });
}
