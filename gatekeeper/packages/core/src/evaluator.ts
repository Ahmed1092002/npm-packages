import { DEFAULT_ROLE_PERMISSIONS } from './roles.js';
import type {
  AuthorizationResult,
  FeatureFlag,
  GatekeeperUser,
  Permission,
  RolePermissionsMap,
} from './types.js';

/**
 * Returns all effective permissions granted to a user, combining
 * their role-based permissions with any direct permissions assigned.
 */
export function getUserEffectivePermissions(
  user: GatekeeperUser | null | undefined,
  roleMap: RolePermissionsMap = DEFAULT_ROLE_PERMISSIONS,
): Set<Permission> {
  const permissions = new Set<Permission>();

  if (!user) {
    return permissions;
  }

  // 1. Role-based permissions
  if (user.role && roleMap[user.role]) {
    const rolePerms = roleMap[user.role];
    if (rolePerms) {
      for (const perm of rolePerms) {
        permissions.add(perm);
      }
    }
  }

  // 2. Direct user permissions
  if (Array.isArray(user.permissions)) {
    for (const perm of user.permissions) {
      permissions.add(perm);
    }
  }

  return permissions;
}

/**
 * Evaluates whether a user has a specific permission.
 *
 * @param user - The user to check.
 * @param permission - The required permission string.
 * @param roleMap - Optional custom role-to-permissions map.
 * @returns boolean indicating if access is granted.
 */
export function can(
  user: GatekeeperUser | null | undefined,
  permission: Permission,
  roleMap: RolePermissionsMap = DEFAULT_ROLE_PERMISSIONS,
): boolean {
  if (!user || !permission) {
    return false;
  }

  const effective = getUserEffectivePermissions(user, roleMap);
  return effective.has(permission);
}

/**
 * Checks if a user has ALL of the requested permissions.
 */
export function canAll(
  user: GatekeeperUser | null | undefined,
  permissions: Permission[],
  roleMap: RolePermissionsMap = DEFAULT_ROLE_PERMISSIONS,
): boolean {
  if (!user || !permissions.length) {
    return false;
  }

  const effective = getUserEffectivePermissions(user, roleMap);
  return permissions.every((p) => effective.has(p));
}

/**
 * Checks if a user has AT LEAST ONE of the requested permissions.
 */
export function canAny(
  user: GatekeeperUser | null | undefined,
  permissions: Permission[],
  roleMap: RolePermissionsMap = DEFAULT_ROLE_PERMISSIONS,
): boolean {
  if (!user || !permissions.length) {
    return false;
  }

  const effective = getUserEffectivePermissions(user, roleMap);
  return permissions.some((p) => effective.has(p));
}

/**
 * Evaluates access with detailed diagnostic reasons.
 */
export function evaluatePermission(
  user: GatekeeperUser | null | undefined,
  permission: Permission,
  roleMap: RolePermissionsMap = DEFAULT_ROLE_PERMISSIONS,
): AuthorizationResult {
  if (!user) {
    return {
      allowed: false,
      reason: 'No authenticated user provided.',
      missingPermissions: [permission],
    };
  }

  const effective = getUserEffectivePermissions(user, roleMap);
  const allowed = effective.has(permission);

  if (allowed) {
    return {
      allowed: true,
      reason: 'Permission granted.',
    };
  }

  return {
    allowed: false,
    reason: `User with role '${user.role}' lacks required permission '${permission}'.`,
    missingPermissions: [permission],
  };
}

/**
 * Normalizes feature flag inputs (either an array of FeatureFlag or a record of boolean flags)
 * into a standard Record<string, boolean>.
 */
export function normalizeFeatureFlags(
  flags?: Record<string, boolean> | FeatureFlag[],
): Record<string, boolean> {
  if (!flags) {
    return {};
  }

  if (Array.isArray(flags)) {
    const result: Record<string, boolean> = {};
    for (const flag of flags) {
      result[flag.key] = flag.enabled;
    }
    return result;
  }

  return { ...flags };
}

/**
 * Checks whether a feature flag is enabled.
 */
export function isFeatureEnabled(
  flags: Record<string, boolean> | FeatureFlag[] | undefined,
  flagKey: string,
): boolean {
  if (!flags || !flagKey) {
    return false;
  }

  if (Array.isArray(flags)) {
    const found = flags.find((f) => f.key === flagKey);
    return Boolean(found?.enabled);
  }

  return Boolean(flags[flagKey]);
}
