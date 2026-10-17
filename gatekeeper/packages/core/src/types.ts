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
 * Flexible authorization subject supporting single role, multiple roles,
 * direct permissions, and contextual attributes.
 */
export interface AuthorizationSubject {
  id: string;
  /** Legacy single-role support */
  role?: Role;
  /** Preferred multiple-role support */
  roles?: Role[];
  name?: string;
  email?: string;
  /**
   * Optional direct permissions assigned directly to this subject,
   * extending or complementing role permissions.
   */
  permissions?: Permission[];
  /**
   * Optional metadata attributes such as tenantId, plan, teamId, etc.
   */
  attributes?: Record<string, unknown>;
}

/**
 * Backward-compatible alias for AuthorizationSubject.
 */
export type GatekeeperUser = AuthorizationSubject;

/**
 * Optional policy callback for scoped or attribute-based authorization.
 * Returning true/false decides immediately. Returning undefined falls back to RBAC.
 */
export type AuthorizationPolicy = (
  subject: AuthorizationSubject,
  permission: Permission,
  context?: Record<string, unknown>,
) => boolean | undefined;

/**
 * Options passed to authorization checks.
 */
export interface EvaluateOptions {
  roleMap?: RolePermissionsMap;
  context?: Record<string, unknown>;
  policy?: AuthorizationPolicy;
}

export type RoleMapOrOptions = RolePermissionsMap | EvaluateOptions;

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
