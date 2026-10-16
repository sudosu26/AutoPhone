import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '../context/NavigationContext';
import { APP_NAME, APP_VERSION, STORAGE_KEYS, DEFAULT_REFRESH_INTERVAL } from '../utils/constants';
import {
  Globe,
  Key,
  Moon,
  Sun,
  Clock,
  Radio,
  CheckCircle2,
  XCircle,
  Loader2,
  LogOut,
  Save,
  Check,
  ShieldCheck,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { apiKey, backendUrl, updateBackendUrl, checkConnection, login, logout, isOnline } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { navigate } = useNavigation();

  // Backend URL state
  const [urlInput, setUrlInput] = useState(backendUrl);
  const [urlSaved, setUrlSaved] = useState(false);

  // API Key state
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [keySaved, setKeySaved] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  // Connection Test state
  const [testingConn, setTestingConn] = useState(false);
  const [connResult, setConnResult] = useState<{ success: boolean; message: string } | null>(null);

  // Refresh interval state
  const [refreshInterval, setRefreshInterval] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.REFRESH_INTERVAL);
      return saved ? parseInt(saved, 10) : DEFAULT_REFRESH_INTERVAL;
    } catch {
      return DEFAULT_REFRESH_INTERVAL;
    }
  });
  const [intervalSaved, setIntervalSaved] = useState(false);

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    updateBackendUrl(urlInput.trim());
    setUrlSaved(true);
    setTimeout(() => setUrlSaved(false), 2000);
  };

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeyError(null);
    if (!newKey.trim()) {
      setKeyError('API key cannot be empty.');
      return;
    }

    try {
      await login(newKey.trim(), urlInput.trim());
      setIsEditingKey(false);
      setNewKey('');
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 2000);
    } catch (err: any) {
      setKeyError(err?.message || 'Failed to authenticate with the new API key.');
    }
  };

  const handleTestConnection = async () => {
    setTestingConn(true);
    setConnResult(null);
    try {
      const online = await checkConnection();
      if (online) {
        setConnResult({ success: true, message: 'Backend reachable and responsive!' });
      } else {
        setConnResult({ success: false, message: 'Could not connect to the backend daemon.' });
      }
    } catch (err: any) {
      setConnResult({ success: false, message: err?.message || 'Connection test failed.' });
    } finally {
      setTestingConn(false);
    }
  };

  const handleSaveInterval = (val: number) => {
    setRefreshInterval(val);
    try {
      localStorage.setItem(STORAGE_KEYS.REFRESH_INTERVAL, String(val));
      setIntervalSaved(true);
      setTimeout(() => setIntervalSaved(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    logout();
    navigate('login');
  };

  // Mask API key for display
  const maskedApiKey = apiKey
    ? `${apiKey.slice(0, 4)}••••••••••••${apiKey.slice(-4)}`
    : 'None configured';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          System Settings
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage endpoint connectivity, authentication keys, and user interface preferences.
        </p>
      </div>

      <div className="space-y-6">
        {/* Backend Endpoint Settings Card */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-base text-slate-900 dark:text-white">
              Backend Server Endpoint
            </h3>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Base URL of the PhonePilot daemon running in Termux or host container.
          </p>

          <form onSubmit={handleSaveUrl} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="http://localhost:8265"
              className="flex-1 px-4 py-2.5 text-sm bg-slate-50 dark:bg-navy-900 border border-slate-300 dark:border-navy-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {urlSaved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
              <span>{urlSaved ? 'Saved' : 'Save URL'}</span>
            </button>
          </form>

          {/* Connection Test Section */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-navy-700/60">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Current Status:</span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isOnline
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                }`}
              >
                {isOnline ? 'Connected' : 'Offline / Unreachable'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConn}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-navy-700 dark:hover:bg-navy-600 rounded-xl transition-colors cursor-pointer w-fit"
            >
              {testingConn ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Probing...</span>
                </>
              ) : (
                <>
                  <Radio className="w-3.5 h-3.5 text-blue-500" />
                  <span>Test Connection</span>
                </>
              )}
            </button>
          </div>

          {connResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                connResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300'
              }`}
            >
              {connResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
              )}
              <span>{connResult.message}</span>
            </div>
          )}
        </div>

        {/* Authentication Key Card */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                API Authentication Key
              </h3>
            </div>

            {keySaved && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <Check className="w-3.5 h-3.5" /> Updated
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            X-API-Key token used to verify authorization against backend endpoints.
          </p>

          {!isEditingKey ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-navy-700">
              <div className="font-mono text-sm text-slate-700 dark:text-slate-300">
                {maskedApiKey}
              </div>
              <button
                type="button"
                onClick={() => setIsEditingKey(true)}
                className="px-3.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors cursor-pointer w-fit"
              >
                Change Key
              </button>
            </div>
          ) : (
            <form onSubmit={handleSaveKey} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="password"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="Enter new API key"
                  required
                  autoFocus
                  className="flex-1 px-4 py-2.5 text-sm bg-slate-50 dark:bg-navy-900 border border-slate-300 dark:border-navy-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingKey(false);
                      setNewKey('');
                      setKeyError(null);
                    }}
                    className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-700 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {keyError && (
                <p className="text-xs text-rose-500 font-medium">{keyError}</p>
              )}
            </form>
          )}
        </div>

        {/* Display & Preference Settings */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800/80 shadow-xs space-y-5">
          <h3 className="font-semibold text-base text-slate-900 dark:text-white">
            Preferences & Telemetry
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-navy-700">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  {theme === 'dark' ? <Moon className="w-4 h-4 text-blue-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                  <span>Appearance</span>
                </div>
                <div className="text-xs text-slate-400">
                  {theme === 'dark' ? 'Dark Navy Mode' : 'Light Mode'}
                </div>
              </div>

              <button
                type="button"
                onClick={toggleTheme}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors cursor-pointer"
              >
                Toggle Theme
              </button>
            </div>

            {/* Refresh Interval */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-navy-700">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-500" />
                  <span>Polling Frequency</span>
                </div>
                <div className="text-xs text-slate-400">
                  Background stats refresh rate
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={refreshInterval}
                  onChange={(e) => handleSaveInterval(Number(e.target.value))}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={10000}>10s</option>
                  <option value={15000}>15s</option>
                  <option value={30000}>30s</option>
                  <option value={60000}>60s</option>
                </select>
                {intervalSaved && <Check className="w-3.5 h-3.5 text-emerald-500" />}
              </div>
            </div>
          </div>
        </div>

        {/* Application Information & Session Logout */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-teal-500 flex items-center justify-center text-white shrink-0 shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-sm text-slate-900 dark:text-white">
                {APP_NAME} Console
              </div>
              <div className="text-xs text-slate-400">
                Version {APP_VERSION} &bull; Termux & Android Host Client
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>End Session (Logout)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
