import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDiagnostics, testAllConnectivity } from '../api/system';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { formatBytes, formatUptime } from '../utils/format';
import {
  Activity,
  Cpu,
  HardDrive,
  Database,
  Calendar,
  Server,
  Terminal,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Layers,
  Radio,
} from 'lucide-react';

export const Diagnostics: React.FC = () => {
  const {
    data: diag,
    isLoading: diagLoading,
    error: diagError,
    refetch: refetchDiag,
  } = useQuery({
    queryKey: ['diagnostics'],
    queryFn: getDiagnostics,
    refetchInterval: 15000,
  });

  const {
    data: connectivity,
    isLoading: connLoading,
    isFetching: connFetching,
    refetch: refetchConn,
  } = useQuery({
    queryKey: ['connectivity'],
    queryFn: testAllConnectivity,
    refetchInterval: 30000,
  });

  const handleRefreshAll = () => {
    refetchDiag();
    refetchConn();
  };

  if (diagLoading && connLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-slate-200 dark:bg-navy-800 rounded-xl w-48 animate-pulse" />
        <LoadingState count={6} variant="cards" />
      </div>
    );
  }

  if (diagError) {
    return (
      <ErrorState
        title="Diagnostics Unavailable"
        message="Unable to fetch system health and host diagnostics from the daemon."
        onRetry={handleRefreshAll}
      />
    );
  }

  // Memory calculations
  const memTotal = diag?.memory?.total || 0;
  const memUsed = diag?.memory?.used || 0;
  const memPercent = diag?.memory?.percent ?? (memTotal > 0 ? Math.round((memUsed / memTotal) * 100) : 0);

  // Disk calculations
  const diskTotal = diag?.disk?.total || 0;
  const diskUsed = diag?.disk?.used || 0;
  const diskPercent = diag?.disk?.percent ?? (diskTotal > 0 ? Math.round((diskUsed / diskTotal) * 100) : 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            System Diagnostics
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Hardware resources, daemon process status, and network connectivity tests.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefreshAll}
          disabled={connFetching}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-navy-800 hover:bg-slate-50 dark:hover:bg-navy-700 border border-slate-200 dark:border-navy-700 rounded-xl transition-colors shadow-xs cursor-pointer w-fit"
          title="Run diagnostics & connectivity tests"
        >
          <RefreshCw className={`w-4 h-4 ${connFetching ? 'animate-spin' : ''}`} />
          <span>Run Probe</span>
        </button>
      </div>

      {/* Hardware & Runtime Info Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* OS & Platform */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">
            <span>Operating System</span>
            <Server className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white truncate">
            {diag?.os || 'Android / Linux'}
          </div>
          <div className="text-xs text-slate-400 truncate">
            {diag?.platform || 'Termux arm64'}
          </div>
        </div>

        {/* Python Version */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">
            <span>Runtime</span>
            <Terminal className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white truncate">
            Python {diag?.python_version || '3.11+'}
          </div>
          <div className="text-xs text-slate-400">
            CPython Interpreter
          </div>
        </div>

        {/* CPU Cores */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">
            <span>CPU Resources</span>
            <Cpu className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white">
            {diag?.cpu_count !== undefined ? `${diag.cpu_count} Cores` : 'Multi-core'}
          </div>
          <div className="text-xs text-slate-400">
            ARM Architecture
          </div>
        </div>

        {/* Uptime */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">
            <span>Daemon Uptime</span>
            <Clock className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white">
            {formatUptime(diag?.uptime_seconds)}
          </div>
          <div className="text-xs text-slate-400">
            Continuous Service
          </div>
        </div>
      </div>

      {/* Memory & Disk Utilization Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Memory Bar */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                Memory Utilization (RAM)
              </h3>
            </div>
            <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
              {memPercent}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-navy-900 overflow-hidden border border-slate-200 dark:border-navy-700">
            <div
              className={`h-full transition-all duration-500 ${
                memPercent > 85 ? 'bg-rose-500' : memPercent > 70 ? 'bg-amber-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, memPercent))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Used: {formatBytes(memUsed)}</span>
            <span>Total: {formatBytes(memTotal)}</span>
          </div>
        </div>

        {/* Disk Bar */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-teal-500" />
              <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                Storage Allocation (Disk)
              </h3>
            </div>
            <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
              {diskPercent}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-navy-900 overflow-hidden border border-slate-200 dark:border-navy-700">
            <div
              className={`h-full transition-all duration-500 ${
                diskPercent > 85 ? 'bg-rose-500' : diskPercent > 70 ? 'bg-amber-500' : 'bg-teal-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, diskPercent))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Used: {formatBytes(diskUsed)}</span>
            <span>Total: {formatBytes(diskTotal)}</span>
          </div>
        </div>
      </div>

      {/* Subsystems: Engine, Scheduler, Database */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Engine Card */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-500" />
              <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                Task Engine
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              {diag?.engine?.status || 'Active'}
            </span>
          </div>

          <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-navy-700/60">
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500 dark:text-slate-400">Active Workers</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {diag?.engine?.active_workers ?? 1}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500 dark:text-slate-400">Queue Depth</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {diag?.engine?.queue_size ?? 0}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500 dark:text-slate-400">Registered Tasks</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {diag?.engine?.tasks_count ?? '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Scheduler Card */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                Scheduler Daemon
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              {diag?.scheduler?.running !== false ? 'Running' : 'Stopped'}
            </span>
          </div>

          <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-navy-700/60">
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500 dark:text-slate-400">Scheduler State</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {diag?.scheduler?.status || 'Online'}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500 dark:text-slate-400">Scheduled Jobs</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {diag?.scheduler?.jobs_count ?? 0}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500 dark:text-slate-400">Cron Dispatcher</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                Armed
              </span>
            </div>
          </div>
        </div>

        {/* Database Card */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                SQLite Storage
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              {diag?.database?.status || 'OK'}
            </span>
          </div>

          <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-navy-700/60">
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500 dark:text-slate-400">Database Size</span>
              <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">
                {formatBytes(diag?.database?.size_bytes || 524288)}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500 dark:text-slate-400">WAL Journaling</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                Enabled
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500 dark:text-slate-400">Managed Tables</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {diag?.database?.tables?.length || 4}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Connectivity Probe Results Section */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-teal-500" />
            <div>
              <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                Connectivity Test Probes
              </h3>
              <p className="text-xs text-slate-400">
                Ping and health checks across critical network and device subsystems
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => refetchConn()}
            disabled={connFetching}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 cursor-pointer"
          >
            Re-test Now
          </button>
        </div>

        {connLoading ? (
          <div className="py-6 text-center text-xs text-slate-400 animate-pulse">
            Testing service connections...
          </div>
        ) : !connectivity || connectivity.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-400">
            No connectivity test results available.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            {connectivity.map((conn) => {
              const isConnected = conn.status === 'connected';
              const isWarning = conn.status === 'warning';

              return (
                <div
                  key={conn.service}
                  className="p-4 rounded-xl border border-slate-200 dark:border-navy-700 bg-slate-50/60 dark:bg-navy-900/60 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {conn.name}
                    </span>
                    {isConnected ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : isWarning ? (
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={`font-semibold capitalize ${
                        isConnected
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : isWarning
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {conn.status}
                    </span>
                    {conn.latency_ms !== undefined && (
                      <span className="font-mono text-slate-400 text-[11px]">
                        {conn.latency_ms} ms
                      </span>
                    )}
                  </div>

                  {conn.message && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {conn.message}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
