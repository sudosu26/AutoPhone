import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';
import { DEFAULT_BACKEND_URL, APP_NAME, APP_VERSION } from '../utils/constants';
import { Radio, Key, Globe, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

export const Login: React.FC = () => {
  const { login, backendUrl: currentBackendUrl } = useAuth();
  const { navigate } = useNavigation();

  const [apiKey, setApiKey] = useState('');
  const [backendUrl, setBackendUrl] = useState(currentBackendUrl || DEFAULT_BACKEND_URL);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!apiKey.trim()) {
      setError('Please enter your PhonePilot API key.');
      return;
    }

    setIsLoading(true);
    try {
      await login(apiKey.trim(), backendUrl.trim());
      navigate('dashboard');
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify your API key and backend URL.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100 dark:bg-navy-950 text-slate-800 dark:text-slate-100 transition-colors relative">
      {/* Top right theme toggle */}
      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800/90 shadow-xl p-8 backdrop-blur-md">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-blue-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Radio className="w-7 h-7 animate-pulse-subtle" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {APP_NAME}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Android Automation & Task Engine <span className="font-mono text-xs">v{APP_VERSION}</span>
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="api-key"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                API Key
              </label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="api-key"
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  required
                  autoFocus
                  className="w-full pl-10 pr-11 py-2.5 text-sm bg-slate-50 dark:bg-navy-900 border border-slate-300 dark:border-navy-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
                  aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="backend-url"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Backend URL
              </label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="backend-url"
                  type="text"
                  value={backendUrl}
                  onChange={(e) => setBackendUrl(e.target.value)}
                  placeholder="http://localhost:8265"
                  required
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-navy-900 border border-slate-300 dark:border-navy-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-navy-300">
                Direct LAN IP, Tailscale MagicDNS, or Termux port forward.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-70 rounded-xl shadow-sm hover:shadow transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-navy-900 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <span>Connect & Enter</span>
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400 dark:text-navy-300">
          Self-hosted Android management console
        </div>
      </div>
    </div>
  );
};
