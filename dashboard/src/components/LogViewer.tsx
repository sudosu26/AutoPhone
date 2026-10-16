import React, { useState } from 'react';
import type { ExecutionResponse } from '../api/types';
import { Terminal, Copy, Check, AlertCircle } from 'lucide-react';

interface LogViewerProps {
  result?: ExecutionResponse['result'];
  error?: string | null;
  className?: string;
}

export const LogViewer: React.FC<LogViewerProps> = ({ result, error, className = '' }) => {
  const [copied, setCopied] = useState(false);

  const stdout = result?.stdout?.trim();
  const stderr = result?.stderr?.trim();
  const rawResponse = result?.response;
  const exitCode = result?.exit_code;
  const statusCode = result?.status_code;

  const hasOutput = Boolean(stdout || stderr || error || rawResponse !== undefined);

  const getCombinedText = () => {
    const parts: string[] = [];
    if (stdout) parts.push(`--- STDOUT ---\n${stdout}`);
    if (stderr) parts.push(`--- STDERR ---\n${stderr}`);
    if (error) parts.push(`--- ERROR ---\n${error}`);
    if (rawResponse !== undefined) {
      const respStr = typeof rawResponse === 'object' ? JSON.stringify(rawResponse, null, 2) : String(rawResponse);
      parts.push(`--- RESPONSE ---\n${respStr}`);
    }
    return parts.join('\n\n');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getCombinedText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  if (!hasOutput) {
    return (
      <div className={`p-4 rounded-xl bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-navy-700 text-center text-xs text-slate-400 dark:text-navy-300 ${className}`}>
        No execution output recorded.
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-slate-200 dark:border-navy-700 bg-slate-900 overflow-hidden shadow-xs ${className}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/70 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-slate-400" />
          <span className="font-mono font-medium text-slate-300">Execution Output</span>
          {exitCode !== undefined && (
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                exitCode === 0
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              exit: {exitCode}
            </span>
          )}
          {statusCode !== undefined && (
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                statusCode >= 200 && statusCode < 300
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              HTTP {statusCode}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-2 py-1 text-slate-400 hover:text-slate-100 bg-slate-800/80 hover:bg-slate-800 rounded transition-colors text-[11px] cursor-pointer"
          title="Copy log to clipboard"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Content area */}
      <div className="p-4 space-y-3 max-h-80 overflow-y-auto font-mono text-xs">
        {/* Error message */}
        {error && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 space-y-1">
            <div className="flex items-center gap-1.5 text-rose-400 font-semibold text-[11px] uppercase tracking-wider">
              <AlertCircle className="w-3.5 h-3.5" /> Error
            </div>
            <pre className="whitespace-pre-wrap break-all leading-relaxed">{error}</pre>
          </div>
        )}

        {/* Stderr */}
        {stderr && (
          <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-900/40 text-rose-300 space-y-1">
            <div className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">Standard Error (stderr)</div>
            <pre className="whitespace-pre-wrap break-all leading-relaxed">{stderr}</pre>
          </div>
        )}

        {/* Stdout */}
        {stdout && (
          <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/30 text-emerald-300 space-y-1">
            <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Standard Output (stdout)</div>
            <pre className="whitespace-pre-wrap break-all leading-relaxed">{stdout}</pre>
          </div>
        )}

        {/* Response JSON/Data */}
        {rawResponse !== undefined && (
          <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-900/30 text-blue-300 space-y-1">
            <div className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">Response Payload</div>
            <pre className="whitespace-pre-wrap break-all leading-relaxed">
              {typeof rawResponse === 'object' ? JSON.stringify(rawResponse, null, 2) : String(rawResponse)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
