import React from 'react';
import { useGatekeeper } from './hooks.js';
import type { CanProps, FeatureProps } from './types.js';

/**
 * Conditionally renders children if the authenticated user has the required permission(s).
 *
 * @example
 * <Can permission="users.delete" fallback={<p>Not allowed</p>}>
 *   <DeleteUserButton />
 * </Can>
 */
export const Can: React.FC<CanProps> = ({
  permission,
  permissions,
  requireAll = true,
  context,
  policy,
  fallback = null,
  children,
}) => {
  const { can, canAll, canAny } = useGatekeeper();

  let isAllowed = false;
  const options = context || policy ? { context, policy } : undefined;

  if (permission) {
    isAllowed = can(permission, options);
  } else if (permissions && permissions.length > 0) {
    isAllowed = requireAll ? canAll(permissions, options) : canAny(permissions, options);
  }

  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * Conditionally renders children if a specific feature flag is enabled.
 *
 * @example
 * <Feature flag="new-dashboard" fallback={<LegacyDashboard />}>
 *   <NewDashboard />
 * </Feature>
 */
export const Feature: React.FC<FeatureProps> = ({ flag, fallback = null, children }) => {
  const { isFeatureEnabled } = useGatekeeper();
  const enabled = isFeatureEnabled(flag);

  if (!enabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
