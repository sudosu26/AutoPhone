export const APP_NAME = 'PhonePilot';
export const APP_VERSION = '1.0.0';

export const STORAGE_KEYS = {
  API_KEY: 'phonepilot_api_key',
  BACKEND_URL: 'phonepilot_backend_url',
  THEME: 'phonepilot_theme',
  REFRESH_INTERVAL: 'phonepilot_refresh_interval',
  COLLAPSED_SIDEBAR: 'phonepilot_sidebar_collapsed',
} as const;

export const DEFAULT_BACKEND_URL = 
  import.meta.env.VITE_BACKEND_URL || 'http://localhost:8265';

export const DEFAULT_REFRESH_INTERVAL = 30000; // 30 seconds

export const ADAPTER_TYPES = [
  { value: 'shell', label: 'Shell Command', description: 'Execute bash/termux scripts and commands' },
  { value: 'http', label: 'HTTP Webhook', description: 'Send automated HTTP requests with payloads' },
  { value: 'app_launch', label: 'App Launcher', description: 'Launch Android packages and monitor activity' },
  { value: 'file_ops', label: 'File Operations', description: 'Automate filesystem backup, rotate, or cleanup' },
] as const;

export const EXECUTION_STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    dot: 'bg-amber-400',
  },
  running: {
    label: 'Running',
    color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    dot: 'bg-blue-400 animate-ping',
  },
  completed: {
    label: 'Success',
    color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  failed: {
    label: 'Failed',
    color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    dot: 'bg-rose-400',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
    dot: 'bg-slate-400',
  },
} as const;
