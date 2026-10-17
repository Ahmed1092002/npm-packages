import { useContext } from 'react';
import type { EvaluateOptions, Permission } from '@ahmedtamer/gatekeeper-core';
import { GatekeeperContext } from './context.js';
import type { GatekeeperContextValue } from './types.js';

/**
 * Access the full Gatekeeper context.
 */
export function useGatekeeper(): GatekeeperContextValue {
  const context = useContext(GatekeeperContext);
  if (!context) {
    throw new Error(
      'useGatekeeper must be used within a <GatekeeperProvider>. Make sure to wrap your application with <GatekeeperProvider>.',
    );
  }
  return context;
}

/**
 * React hook to check if the current user has a specific permission.
 *
 * @example
 * const canDelete = usePermission('users.delete');
 * const canEdit = usePermission('projects.update', { context: { projectOwnerId: 'u1' } });
 */
export function usePermission(permission: Permission, options?: EvaluateOptions): boolean {
  const { can } = useGatekeeper();
  return can(permission, options);
}

/**
 * React hook to check if a feature flag is enabled.
 *
 * @example
 * const hasBeta = useFeatureFlag('beta-analytics');
 */
export function useFeatureFlag(flagKey: string): boolean {
  const { isFeatureEnabled } = useGatekeeper();
  return isFeatureEnabled(flagKey);
}

/**
 * React hook to check if the current user has all specified permissions.
 */
export function useCanAll(permissions: Permission[], options?: EvaluateOptions): boolean {
  const { canAll } = useGatekeeper();
  return canAll(permissions, options);
}

/**
 * React hook to check if the current user has at least one of the specified permissions.
 */
export function useCanAny(permissions: Permission[], options?: EvaluateOptions): boolean {
  const { canAny } = useGatekeeper();
  return canAny(permissions, options);
}
