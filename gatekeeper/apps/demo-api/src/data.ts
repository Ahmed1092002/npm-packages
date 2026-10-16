import type { FeatureFlag, GatekeeperUser } from '@ahmedtamer/gatekeeper-core';

export interface DemoReport {
  id: string;
  title: string;
  category: 'Security' | 'Audit' | 'Financial' | 'Usage';
  date: string;
  status: 'Ready' | 'Processing';
  summary: string;
}

export interface DemoSettings {
  organizationName: string;
  mfaEnforced: boolean;
  sessionTimeoutMinutes: number;
  ipWhitelist: string[];
}

export const SEED_USERS: GatekeeperUser[] = [
  {
    id: 'user-admin',
    name: 'Alice Admin',
    email: 'alice@gatekeeper.dev',
    role: 'admin',
  },
  {
    id: 'user-manager',
    name: 'Bob Manager',
    email: 'bob@gatekeeper.dev',
    role: 'manager',
  },
  {
    id: 'user-member',
    name: 'Charlie Member',
    email: 'charlie@gatekeeper.dev',
    role: 'member',
  },
];

export const INITIAL_FLAGS: FeatureFlag[] = [
  {
    key: 'new-dashboard',
    enabled: true,
    description: 'Enables modernized responsive dashboard navigation and summary widgets.',
  },
  {
    key: 'export-reports',
    enabled: true,
    description: 'Allows exporting analytics and compliance reports to CSV format.',
  },
  {
    key: 'beta-analytics',
    enabled: false,
    description: 'Experimental predictive analytics and ML insights panel.',
  },
];

export const INITIAL_REPORTS: DemoReport[] = [
  {
    id: 'rep-01',
    title: 'Q3 Access Control Compliance Audit',
    category: 'Security',
    date: '2026-10-10',
    status: 'Ready',
    summary: '100% adherence to least-privilege standards across all service roles.',
  },
  {
    id: 'rep-02',
    title: 'Monthly Active User Retention & RBAC Churn',
    category: 'Usage',
    date: '2026-10-14',
    status: 'Ready',
    summary: '94% retention with zero permission escalation anomalies detected.',
  },
  {
    id: 'rep-03',
    title: 'Financial Ledger & Billing Authorization Log',
    category: 'Financial',
    date: '2026-10-15',
    status: 'Ready',
    summary: 'Audit log reconciled with payment gateway permissions.',
  },
];

export const INITIAL_SETTINGS: DemoSettings = {
  organizationName: 'Acme Cybernetics Corp',
  mfaEnforced: true,
  sessionTimeoutMinutes: 30,
  ipWhitelist: ['192.168.1.0/24', '10.0.0.0/8'],
};

// In-memory runtime state
let currentUsers = [...SEED_USERS];
let currentReports = [...INITIAL_REPORTS];
let currentFlags = [...INITIAL_FLAGS];
let currentSettings = { ...INITIAL_SETTINGS };

export const store = {
  getUsers: () => currentUsers,
  findUserById: (id: string) => currentUsers.find((u) => u.id === id),
  deleteUser: (id: string) => {
    const initialLength = currentUsers.length;
    currentUsers = currentUsers.filter((u) => u.id !== id);
    return currentUsers.length < initialLength;
  },
  getReports: () => currentReports,
  getFlags: () => currentFlags,
  getFlagsRecord: (): Record<string, boolean> => {
    return Object.fromEntries(currentFlags.map((f) => [f.key, f.enabled]));
  },
  setFlag: (key: string, enabled: boolean) => {
    const flag = currentFlags.find((f) => f.key === key);
    if (flag) {
      flag.enabled = enabled;
      return true;
    }
    return false;
  },
  getSettings: () => currentSettings,
  updateSettings: (patch: Partial<DemoSettings>) => {
    currentSettings = { ...currentSettings, ...patch };
    return currentSettings;
  },
  reset: () => {
    currentUsers = [...SEED_USERS];
    currentReports = [...INITIAL_REPORTS];
    currentFlags = INITIAL_FLAGS.map((f) => ({ ...f }));
    currentSettings = { ...INITIAL_SETTINGS };
  },
};
