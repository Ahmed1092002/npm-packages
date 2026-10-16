import { Check, X, KeyRound, Sparkles } from 'lucide-react';
import { useGatekeeper } from '@ahmedtamer/gatekeeper-react';
import { DEFAULT_ROLE_PERMISSIONS, type Permission } from '@ahmedtamer/gatekeeper-core';

interface PermissionMeta {
  key: Permission;
  name: string;
  category: 'Users' | 'Reports' | 'Settings';
  description: string;
}

const PERMISSIONS_CATALOG: PermissionMeta[] = [
  {
    key: 'users.read',
    name: 'Read User Records',
    category: 'Users',
    description: 'Browse team members, view role assignments and emails.',
  },
  {
    key: 'users.create',
    name: 'Invite & Create Users',
    category: 'Users',
    description: 'Issue invitations and provision new system user accounts.',
  },
  {
    key: 'users.delete',
    name: 'Delete User Accounts',
    category: 'Users',
    description: 'Permanently revoke and delete team accounts (Admin privilege).',
  },
  {
    key: 'reports.view',
    name: 'View Analytics Reports',
    category: 'Reports',
    description: 'Access organizational telemetry and audit log reports.',
  },
  {
    key: 'settings.manage',
    name: 'Manage System Settings',
    category: 'Settings',
    description: 'Configure security policies, SSO, MFA and IP allowlists.',
  },
];

export const PermissionMatrix: React.FC = () => {
  const { user, can } = useGatekeeper();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <KeyRound className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="font-semibold text-white text-sm">Gatekeeper Permission Matrix</h3>
            <p className="text-xs text-slate-400">
              Real-time RBAC resolution for current user:{' '}
              <span className="font-mono text-blue-300">{user?.role ?? 'anonymous'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <span className="flex items-center text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block mr-1.5 animate-pulse"></span>
            Granted
          </span>
          <span className="flex items-center text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block mr-1.5"></span>
            Denied
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
              <th className="py-3 px-4 font-medium">Permission Key</th>
              <th className="py-3 px-4 font-medium">Description</th>
              <th className="py-3 px-4 font-medium">Default Allowed Roles</th>
              <th className="py-3 px-4 font-medium">Active Evaluation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {PERMISSIONS_CATALOG.map((perm) => {
              const allowed = can(perm.key);
              const allowedRoles = Object.entries(DEFAULT_ROLE_PERMISSIONS)
                .filter(([_, perms]) => perms.includes(perm.key))
                .map(([r]) => r);

              const isDirectlyGranted = user?.permissions?.includes(perm.key);

              return (
                <tr
                  key={perm.key}
                  className={`transition-colors ${
                    allowed ? 'hover:bg-blue-950/20' : 'hover:bg-slate-800/40 opacity-80'
                  }`}
                >
                  <td className="py-3 px-4">
                    <div className="font-mono font-semibold text-blue-300 flex items-center space-x-1.5">
                      <span>{perm.key}</span>
                      {isDirectlyGranted && (
                        <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded text-[10px] font-sans flex items-center space-x-1">
                          <Sparkles className="w-2.5 h-2.5 mr-0.5" /> Direct
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{perm.name}</div>
                  </td>

                  <td className="py-3 px-4 text-slate-300 max-w-xs">{perm.description}</td>

                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {allowedRoles.map((role) => (
                        <span
                          key={role}
                          className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] uppercase font-mono"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    {allowed ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <Check className="w-3.5 h-3.5 mr-1" /> Allowed
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                        <X className="w-3.5 h-3.5 mr-1" /> Denied
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
