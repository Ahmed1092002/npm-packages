import React, { useState, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings as SettingsIcon,
  ExternalLink,
} from 'lucide-react';
import { GatekeeperProvider } from '@ahmed109/gatekeeper-react';
import type { GatekeeperUser } from '@ahmed109/gatekeeper-core';

import { Header } from './components/Header.js';
import { OverviewPage } from './pages/OverviewPage.js';
import { ReportsPage } from './pages/ReportsPage.js';
import { UsersPage } from './pages/UsersPage.js';
import { SettingsPage } from './pages/SettingsPage.js';

const INITIAL_FLAGS: Record<string, boolean> = {
  'new-dashboard': true,
  'export-reports': true,
  'beta-analytics': false,
};

const DEFAULT_USER: GatekeeperUser = {
  id: 'user-admin',
  name: 'Alice Admin',
  email: 'alice@gatekeeper.dev',
  role: 'admin',
};

const NavigationSidebar: React.FC = () => {
  const location = useLocation();

  const links = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/reports', label: 'Reports', icon: FileText, requiredPerm: 'reports.view' },
    { to: '/users', label: 'Users', icon: Users, requiredPerm: 'users.read' },
    {
      to: '/settings',
      label: 'Settings',
      icon: SettingsIcon,
      requiredPerm: 'settings.manage',
      adminOnly: true,
    },
  ];

  return (
    <aside className="w-full md:w-64 bg-slate-950/60 border-r border-slate-800 p-4 shrink-0 flex flex-col justify-between">
      <div className="space-y-1">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
          Platform Navigation
        </div>

        {links.map((link) => {
          const isActive = location.pathname === link.to;
          const Icon = link.icon;

          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                <span>{link.label}</span>
              </div>

              {link.adminOnly && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950/80 text-purple-300 border border-purple-800/40 font-mono">
                  Admin
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="pt-4 border-t border-slate-800/80 mt-6 space-y-2">
        <a
          href="http://localhost:3001/api/docs"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
        >
          <span>OpenAPI / Swagger Docs</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
        </a>

        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg text-[11px] text-slate-400 leading-relaxed">
          <div className="text-white font-medium mb-0.5">Gatekeeper Monorepo</div>
          Pure RBAC & Flags in Full-Stack TypeScript.
        </div>
      </div>
    </aside>
  );
};

export const AppContent: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<GatekeeperUser | null>(DEFAULT_USER);
  const [directPermissions, setDirectPermissions] = useState<string[]>([]);
  const [flags, setFlags] = useState<Record<string, boolean>>(INITIAL_FLAGS);

  const handleToggleDirectPermission = (perm: string) => {
    setDirectPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  const handleToggleFlag = (key: string) => {
    setFlags((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Construct combined user with direct permissions attached
  const evaluatedUser = useMemo<GatekeeperUser | null>(() => {
    if (!currentUser) return null;
    return {
      ...currentUser,
      permissions: [...(currentUser.permissions ?? []), ...directPermissions],
    };
  }, [currentUser, directPermissions]);

  return (
    <GatekeeperProvider user={evaluatedUser} flags={flags}>
      <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100">
        <Header
          currentUser={evaluatedUser}
          onSelectUser={(u) => {
            setCurrentUser(u);
            setDirectPermissions([]);
          }}
          directPermissions={directPermissions}
          onToggleDirectPermission={handleToggleDirectPermission}
        />

        <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto">
          <NavigationSidebar />

          <main className="flex-1 p-6 md:p-8 overflow-y-auto">
            <Routes>
              <Route
                path="/"
                element={<OverviewPage flags={flags} onToggleFlag={handleToggleFlag} />}
              />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </GatekeeperProvider>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};
