import React, { createContext, useMemo } from 'react';
import {
  DEFAULT_ROLE_PERMISSIONS,
  can as coreCan,
  canAll as coreCanAll,
  canAny as coreCanAny,
  getUserEffectivePermissions,
  isFeatureEnabled as coreIsFeatureEnabled,
  normalizeFeatureFlags,
  type Permission,
} from '@gatekeeper/core';
import type { GatekeeperContextValue, GatekeeperProviderProps } from './types.js';

export const GatekeeperContext = createContext<GatekeeperContextValue | null>(null);

/**
 * Top-level provider for Gatekeeper authorization and feature flags in React.
 */
export const GatekeeperProvider: React.FC<GatekeeperProviderProps> = ({
  user,
  currentUser,
  flags,
  featureFlags,
  roleMap = DEFAULT_ROLE_PERMISSIONS,
  isLoading = false,
  children,
  fallback = null,
}) => {
  const activeUser = user ?? currentUser ?? null;
  const rawFlags = flags ?? featureFlags;

  const normalizedFlags = useMemo(() => normalizeFeatureFlags(rawFlags), [rawFlags]);

  const effectivePermissions = useMemo(() => {
    return Array.from(getUserEffectivePermissions(activeUser, roleMap));
  }, [activeUser, roleMap]);

  const contextValue = useMemo<GatekeeperContextValue>(() => {
    return {
      user: activeUser,
      flags: normalizedFlags,
      roleMap,
      isLoading,
      can: (permission: Permission) => {
        if (isLoading) return false;
        return coreCan(activeUser, permission, roleMap);
      },
      canAll: (permissions: Permission[]) => {
        if (isLoading) return false;
        return coreCanAll(activeUser, permissions, roleMap);
      },
      canAny: (permissions: Permission[]) => {
        if (isLoading) return false;
        return coreCanAny(activeUser, permissions, roleMap);
      },
      isFeatureEnabled: (flagKey: string) => {
        return coreIsFeatureEnabled(normalizedFlags, flagKey);
      },
      effectivePermissions,
    };
  }, [activeUser, normalizedFlags, roleMap, isLoading, effectivePermissions]);

  if (isLoading && fallback) {
    return <GatekeeperContext.Provider value={contextValue}>{fallback}</GatekeeperContext.Provider>;
  }

  return <GatekeeperContext.Provider value={contextValue}>{children}</GatekeeperContext.Provider>;
};
