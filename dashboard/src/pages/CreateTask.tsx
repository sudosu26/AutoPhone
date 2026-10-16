import React, { useState } from 'react';
import { useCreateTask } from '../hooks/useTasks';
import { useNavigation } from '../context/NavigationContext';
import { ADAPTER_TYPES } from '../utils/constants';
import type { AdapterType } from '../api/types';
import { getAdapterIcon } from '../components/TaskCard';
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export const CreateTask: React.FC = () => {
  const { goBack, navigate } = useNavigation();
  const createTaskMutation = useCreateTask();

  // General fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [adapterType, setAdapterType] = useState<AdapterType>('shell');
  const [cronExpression, setCronExpression] = useState('');
  const [timeoutSeconds, setTimeoutSeconds] = useState<number>(60);
  const [retries, setRetries] = useState<number>(0);
  const [enabled, setEnabled] = useState(true);

  // Dynamic config fields - Shell
  const [shellCommand, setShellCommand] = useState('');
  const [shellArgs, setShellArgs] = useState('');

  // Dynamic config fields - HTTP
  const [httpUrl, setHttpUrl] = useState('');
  const [httpMethod, setHttpMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('POST');
  const [httpHeaders, setHttpHeaders] = useState('{\n  "Content-Type": "application/json"\n}');
  const [httpBody, setHttpBody] = useState('{\n  \n}');

  // Dynamic config fields - App Launch
  const [appPackage, setAppPackage] = useState('');

  // Dynamic config fields - File Ops
  const [fileOperation, setFileOperation] = useState<'list' | 'read' | 'write' | 'delete' | 'copy'>('list');
  const [filePath, setFilePath] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [fileDestination, setFileDestination] = useState('');

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Task name is required.');
      return;
    }

    // Build adapter config
    const config: Record<string, any> = {};

    if (adapterType === 'shell') {
      if (!shellCommand.trim()) {
        setError('Shell command cannot be empty.');
        return;
      }
      config.command = shellCommand.trim();
      if (shellArgs.trim()) {
        // Support array of args split by comma or spaces
        config.args = shellArgs
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean);
      }
    } else if (adapterType === 'http') {
      if (!httpUrl.trim()) {
        setError('HTTP target URL is required.');
        return;
      }
      config.url = httpUrl.trim();
      config.method = httpMethod;

      if (httpHeaders.trim()) {
        try {
          config.headers = JSON.parse(httpHeaders);
        } catch {
          setError('Headers must be valid JSON format.');
          return;
        }
      }

      if (httpMethod !== 'GET' && httpBody.trim()) {
        try {
          config.body = JSON.parse(httpBody);
        } catch {
          // If not JSON, send as raw string
          config.body = httpBody;
        }
      }
    } else if (adapterType === 'app_launch') {
      if (!appPackage.trim()) {
        setError('Android package name is required (e.g., com.whatsapp or com.termux).');
        return;
      }
      config.package_name = appPackage.trim();
    } else if (adapterType === 'file_ops') {
      if (!filePath.trim()) {
        setError('Target path is required.');
        return;
      }
      config.operation = fileOperation;
      config.path = filePath.trim();

      if (fileOperation === 'write') {
        config.content = fileContent;
      } else if (fileOperation === 'copy') {
        if (!fileDestination.trim()) {
          setError('Destination path is required for copy operation.');
          return;
        }
        config.destination = fileDestination.trim();
      }
    }

    try {
      await createTaskMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        task_type: adapterType,
        adapter_type: adapterType,
        config,
        enabled,
        cron_expression: cronExpression.trim() || undefined,
        timeout_seconds: timeoutSeconds > 0 ? timeoutSeconds : 60,
        retries: retries >= 0 ? retries : 0,
      });

      navigate('tasks');
    } catch (err: any) {
      setError(err?.message || 'Failed to create task. Check input parameters.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top back button */}
      <div>
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Tasks</span>
        </button>
      </div>

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Create Automation Task
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Define task execution parameters, adapter type, and optional cron trigger schedule.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3 text-sm text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Details Card */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800/80 shadow-xs space-y-5">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            General Information
          </h3>

          <div className="space-y-4">
            <div>
              <label htmlFor="task-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Task Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="task-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sync SQLite backup or Fetch weather alert"
                required
                className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-navy-900 border border-slate-300 dark:border-navy-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="task-desc" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Description
              </label>
              <textarea
                id="task-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description of the task purpose"
                className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-navy-900 border border-slate-300 dark:border-navy-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Adapter Type Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Adapter Type <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ADAPTER_TYPES.map((type) => {
                  const isSelected = adapterType === type.value;
                  return (
                    <div
                      key={type.value}
                      onClick={() => setAdapterType(type.value as AdapterType)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 ring-2 ring-blue-500/20'
                          : 'border-slate-200 dark:border-navy-700 bg-slate-50/60 dark:bg-navy-900 hover:border-slate-300 dark:hover:border-navy-600'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {getAdapterIcon(type.value)}
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {type.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {type.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Adapter Configuration Card */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800/80 shadow-xs space-y-5">
          <div className="flex items-center gap-2">
            {getAdapterIcon(adapterType)}
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {adapterType === 'shell' && 'Shell Command Configuration'}
              {adapterType === 'http' && 'HTTP Webhook Configuration'}
              {adapterType === 'app_launch' && 'App Launcher Configuration'}
              {adapterType === 'file_ops' && 'File Operations Configuration'}
            </h3>
          </div>

          {/* Shell Config */}
          {adapterType === 'shell' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Command <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={shellCommand}
                  onChange={(e) => setShellCommand(e.target.value)}
                  placeholder="e.g. termux-battery-status or bash /sdcard/scripts/backup.sh"
                  className="w-full font-mono text-sm px-4 py-2.5 bg-slate-50 dark:bg-navy-900 border border-slate-300 dark:border-navy-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Arguments (comma-separated)
                </label>
                <input
                  type="text"
                  value={shellArgs}
                  onChange={(e) => setShellArgs(e.target.value)}
                  placeholder="e.g. --verbose, -n 10"
                  className="w-full font-mono text-sm px-4 py-2.5 bg-slate-50 dark:bg-navy-900 border border-slate-300 dark:border-navy-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* HTTP Config */}
          {adapterType === 'http' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Method
                  </label>
                  <select
                    value={httpMethod}
                    onChange={(e) => setHttpMethod(e.target.value as any)}
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-navy-900 border border-slate-300 dark:border-navy-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Target URL <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={httpUrl}
                    onChange={(e) => setHttpUrl(e.target.value)}
                    placeholder="https://api.example.com/webhook"
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-navy-900 border border-slate-300 dark:border-navy-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Headers (JSON)
                </label>
                <textarea
                  rows={3}
                  value={httpHeaders}
                  onChange={(e) => setHttpHeaders(e.target.value)}
                  className="w-full font-mono text-xs px-4 py-2.5 bg-slate-50 dark:bg-navy-900 border border-slate-300 dark:border-navy-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {httpMethod !== 'GET' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Body Payload (JSON or text)
                  </label>
                  <textarea
                    rows={4}
                    value={httpBody}
                    onChange={(e) => setHttpBody(e.target.value)}
                    className="w-full font-mono text-xs px-4 py-2.5 bg-slate-50 dark:bg-navy-900 border border-slate-300 dark:border-navy-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* App Launch Config */}
          {adapterType === 'app_launch' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Android Package Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={appPackage}
                  onChange={(e) => setAppPackage(e.target.value)}
                  placeholder="e.g. com.whatsapp, com.termux, com.android.chrome"
                  className="w-full font-mono text-sm px-4 py-2.5 bg-slate-50 dark:bg-navy-900 border border-slate-300 dark:border-navy-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Launches app package via am start on Android daemon.
                </p>
              </div>
            </div>
          )}

          {/* File Ops Config */}
          {adapterType === 'file_ops' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Operation
                  </label>
                  <select
                    value={fileOperation}
                    onChange={(e) => setFileOperation(e.target.value as any)}
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-navy-900 border border-slate-300 dark:border-navy-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="list">List Directory</option>
                    <option value="read">Read File</option>
                    <option value="write">Write File</option>
                    <option value="delete">Delete File</option>
                    <option value="copy">Copy File</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Path <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                    placeholder="e.g. /sdcard/Download or /data/data/com.termux/files/home"
                    className="w-full font-mono text-sm px-4 py-2.5 bg-slate-50 dark:bg-navy-900 border border-slate-300 dark:border-navy-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {fileOperation === 'write' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    File Content
                  </label>
                  <textarea
                    rows={4}
                    value={fileContent}
                    onChange={(e) => setFileContent(e.target.value)}
                    placeholder="Content to write into the file"
                    className="w-full font-mono text-xs px-4 py-2.5 bg-slate-50 dark:bg-navy-900 border border-slate-300 dark:border-navy-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {fileOperation === 'copy' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Destination Path <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fileDestination}
                    onChange={(e) => setFileDestination(e.target.value)}
                    placeholder="e.g. /sdcard/Backup/destination.txt"
                    className="w-full font-mono text-sm px-4 py-2.5 bg-slate-50 dark:bg-navy-900 border border-slate-300 dark:border-navy-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Execution & Schedule Settings Card */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800/80 shadow-xs space-y-5">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Execution & Schedule
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Cron Schedule (Optional)
              </label>
              <input
                type="text"
                value={cronExpression}
                onChange={(e) => setCronExpression(e.target.value)}
                placeholder="e.g. 0 2 * * * (daily at 2am)"
                className="w-full font-mono text-sm px-4 py-2.5 bg-slate-50 dark:bg-navy-900 border border-slate-300 dark:border-navy-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Standard 5-part cron syntax or leave blank for manual-only trigger.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Timeout (seconds)
              </label>
              <input
                type="number"
                min={1}
                max={3600}
                value={timeoutSeconds}
                onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
                className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-navy-900 border border-slate-300 dark:border-navy-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Retries on Failure
              </label>
              <input
                type="number"
                min={0}
                max={10}
                value={retries}
                onChange={(e) => setRetries(Number(e.target.value))}
                className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-navy-900 border border-slate-300 dark:border-navy-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <input
                id="task-enabled"
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-navy-600 cursor-pointer"
              />
              <label htmlFor="task-enabled" className="text-sm font-medium text-slate-800 dark:text-slate-200 cursor-pointer">
                Enable task upon creation
              </label>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={goBack}
            className="px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800 rounded-xl transition-colors border border-slate-200 dark:border-navy-700 cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={createTaskMutation.isPending}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-70 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
          >
            {createTaskMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Create Task</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
