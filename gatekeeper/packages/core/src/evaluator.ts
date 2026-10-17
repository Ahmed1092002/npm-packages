import { DEFAULT_ROLE_PERMISSIONS } from './roles.js';
import type {
  AuthorizationResult,
  AuthorizationSubject,
  EvaluateOptions,
  FeatureFlag,
  Permission,
  Role,
  RoleMapOrOptions,
  RolePermissionsMap,
} from './types.js';

/**
 * Normalizes either a legacy RolePermissionsMap or a modern EvaluateOptions object.
 * An empty plain object `{}` is treated as an explicit empty RolePermissionsMap (`{ roleMap: {} }`).
 * When options is omitted/undefined, an empty options object is returned (roleMap remains undefined).
 */
export function parseEvaluateOptions(options?: RoleMapOrOptions): EvaluateOptions {
  if (!options || typeof options !== 'object') {
    return {};
  }
  if ('roleMap' in options || 'context' in options || 'policy' in options) {
    return options as EvaluateOptions;
  }
  const values = Object.values(options);
  if (values.length === 0 || values.every((v) => Array.isArray(v))) {
    return { roleMap: options as RolePermissionsMap };
  }
  return options as EvaluateOptions;
}

/**
 * Returns all effective permissions granted to a subject, combining
 * permissions from every role in `roles`, the legacy `role` field,
 * and direct permissions assigned in `permissions`.
 * Deduplicates permissions and denies safely if no roles or permissions exist.
 */
export function getUserEffectivePermissions(
  subject: AuthorizationSubject | null | undefined,
  roleMapOrOptions?: RoleMapOrOptions,
): Set<Permission> {
  const permissions = new Set<Permission>();

  if (!subject) {
    return permissions;
  }

  const opts = parseEvaluateOptions(roleMapOrOptions);
  const roleMap = opts.roleMap ?? DEFAULT_ROLE_PERMISSIONS;

  // 1. Collect all distinct roles (both multiple `roles` and legacy `role`)
  const rolesToEvaluate = new Set<Role>();
  if (Array.isArray(subject.roles)) {
    for (const r of subject.roles) {
      if (r) rolesToEvaluate.add(r);
    }
  }
  if (subject.role) {
    rolesToEvaluate.add(subject.role);
  }

  // 2. Combine permissions from every granted role
  for (const role of rolesToEvaluate) {
    const rolePerms = roleMap[role];
    if (rolePerms && Array.isArray(rolePerms)) {
      for (const perm of rolePerms) {
        permissions.add(perm);
      }
    }
  }

  // 3. Merge direct user/subject permissions
  if (Array.isArray(subject.permissions)) {
    for (const perm of subject.permissions) {
      if (perm) permissions.add(perm);
    }
  }

  return permissions;
}

/**
 * Evaluates whether a subject has a specific permission.
 * Supports scoped policy checks and legacy roleMap options.
 *
 * @param subject - The subject to check.
 * @param permission - The required permission string.
 * @param options - Optional roleMap or EvaluateOptions ({ roleMap, context, policy }).
 * @returns boolean indicating if access is granted.
 */
export function can(
  subject: AuthorizationSubject | null | undefined,
  permission: Permission,
  options?: RoleMapOrOptions,
): boolean {
  if (!subject || !permission) {
    return false;
  }

  const opts = parseEvaluateOptions(options);

  // 1. Evaluate policy if provided
  if (opts.policy) {
    const decision = opts.policy(subject, permission, opts.context);
    if (typeof decision === 'boolean') {
      return decision;
    }
  }

  // 2. Fall back to RBAC + direct permissions
  const effective = getUserEffectivePermissions(subject, options !== undefined ? opts : undefined);
  return effective.has(permission);
}

/**
 * Checks if a subject has ALL of the requested permissions.
 */
export function canAll(
  subject: AuthorizationSubject | null | undefined,
  permissions: Permission[],
  options?: RoleMapOrOptions,
): boolean {
  if (!subject || !permissions.length) {
    return false;
  }

  return permissions.every((p) => can(subject, p, options));
}

/**
 * Checks if a subject has AT LEAST ONE of the requested permissions.
 */
export function canAny(
  subject: AuthorizationSubject | null | undefined,
  permissions: Permission[],
  options?: RoleMapOrOptions,
): boolean {
  if (!subject || !permissions.length) {
    return false;
  }

  return permissions.some((p) => can(subject, p, options));
}

/**
 * Evaluates access with detailed diagnostic reasons.
 */
export function evaluatePermission(
  subject: AuthorizationSubject | null | undefined,
  permission: Permission,
  options?: RoleMapOrOptions,
): AuthorizationResult {
  if (!subject) {
    return {
      allowed: false,
      reason: 'No authenticated user provided.',
      missingPermissions: [permission],
    };
  }

  const opts = parseEvaluateOptions(options);

  if (opts.policy) {
    const decision = opts.policy(subject, permission, opts.context);
    if (typeof decision === 'boolean') {
      return {
        allowed: decision,
        reason: decision ? 'Permission granted by policy.' : 'Permission denied by policy.',
        missingPermissions: decision ? undefined : [permission],
      };
    }
  }

  const effective = getUserEffectivePermissions(subject, options !== undefined ? opts : undefined);
  const allowed = effective.has(permission);

  if (allowed) {
    return {
      allowed: true,
      reason: 'Permission granted.',
    };
  }

  const roleDesc = subject.role ?? (subject.roles?.length ? subject.roles.join(', ') : 'none');

  return {
    allowed: false,
    reason: `User with role '${roleDesc}' lacks required permission '${permission}'.`,
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
