export type AdapterType = 'shell' | 'http' | 'app_launch' | 'file_ops';

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  request_id?: string;
  timestamp: string;
}

export interface ScheduleResponse {
  id: string;
  task_id: string;
  cron_expression: string;
  next_run?: string | null;
  enabled: boolean;
  created_at: string;
}

export interface ScheduleCreate {
  cron_expression: string;
  enabled?: boolean;
}

export interface TaskResponse {
  id: string;
  name: string;
  description: string;
  task_type: string;
  adapter_type: AdapterType;
  config: Record<string, any>;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  schedules: ScheduleResponse[];
  last_execution?: ExecutionResponse | null;
}

export interface TaskCreate {
  name: string;
  description?: string;
  task_type?: string;
  adapter_type: AdapterType;
  config: Record<string, any>;
  enabled?: boolean;
  cron_expression?: string;
  timeout_seconds?: number;
  retries?: number;
}

export interface TaskUpdate {
  name?: string;
  description?: string;
  task_type?: string;
  adapter_type?: AdapterType;
  config?: Record<string, any>;
  enabled?: boolean;
}

export interface ExecutionResponse {
  id: string;
  task_id: string;
  task_name?: string;
  status: ExecutionStatus;
  started_at: string;
  completed_at?: string | null;
  result?: {
    exit_code?: number;
    stdout?: string;
    stderr?: string;
    status_code?: number;
    headers?: Record<string, string>;
    response?: any;
    [key: string]: any;
  } | null;
  error_message?: string | null;
  duration_ms?: number | null;
}

export interface DeviceStatusResponse {
  id?: number;
  timestamp: string;
  battery_level?: number | null;
  is_charging: boolean;
  wifi_connected: boolean;
  tailscale_connected: boolean;
  uptime_seconds: number;
}

export interface SystemDiagnosticsResponse {
  os: string;
  python_version: string;
  platform: string;
  cpu_count?: number;
  uptime_seconds: number;
  memory: {
    total?: number;
    available?: number;
    used?: number;
    percent?: number;
    [key: string]: any;
  };
  disk: {
    total?: number;
    used?: number;
    free?: number;
    percent?: number;
    [key: string]: any;
  };
  engine: {
    status?: string;
    active_workers?: number;
    queue_size?: number;
    tasks_count?: number;
    [key: string]: any;
  };
  scheduler: {
    status?: string;
    jobs_count?: number;
    running?: boolean;
    [key: string]: any;
  };
  database: {
    status?: string;
    size_bytes?: number;
    tables?: string[];
    [key: string]: any;
  };
}

export interface ConnectivityTestResult {
  service: 'backend' | 'tailscale' | 'ssh' | 'termux';
  name: string;
  status: 'connected' | 'error' | 'warning' | 'pending';
  latency_ms?: number;
  message?: string;
  details?: Record<string, any>;
}

export interface AuditLogResponse {
  id: number;
  timestamp: string;
  action: string;
  actor: string;
  resource_type: string;
  resource_id?: string | null;
  details?: Record<string, any> | null;
  ip_address?: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface HistoryFilterParams {
  page?: number;
  page_size?: number;
  status?: ExecutionStatus | 'all';
  task_id?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
