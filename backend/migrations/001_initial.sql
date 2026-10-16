-- PhonePilot Initial Database Schema

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    task_type TEXT NOT NULL,
    adapter_type TEXT NOT NULL,
    config TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS task_schedules (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    cron_expression TEXT NOT NULL,
    next_run TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS execution_records (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    status TEXT NOT NULL, -- pending, running, completed, failed, cancelled
    started_at TEXT NOT NULL,
    completed_at TEXT,
    result TEXT,
    error_message TEXT,
    duration_ms INTEGER
);

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    action TEXT NOT NULL,
    actor TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details TEXT,
    ip_address TEXT
);

CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS device_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    battery_level REAL,
    is_charging INTEGER DEFAULT 0,
    wifi_connected INTEGER DEFAULT 0,
    tailscale_connected INTEGER DEFAULT 0,
    uptime_seconds INTEGER DEFAULT 0
);

-- Useful indexes for querying
CREATE INDEX IF NOT EXISTS idx_tasks_enabled ON tasks(enabled);
CREATE INDEX IF NOT EXISTS idx_schedules_task_id ON task_schedules(task_id);
CREATE INDEX IF NOT EXISTS idx_executions_task_id ON execution_records(task_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON execution_records(status);
CREATE INDEX IF NOT EXISTS idx_executions_started_at ON execution_records(started_at);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_device_status_timestamp ON device_status(timestamp);
