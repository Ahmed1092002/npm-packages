/**
 * Standard permissions supported out-of-the-box.
 * Users can also supply arbitrary string permissions.
 */
export type StandardPermission =
  'users.read' | 'users.create' | 'users.delete' | 'reports.view' | 'settings.manage';

export type Permission = StandardPermission | (string & {});

/**
 * Built-in standard roles.
 */
export type StandardRole = 'admin' | 'manager' | 'member';

export type Role = StandardRole | (string & {});

/**
 * Represents a user evaluated by Gatekeeper.
 */
export interface GatekeeperUser {
  id: string;
  role: Role;
  name?: string;
  email?: string;
  /**
   * Optional direct permissions assigned directly to this user,
   * extending or complementing role permissions.
   */
  permissions?: Permission[];
  /**
   * Optional user attributes for future ABAC extensions.
   */
  attributes?: Record<string, unknown>;
}

/**
 * Represents a feature flag with its key and active status.
 */
export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Detailed outcome of an authorization decision.
 */
export interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
  missingPermissions?: Permission[];
}

/**
 * Mapping from roles to their granted permissions.
 */
export type RolePermissionsMap = Record<Role, readonly Permission[] | Permission[]>;
