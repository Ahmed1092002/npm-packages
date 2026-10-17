import React, { useState } from 'react';
import { Users, UserPlus, Trash2, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Can } from '@ahmed109/gatekeeper-react';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  lastActive: string;
}

const INITIAL_TEAM: UserRecord[] = [
  {
    id: 'user-admin',
    name: 'Alice Admin',
    email: 'alice@gatekeeper.dev',
    role: 'admin',
    lastActive: '2 mins ago',
  },
  {
    id: 'user-manager',
    name: 'Bob Manager',
    email: 'bob@gatekeeper.dev',
    role: 'manager',
    lastActive: '10 mins ago',
  },
  {
    id: 'user-member',
    name: 'Charlie Member',
    email: 'charlie@gatekeeper.dev',
    role: 'member',
    lastActive: '1 hour ago',
  },
  {
    id: 'user-dev-1',
    name: 'Dana Engineer',
    email: 'dana@gatekeeper.dev',
    role: 'member',
    lastActive: '3 hours ago',
  },
];

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>(INITIAL_TEAM);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleDelete = (id: string, name: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    setFeedback(`User "${name}" was successfully removed.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-400" />
            <span>Team User Directory</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Directory reading requires <code className="text-blue-300 font-mono">users.read</code>.
            Deletion requires <code className="text-rose-300 font-mono">users.delete</code>.
          </p>
        </div>

        {/* Invite User button guarded by <Can permission="users.create"> */}
        <div>
          <Can
            permission="users.create"
            fallback={
              <button
                disabled
                className="px-3 py-2 rounded-lg bg-slate-800 text-slate-500 border border-slate-700 text-xs font-medium cursor-not-allowed flex items-center space-x-1.5"
                title="Lacks users.create permission"
              >
                <UserPlus className="w-4 h-4 opacity-40" />
                <span>Invite User (Admin Only)</span>
              </button>
            }
          >
            <button
              onClick={() => {
                const newId = `user-${Date.now()}`;
                setUsers((prev) => [
                  ...prev,
                  {
                    id: newId,
                    name: 'New Collaborator',
                    email: `collab-${prev.length + 1}@gatekeeper.dev`,
                    role: 'member',
                    lastActive: 'Just now',
                  },
                ]);
                setFeedback('Invited new team member.');
                setTimeout(() => setFeedback(null), 3000);
              }}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-lg shadow-blue-500/20"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite New User</span>
            </button>
          </Can>
        </div>
      </div>

      {feedback && (
        <div className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 p-3 rounded-lg text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Main Table protected by <Can permission="users.read"> */}
      <Can
        permission="users.read"
        fallback={
          <div className="bg-rose-950/20 border border-rose-800/40 rounded-xl p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-900/40 border border-rose-700/50 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-6 h-6 text-rose-400" />
            </div>
            <h3 className="text-base font-bold text-white">
              403 Forbidden: Directory Access Restricted
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-2">
              Your active role does not possess the{' '}
              <code className="text-rose-300 font-mono">users.read</code> permission. Standard
              Members are denied access to team member records. Switch to <strong>Manager</strong>{' '}
              or <strong>Admin</strong> in the header.
            </p>
          </div>
        }
      >
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <th className="py-3 px-4 font-medium">User ID</th>
                <th className="py-3 px-4 font-medium">Name & Email</th>
                <th className="py-3 px-4 font-medium">Assigned Role</th>
                <th className="py-3 px-4 font-medium">Last Active</th>
                <th className="py-3 px-4 font-medium text-right">Actions (RBAC Guarded)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map((member) => (
                <tr key={member.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-400">{member.id}</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-white">{member.name}</div>
                    <div className="text-[11px] text-slate-400">{member.email}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700">
                      {member.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">{member.lastActive}</td>
                  <td className="py-3 px-4 text-right">
                    {/* Delete button conditionally rendered/enabled via <Can> */}
                    <Can
                      permission="users.delete"
                      fallback={
                        <button
                          disabled
                          className="px-2.5 py-1 rounded bg-slate-800/80 text-slate-500 border border-slate-700/60 text-[11px] cursor-not-allowed inline-flex items-center space-x-1"
                          title="Deletion requires users.delete (Admin only)"
                        >
                          <Trash2 className="w-3 h-3 opacity-40" />
                          <span>Delete (Denied)</span>
                        </button>
                      }
                    >
                      <button
                        onClick={() => handleDelete(member.id, member.name)}
                        className="px-2.5 py-1 rounded bg-rose-600/20 text-rose-300 border border-rose-500/40 hover:bg-rose-600 hover:text-white transition-colors text-[11px] font-medium inline-flex items-center space-x-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete User</span>
                      </button>
                    </Can>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Can>
    </div>
  );
};
