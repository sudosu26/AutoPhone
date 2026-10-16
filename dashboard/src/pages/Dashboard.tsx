import React from 'react';
import { useTasks } from '../hooks/useTasks';
import { useDeviceStatus, useRefreshDevice } from '../hooks/useDevice';
import { useHistory } from '../hooks/useHistory';
import { useNavigation } from '../context/NavigationContext';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { formatRelativeTime, formatDuration, formatUptime } from '../utils/format';
import {
  ListTodo,
  CheckCircle2,
  Clock,
  TrendingUp,
  BatteryCharging,
  Battery,
  Wifi,
  WifiOff,
  ShieldCheck,
  ShieldAlert,
  Server,
  Plus,
  ArrowRight,
  RefreshCw,
  Play,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { navigate } = useNavigation();
  const { data: tasks, isLoading: tasksLoading, error: tasksError, refetch: refetchTasks } = useTasks();
  const { data: device, isLoading: deviceLoading, error: deviceError, refetch: refetchDevice } = useDeviceStatus();
  const { data: history, isLoading: historyLoading, error: historyError, refetch: refetchHistory } = useHistory({ page_size: 5 });
  const refreshDeviceMutation = useRefreshDevice();

  const handleRefreshAll = () => {
    refetchTasks();
    refetchDevice();
    refetchHistory();
    refreshDeviceMutation.mutate();
  };

  const isLoading = tasksLoading && deviceLoading && historyLoading;
  const hasFatalError = Boolean(tasksError && deviceError && historyError);

  if (hasFatalError) {
    return (
      <ErrorState
        title="Failed to load dashboard overview"
        message="Unable to communicate with the PhonePilot backend. Please check connectivity or backend status."
        onRetry={handleRefreshAll}
      />
    );
  }

  // Stats computation
  const totalTasks = tasks?.length || 0;
  const activeTasks = tasks?.filter((t) => t.enabled).length || 0;
  
  const recentRuns = history?.items || [];
  const completedRuns = recentRuns.filter((r) => r.status === 'completed').length;
  const totalEvaluatedRuns = recentRuns.filter((r) => r.status === 'completed' || r.status === 'failed').length;
  const successRate = totalEvaluatedRuns > 0 ? Math.round((completedRuns / totalEvaluatedRuns) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Dashboard Overview
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Real-time status of your automation tasks and Android host device.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={refreshDeviceMutation.isPending}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-navy-800 hover:bg-slate-50 dark:hover:bg-navy-700 border border-slate-200 dark:border-navy-700 rounded-xl transition-colors shadow-xs cursor-pointer"
            title="Refresh dashboard data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshDeviceMutation.isPending ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('task-create')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* Top 4 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Tasks */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Tasks
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ListTodo className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              {tasksLoading ? '...' : totalTasks}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">configured</span>
          </div>
        </div>

        {/* Active Tasks */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Active Tasks
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              {tasksLoading ? '...' : activeTasks}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400">
              {totalTasks > 0 ? `${Math.round((activeTasks / totalTasks) * 100)}% enabled` : '0%'}
            </span>
          </div>
        </div>

        {/* Total Executions */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Recent Runs
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              {historyLoading ? '...' : history?.total ?? recentRuns.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">executions</span>
          </div>
        </div>

        {/* Success Rate */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Success Rate
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              {historyLoading ? '...' : `${successRate}%`}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">recent pass</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Device Status & Recent Executions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Device Status Card (1 column on lg) */}
        <div className="lg:col-span-1 rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-navy-700/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                    Android Host Device
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-navy-300">
                    Target environment status
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => refreshDeviceMutation.mutate()}
                disabled={refreshDeviceMutation.isPending}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors"
                title="Refresh device state"
              >
                <RefreshCw className={`w-4 h-4 ${refreshDeviceMutation.isPending ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {deviceLoading ? (
              <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
                Probing device metrics...
              </div>
            ) : deviceError ? (
              <div className="py-6 text-center text-xs text-rose-500">
                Failed to reach Android daemon.
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {/* Battery Level */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-navy-900 border border-slate-200/60 dark:border-navy-700/60">
                  <div className="flex items-center gap-3">
                    {device?.is_charging ? (
                      <BatteryCharging className="w-5 h-5 text-emerald-500" />
                    ) : device?.is_charging === false ? (
                      <Battery className="w-5 h-5 text-slate-400" />
                    ) : (
                      <Battery className="w-5 h-5 text-slate-300 dark:text-slate-500" />
                    )}
                    <div>
                      <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Battery
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {device?.is_charging == null
                          ? 'Unknown'
                          : device.is_charging
                            ? 'Charging'
                            : 'On Battery'}
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {device?.battery_level !== undefined && device?.battery_level !== null
                      ? `${device.battery_level}%`
                      : 'N/A'}
                  </span>
                </div>

                {/* WiFi Connectivity */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-navy-900 border border-slate-200/60 dark:border-navy-700/60">
                  <div className="flex items-center gap-3">
                    {device?.wifi_connected ? (
                      <Wifi className="w-5 h-5 text-emerald-500" />
                    ) : device?.wifi_connected === false ? (
                      <WifiOff className="w-5 h-5 text-rose-500" />
                    ) : (
                      <Wifi className="w-5 h-5 text-slate-300 dark:text-slate-500" />
                    )}
                    <div>
                      <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Wi-Fi Network
                      </div>
                      <div className="text-[11px] text-slate-400">Local Area Network</div>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    device?.wifi_connected == null
                      ? 'bg-slate-500/15 text-slate-600 dark:text-slate-400'
                      : device.wifi_connected
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {device?.wifi_connected == null
                    ? 'Unknown'
                    : device.wifi_connected
                      ? 'Connected'
                      : 'Disconnected'}
                  </span>
                </div>

                {/* Tailscale Mesh VPN */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-navy-900 border border-slate-200/60 dark:border-navy-700/60">
                  <div className="flex items-center gap-3">
                    {device?.tailscale_connected ? (
                      <ShieldCheck className="w-5 h-5 text-teal-500" />
                    ) : device?.tailscale_connected === false ? (
                      <ShieldAlert className="w-5 h-5 text-amber-500" />
                    ) : (
                      <ShieldAlert className="w-5 h-5 text-slate-300 dark:text-slate-500" />
                    )}
                    <div>
                      <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Tailscale VPN
                      </div>
                      <div className="text-[11px] text-slate-400">Encrypted Mesh Tunnel</div>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    device?.tailscale_connected == null
                      ? 'bg-slate-500/15 text-slate-600 dark:text-slate-400'
                      : device.tailscale_connected
                        ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {device?.tailscale_connected == null
                    ? 'Unknown'
                    : device.tailscale_connected
                      ? 'Active'
                      : 'Standby'}
                  </span>
                </div>

                {/* Device Uptime */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-navy-900 border border-slate-200/60 dark:border-navy-700/60">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <div>
                      <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Device Uptime
                      </div>
                      <div className="text-[11px] text-slate-400">Continuous runtime</div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
                    {formatUptime(device?.uptime_seconds)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-navy-700/60">
            <button
              type="button"
              onClick={() => navigate('diagnostics')}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-xl transition-colors cursor-pointer"
            >
              <span>View System Diagnostics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Recent Executions (2 columns on lg) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-navy-700/60">
              <div>
                <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                  Recent Executions
                </h3>
                <p className="text-xs text-slate-400 dark:text-navy-300">
                  Latest automation triggers and results
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate('history')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 cursor-pointer"
              >
                <span>Full History</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {historyLoading ? (
              <div className="py-8">
                <LoadingState count={3} variant="rows" />
              </div>
            ) : recentRuns.length === 0 ? (
              <div className="py-8">
                <EmptyState
                  title="No execution runs yet"
                  description="Run your first task to see execution output and diagnostics here."
                  actionLabel="Go to Tasks"
                  onAction={() => navigate('tasks')}
                />
              </div>
            ) : (
              <div className="mt-4 divide-y divide-slate-100 dark:divide-navy-700/60">
                {recentRuns.map((run) => (
                  <div
                    key={run.id}
                    onClick={() => navigate('history', { task_id: run.task_id })}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-navy-700/40 px-2 rounded-xl transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <StatusBadge status={run.status} size="sm" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                          {run.task_name || `Task #${run.task_id.slice(0, 8)}`}
                        </div>
                        <div className="text-xs text-slate-400 dark:text-navy-300">
                          {formatRelativeTime(run.started_at)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        {formatDuration(run.duration_ms)}
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-navy-700/60 flex items-center justify-between">
            <span className="text-xs text-slate-400 dark:text-navy-300">
              Showing last {recentRuns.length} executions
            </span>
            <button
              type="button"
              onClick={() => navigate('tasks')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Launch a Task</span>
            </button>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="py-4 text-center text-xs text-slate-400 animate-pulse">
          Syncing with backend engine...
        </div>
      )}
    </div>
  );
};
