import React, { useState } from 'react';
import { Settings, Shield, Lock, Save, CheckCircle2 } from 'lucide-react';
import { Can } from '@ahmed109/gatekeeper-react';

export const SettingsPage: React.FC = () => {
  const [orgName, setOrgName] = useState('Acme Cybernetics Corp');
  const [mfaEnforced, setMfaEnforced] = useState(true);
  const [timeout, setTimeoutVal] = useState('30');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
          <Settings className="w-5 h-5 text-blue-400" />
          <span>Security & System Governance</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Guarded by <code className="text-purple-300 font-mono">settings.manage</code> permission
          (Restricted to Administrators).
        </p>
      </div>

      {saved && (
        <div className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 p-3 rounded-lg text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Security policies updated and distributed across clusters.</span>
        </div>
      )}

      <Can
        permission="settings.manage"
        fallback={
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center shadow-xl">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7 text-rose-400" />
            </div>
            <h3 className="text-lg font-bold text-white">
              403 Forbidden: Admin Clearance Required
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
              System governance and tenant-level configurations require the{' '}
              <code className="text-rose-300 font-mono">settings.manage</code> permission. Your
              current profile does not meet this clearance tier. Switch to the{' '}
              <strong>Alice (Admin)</strong> profile to unlock.
            </p>
          </div>
        }
      >
        <form
          onSubmit={handleSave}
          className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6"
        >
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
            <Shield className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="text-sm font-semibold text-white">Tenant Authorization Policy</h3>
              <p className="text-xs text-slate-400">
                Configure global authentication and role delegation settings.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Organization Display Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Idle Session Timeout (Minutes)
              </label>
              <input
                type="number"
                value={timeout}
                onChange={(e) => setTimeoutVal(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div>
                <div className="text-xs font-semibold text-white">
                  Mandatory Multi-Factor Authentication (MFA)
                </div>
                <div className="text-[11px] text-slate-400">
                  Enforce hardware key or TOTP challenge on login for all roles.
                </div>
              </div>
              <input
                type="checkbox"
                checked={mfaEnforced}
                onChange={(e) => setMfaEnforced(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700"
              />
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-xs font-semibold text-white mb-1">
                Corporate Subnet CIDR Allowlist
              </div>
              <div className="text-[11px] text-slate-400 font-mono bg-slate-900 p-2 rounded border border-slate-800">
                192.168.1.0/24, 10.0.0.0/8
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-lg shadow-blue-500/20"
            >
              <Save className="w-4 h-4" />
              <span>Save Policy Changes</span>
            </button>
          </div>
        </form>
      </Can>
    </div>
  );
};
