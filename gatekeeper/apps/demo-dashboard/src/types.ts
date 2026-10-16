import type { GatekeeperUser } from '@ahmedtamer/gatekeeper-core';

export interface UserPreset {
  id: string;
  label: string;
  role: 'admin' | 'manager' | 'member';
  user: GatekeeperUser;
}

export interface ApiCallResult {
  endpoint: string;
  method: string;
  status: number;
  statusText: string;
  data: unknown;
  timestamp: string;
  durationMs: number;
}
