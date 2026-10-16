import { Shield, KeyRound, Flag, Lock, Zap } from 'lucide-react';
import { useGatekeeper, usePermission, Feature } from '@ahmedtamer/gatekeeper-react';
import { PermissionMatrix } from '../components/PermissionMatrix.js';
import { FeatureFlagSection } from '../components/FeatureFlagSection.js';
import { ApiRequestPanel } from '../components/ApiRequestPanel.js';

interface OverviewPageProps {
  flags: Record<string, boolean>;
  onToggleFlag: (key: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ flags, onToggleFlag }) => {
  const { user, effectivePermissions } = useGatekeeper();
  const canManageSettings = usePermission('settings.manage');

  return (
    <div className="space-y-6">
      {/* Dynamic Feature Banner */}
      <Feature flag="new-dashboard">
        <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-blue-500/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">
                Modern Dashboard Architecture Active
              </h4>
              <p className="text-xs text-slate-300">
                You are viewing the modern layout guarded by{' '}
                <code className="text-blue-300 font-mono">
                  &lt;Feature flag=&quot;new-dashboard&quot;&gt;
                </code>
                .
              </p>
            </div>
          </div>
          <span className="text-xs font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded">
            Feature: new-dashboard
          </span>
        </div>
      </Feature>

      {/* Hero / Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Role Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Evaluated Role</span>
            <Shield className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-white capitalize">{user?.role ?? 'None'}</div>
          <div className="text-xs text-slate-400 mt-1 truncate">
            {user?.name ?? 'Unauthenticated visitor'}
          </div>
        </div>

        {/* Permissions Count */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Effective Permissions</span>
            <KeyRound className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-white">
            {effectivePermissions.length}{' '}
            <span className="text-xs text-slate-400 font-normal">granted</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {user ? 'Role policy + Direct' : '0 permissions'}
          </div>
        </div>

        {/* Quick Privilege Checks */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Admin Clearance</span>
            <Lock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-center space-x-2">
            <span
              className={`text-sm font-semibold px-2 py-0.5 rounded ${
                canManageSettings
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              {canManageSettings ? 'Full Admin Access' : 'Restricted Clearance'}
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            settings.manage = {canManageSettings ? 'true' : 'false'}
          </div>
        </div>

        {/* Feature Flags Active */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>System Flags</span>
            <Flag className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-white">
            {Object.values(flags).filter(Boolean).length} / {Object.keys(flags).length}
          </div>
          <div className="text-xs text-slate-400 mt-1">Active in current environment</div>
        </div>
      </div>

      {/* Live Permission Matrix */}
      <PermissionMatrix />

      {/* Feature Flags Section */}
      <FeatureFlagSection flags={flags} onToggleFlag={onToggleFlag} />

      {/* Live Express API Tester */}
      <ApiRequestPanel currentUser={user} />
    </div>
  );
};
