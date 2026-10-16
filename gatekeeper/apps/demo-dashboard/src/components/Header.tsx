import { Shield, ShieldAlert, LogOut, CheckCircle2 } from 'lucide-react';
import type { GatekeeperUser } from '@gatekeeper/core';

interface HeaderProps {
  currentUser: GatekeeperUser | null;
  onSelectUser: (user: GatekeeperUser | null) => void;
  directPermissions: string[];
  onToggleDirectPermission: (perm: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onSelectUser,
  directPermissions,
  onToggleDirectPermission,
}) => {
  const presets: {
    id: string;
    label: string;
    role: 'admin' | 'manager' | 'member';
    user: GatekeeperUser;
  }[] = [
    {
      id: 'user-admin',
      label: 'Alice (Admin)',
      role: 'admin',
      user: {
        id: 'user-admin',
        name: 'Alice Admin',
        email: 'alice@gatekeeper.dev',
        role: 'admin',
      },
    },
    {
      id: 'user-manager',
      label: 'Bob (Manager)',
      role: 'manager',
      user: {
        id: 'user-manager',
        name: 'Bob Manager',
        email: 'bob@gatekeeper.dev',
        role: 'manager',
      },
    },
    {
      id: 'user-member',
      label: 'Charlie (Member)',
      role: 'member',
      user: {
        id: 'user-member',
        name: 'Charlie Member',
        email: 'charlie@gatekeeper.dev',
        role: 'member',
      },
    },
  ];

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-900/60 text-purple-300 border-purple-500/40';
      case 'manager':
        return 'bg-blue-900/60 text-blue-300 border-blue-500/40';
      case 'member':
        return 'bg-emerald-900/60 text-emerald-300 border-emerald-500/40';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-40 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-white tracking-tight">Gatekeeper</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-mono border border-blue-500/30">
                v1.0.0
              </span>
            </div>
            <p className="text-xs text-slate-400">Full-Stack Authorization & Feature Flags</p>
          </div>
        </div>

        {/* User Switcher controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
            {presets.map((preset) => {
              const isActive = currentUser?.id === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => onSelectUser(preset.user)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}

            <button
              onClick={() => onSelectUser(null)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center space-x-1 ${
                currentUser === null
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <LogOut className="w-3.5 h-3.5 mr-1" />
              Unauthenticated
            </button>
          </div>

          {/* Active user status badge */}
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
            {currentUser ? (
              <div className="flex items-center space-x-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-200">
                  {currentUser.name?.[0] || 'U'}
                </div>
                <div className="text-left text-xs">
                  <div className="text-white font-medium">{currentUser.name}</div>
                  <div className="flex items-center space-x-1.5">
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded border ${getRoleBadge(
                        currentUser.role,
                      )}`}
                    >
                      {currentUser.role}
                    </span>
                    {directPermissions.length > 0 && (
                      <span className="text-[10px] text-amber-400 font-medium">
                        +{directPermissions.length} direct
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2 bg-rose-950/40 border border-rose-800/50 px-3 py-1.5 rounded-lg text-rose-300 text-xs">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Anonymous (No Token / User)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Direct Permission Testing Toolbar */}
      {currentUser && (
        <div className="max-w-7xl mx-auto mt-3 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="text-slate-400 flex items-center space-x-1.5">
            <span className="font-semibold text-slate-300">
              Direct User Permissions (ABAC/Direct Grants):
            </span>
            <span className="text-slate-500">Test extending role permissions directly</span>
          </div>

          <div className="flex items-center gap-2">
            {['users.read', 'users.delete', 'settings.manage'].map((perm) => {
              const isDirect = directPermissions.includes(perm);
              return (
                <button
                  key={perm}
                  onClick={() => onToggleDirectPermission(perm)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all border flex items-center space-x-1 ${
                    isDirect
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-300'
                  }`}
                >
                  <span>{perm}</span>
                  {isDirect && <CheckCircle2 className="w-3 h-3 text-amber-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
