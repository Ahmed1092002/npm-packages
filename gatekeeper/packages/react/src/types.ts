import type {
  AuthorizationPolicy,
  AuthorizationSubject,
  EvaluateOptions,
  FeatureFlag,
  Permission,
  RolePermissionsMap,
} from '@ahmed109/gatekeeper-core';
import type { ReactNode } from 'react';

export interface GatekeeperContextValue {
  user: AuthorizationSubject | null;
  subject: AuthorizationSubject | null;
  flags: Record<string, boolean>;
  roleMap: RolePermissionsMap;
  policy?: AuthorizationPolicy;
  context?: Record<string, unknown>;
  isLoading: boolean;
  can: (permission: Permission, options?: EvaluateOptions) => boolean;
  canAll: (permissions: Permission[], options?: EvaluateOptions) => boolean;
  canAny: (permissions: Permission[], options?: EvaluateOptions) => boolean;
  isFeatureEnabled: (flagKey: string) => boolean;
  effectivePermissions: string[];
}

export interface GatekeeperProviderProps {
  user?: AuthorizationSubject | null;
  currentUser?: AuthorizationSubject | null;
  subject?: AuthorizationSubject | null;
  flags?: Record<string, boolean> | FeatureFlag[];
  featureFlags?: Record<string, boolean> | FeatureFlag[];
  roleMap?: RolePermissionsMap;
  policy?: AuthorizationPolicy;
  context?: Record<string, unknown>;
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
  /** Optional scoped context for policy evaluation */
  context?: Record<string, unknown>;
  /** Optional policy callback overriding or supplementing provider policy */
  policy?: AuthorizationPolicy;
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
