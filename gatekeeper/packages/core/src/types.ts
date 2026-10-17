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
  /** A role can inherit permissions from one or more parent roles. */
  roleHierarchy?: RoleHierarchy;
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
  /** Roles considered after resolving inheritance. */
  evaluatedRoles?: Role[];
  /** How the decision was reached. */
  source?: 'policy' | 'direct-permission' | 'role-permission' | 'none';
  matchedPermission?: Permission;
}

/**
 * Mapping from roles to their granted permissions.
 */
export type RolePermissionsMap = Record<Role, readonly Permission[] | Permission[]>;

/** Maps a role to the roles whose permissions it inherits. */
export type RoleHierarchy = Record<Role, readonly Role[] | Role[]>;
