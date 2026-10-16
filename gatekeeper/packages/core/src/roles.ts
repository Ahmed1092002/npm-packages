import type { RolePermissionsMap } from './types.js';

/**
 * Default role-to-permissions map for Gatekeeper.
 *
 * - Admin: Full access across user management, reports, and settings.
 * - Manager: Can read users and view reports.
 * - Member: Can view reports.
 */
export const DEFAULT_ROLE_PERMISSIONS: RolePermissionsMap = {
  admin: ['users.read', 'users.create', 'users.delete', 'reports.view', 'settings.manage'],
  manager: ['users.read', 'reports.view'],
  member: ['reports.view'],
};

/**
 * Creates a merged role-to-permissions map by extending or overriding the defaults.
 */
export function defineRolePermissions(
  customMap?: Partial<RolePermissionsMap>,
  baseMap: RolePermissionsMap = DEFAULT_ROLE_PERMISSIONS,
): RolePermissionsMap {
  if (!customMap) {
    return { ...baseMap };
  }

  const merged: RolePermissionsMap = { ...baseMap };
  for (const [role, perms] of Object.entries(customMap)) {
    if (perms) {
      merged[role] = [...perms];
    }
  }
  return merged;
}
