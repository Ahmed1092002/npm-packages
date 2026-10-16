import React, { useState } from 'react';
import { Send, Terminal, Clock, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import type { GatekeeperUser } from '@ahmedtamer/gatekeeper-core';
import type { ApiCallResult } from '../types.js';

interface ApiRequestPanelProps {
  currentUser: GatekeeperUser | null;
}

export const ApiRequestPanel: React.FC<ApiRequestPanelProps> = ({ currentUser }) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('/api/reports');
  const [selectedMethod, setSelectedMethod] = useState<'GET' | 'POST' | 'DELETE'>('GET');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<ApiCallResult | null>(null);

  const presets = [
    {
      label: 'Check Auth Profile',
      method: 'GET' as const,
      endpoint: '/api/me',
      desc: 'Auth state',
    },
    {
      label: 'Read Reports',
      method: 'GET' as const,
      endpoint: '/api/reports',
      desc: 'requires reports.view',
    },
    {
      label: 'Export Reports CSV',
      method: 'GET' as const,
      endpoint: '/api/reports/export',
      desc: 'reports.view + export-reports flag',
    },
    {
      label: 'Read Users List',
      method: 'GET' as const,
      endpoint: '/api/users',
      desc: 'requires users.read',
    },
    {
      label: 'Delete User Record',
      method: 'DELETE' as const,
      endpoint: '/api/users/user-member',
      desc: 'requires users.delete (Admin)',
    },
    {
      label: 'Toggle Feature Flag',
      method: 'POST' as const,
      endpoint: '/api/feature-flags/beta-analytics/toggle',
      desc: 'requires settings.manage (Admin)',
    },
    {
      label: 'Reset Demo Store',
      method: 'POST' as const,
      endpoint: '/api/reset',
      desc: 'requires settings.manage (Admin)',
    },
    {
      label: 'Access System Settings',
      method: 'GET' as const,
      endpoint: '/api/settings',
      desc: 'requires settings.manage (Admin)',
    },
  ];

  const handleExecute = async (
    endpoint: string = selectedEndpoint,
    method: string = selectedMethod,
  ) => {
    setIsLoading(true);
    const start = performance.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (currentUser?.id) {
        headers['x-demo-user-id'] = currentUser.id;
      }

      const res = await fetch(`http://localhost:3001${endpoint}`, {
        method,
        headers,
      });

      const durationMs = Math.round(performance.now() - start);

      let data: unknown;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      setResult({
        endpoint,
        method,
        status: res.status,
        statusText: res.statusText,
        data,
        timestamp: new Date().toLocaleTimeString(),
        durationMs,
      });
    } catch (err: unknown) {
      setResult({
        endpoint,
        method,
        status: 0,
        statusText: 'Connection Error',
        data: {
          error: 'NETWORK_ERROR',
          message:
            'Could not reach Express demo-api on http://localhost:3001. Ensure "pnpm dev" or the backend server is running.',
          details: err instanceof Error ? err.message : String(err),
        },
        timestamp: new Date().toLocaleTimeString(),
        durationMs: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: number) => {
    if (status >= 200 && status < 300) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-mono font-bold">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" />
          {status} OK
        </span>
      );
    }
    if (status === 401) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-mono font-bold">
          <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-400" />
          401 UNAUTHORIZED
        </span>
      );
    }
    if (status === 403) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 text-xs font-mono font-bold">
          <XCircle className="w-3.5 h-3.5 mr-1 text-rose-400" />
          403 FORBIDDEN
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 text-xs font-mono font-bold">
        {status} {result?.statusText}
      </span>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-800 gap-2 mb-4">
        <div className="flex items-center space-x-2.5">
          <Terminal className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="font-semibold text-white text-sm">Live Express API Probe</h3>
            <p className="text-xs text-slate-400">
              Executes real HTTP requests against{' '}
              <code className="text-emerald-300">apps/demo-api</code> using active user credentials.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400">Auth Header:</span>
          <span className="font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-blue-300">
            x-demo-user-id: {currentUser?.id ?? '<omitted>'}
          </span>
        </div>
      </div>

      {/* Quick Action Presets */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-slate-400 mb-2">
          Preset Endpoint Test Actions:
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {presets.map((preset) => {
            const isSelected =
              selectedEndpoint === preset.endpoint && selectedMethod === preset.method;
            return (
              <button
                key={preset.endpoint + preset.method}
                onClick={() => {
                  setSelectedEndpoint(preset.endpoint);
                  setSelectedMethod(preset.method);
                  handleExecute(preset.endpoint, preset.method);
                }}
                className={`p-2 rounded text-left border transition-all ${
                  isSelected
                    ? 'bg-blue-950/40 border-blue-500/50 text-white'
                    : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>{preset.label}</span>
                  <span
                    className={`font-mono text-[10px] px-1 rounded ${
                      preset.method === 'DELETE'
                        ? 'bg-rose-900/60 text-rose-300'
                        : preset.method === 'POST'
                          ? 'bg-emerald-900/60 text-emerald-300'
                          : 'bg-blue-900/60 text-blue-300'
                    }`}
                  >
                    {preset.method}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 truncate">{preset.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Manual Request Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2 mb-4">
        <select
          value={selectedMethod}
          onChange={(e) => setSelectedMethod(e.target.value as 'GET' | 'POST' | 'DELETE')}
          className="w-full sm:w-28 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono font-semibold text-white focus:outline-none focus:border-blue-500"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="DELETE">DELETE</option>
        </select>

        <input
          type="text"
          value={selectedEndpoint}
          onChange={(e) => setSelectedEndpoint(e.target.value)}
          className="w-full flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
          placeholder="/api/..."
        />

        <button
          onClick={() => handleExecute(selectedEndpoint, selectedMethod)}
          disabled={isLoading}
          className="w-full sm:w-auto px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{isLoading ? 'Sending...' : 'Send Request'}</span>
        </button>
      </div>

      {/* Response Display */}
      {result && (
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-900 text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-slate-400">Response:</span>
              {getStatusBadge(result.status)}
            </div>
            <div className="flex items-center space-x-3 text-slate-500 text-[11px] font-mono">
              <span className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {result.durationMs}ms
              </span>
              <span>{result.timestamp}</span>
            </div>
          </div>

          <pre className="text-xs font-mono text-slate-300 overflow-x-auto max-h-60 p-2 bg-slate-900/60 rounded border border-slate-900">
            {typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
