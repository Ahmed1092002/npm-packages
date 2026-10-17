import React, { createContext, useMemo } from 'react';
import {
  DEFAULT_ROLE_PERMISSIONS,
  can as coreCan,
  canAll as coreCanAll,
  canAny as coreCanAny,
  getUserEffectivePermissions,
  isFeatureEnabled as coreIsFeatureEnabled,
  normalizeFeatureFlags,
  type EvaluateOptions,
  type Permission,
} from '@ahmed109/gatekeeper-core';
import type { GatekeeperContextValue, GatekeeperProviderProps } from './types.js';

export const GatekeeperContext = createContext<GatekeeperContextValue | null>(null);

/**
 * Top-level provider for Gatekeeper authorization and feature flags in React.
 */
export const GatekeeperProvider: React.FC<GatekeeperProviderProps> = ({
  user,
  currentUser,
  subject,
  flags,
  featureFlags,
  roleMap = DEFAULT_ROLE_PERMISSIONS,
  policy,
  context,
  isLoading = false,
  children,
  fallback = null,
}) => {
  const activeUser = subject ?? user ?? currentUser ?? null;
  const rawFlags = flags ?? featureFlags;

  const normalizedFlags = useMemo(() => normalizeFeatureFlags(rawFlags), [rawFlags]);

  const effectivePermissions = useMemo(() => {
    if (isLoading) return [];
    return Array.from(getUserEffectivePermissions(activeUser, roleMap));
  }, [activeUser, roleMap, isLoading]);

  const contextValue = useMemo<GatekeeperContextValue>(() => {
    return {
      user: activeUser,
      subject: activeUser,
      flags: normalizedFlags,
      roleMap,
      policy,
      context,
      isLoading,
      can: (permission: Permission, canOptions?: EvaluateOptions) => {
        if (isLoading) return false;
        const combinedOptions: EvaluateOptions = {
          roleMap: canOptions?.roleMap ?? roleMap,
          policy: canOptions?.policy ?? policy,
          context: canOptions?.context ?? context,
        };
        return coreCan(activeUser, permission, combinedOptions);
      },
      canAll: (permissions: Permission[], canOptions?: EvaluateOptions) => {
        if (isLoading) return false;
        const combinedOptions: EvaluateOptions = {
          roleMap: canOptions?.roleMap ?? roleMap,
          policy: canOptions?.policy ?? policy,
          context: canOptions?.context ?? context,
        };
        return coreCanAll(activeUser, permissions, combinedOptions);
      },
      canAny: (permissions: Permission[], canOptions?: EvaluateOptions) => {
        if (isLoading) return false;
        const combinedOptions: EvaluateOptions = {
          roleMap: canOptions?.roleMap ?? roleMap,
          policy: canOptions?.policy ?? policy,
          context: canOptions?.context ?? context,
        };
        return coreCanAny(activeUser, permissions, combinedOptions);
      },
      isFeatureEnabled: (flagKey: string) => {
        if (isLoading) return false;
        return coreIsFeatureEnabled(normalizedFlags, flagKey);
      },
      effectivePermissions,
    };
  }, [activeUser, normalizedFlags, roleMap, policy, context, isLoading, effectivePermissions]);

  if (isLoading && fallback) {
    return <GatekeeperContext.Provider value={contextValue}>{fallback}</GatekeeperContext.Provider>;
  }

  return <GatekeeperContext.Provider value={contextValue}>{children}</GatekeeperContext.Provider>;
};
