import type { FeatureFlag, GatekeeperUser, Permission, RolePermissionsMap } from '@gatekeeper/core';
import type { ReactNode } from 'react';

export interface GatekeeperContextValue {
  user: GatekeeperUser | null;
  flags: Record<string, boolean>;
  roleMap: RolePermissionsMap;
  isLoading: boolean;
  can: (permission: Permission) => boolean;
  canAll: (permissions: Permission[]) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  isFeatureEnabled: (flagKey: string) => boolean;
  effectivePermissions: string[];
}

export interface GatekeeperProviderProps {
  user?: GatekeeperUser | null;
  currentUser?: GatekeeperUser | null;
  flags?: Record<string, boolean> | FeatureFlag[];
  featureFlags?: Record<string, boolean> | FeatureFlag[];
  roleMap?: RolePermissionsMap;
  isLoading?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

export interface CanProps {
  /** Single permission to check */
  permission?: Permission;
  /** Multiple permissions to check */
  permissions?: Permission[];
  /** If true when multiple permissions given, user must have all. Default is true */
  requireAll?: boolean;
  /** Custom fallback component if unauthorized */
  fallback?: ReactNode;
  /** Content to render when authorized */
  children: ReactNode;
}

export interface FeatureProps {
  /** Feature flag key to check */
  flag: string;
  /** Custom fallback component if flag is disabled */
  fallback?: ReactNode;
  /** Content to render when flag is active */
  children: ReactNode;
}
