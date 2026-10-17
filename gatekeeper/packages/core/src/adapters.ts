import type { AuthorizationSubject, Permission, Role } from './types.js';

export interface FromRolesInput {
  id: string;
  role?: Role;
  roles?: Role[] | Role;
  permissions?: Permission[];
  attributes?: Record<string, unknown>;
  name?: string;
  email?: string;
}

/**
 * Normalizes an identity with one or multiple roles into a standard AuthorizationSubject.
 *
 * @example
 * // Single role
 * fromRoles('u1', 'admin');
 *
 * // Multiple roles with metadata attributes
 * fromRoles('u1', ['billing-manager', 'support-agent'], { tenantId: 't-123' });
 *
 * // Object input
 * fromRoles({ id: 'u1', roles: ['editor', 'viewer'] });
 */
export function fromRoles(
  idOrInput: string | FromRolesInput,
  roles?: Role[] | Role,
  attributes?: Record<string, unknown>,
): AuthorizationSubject {
  if (typeof idOrInput === 'object' && idOrInput !== null) {
    const rolesList: Role[] = [];
    if (Array.isArray(idOrInput.roles)) {
      rolesList.push(...idOrInput.roles);
    } else if (idOrInput.roles) {
      rolesList.push(idOrInput.roles);
    }
    if (idOrInput.role && !rolesList.includes(idOrInput.role)) {
      rolesList.push(idOrInput.role);
    }

    return {
      id: String(idOrInput.id),
      roles: rolesList,
      role: idOrInput.role ?? rolesList[0],
      ...(idOrInput.permissions ? { permissions: idOrInput.permissions } : {}),
      ...(idOrInput.attributes ? { attributes: idOrInput.attributes } : {}),
      ...(idOrInput.name ? { name: idOrInput.name } : {}),
      ...(idOrInput.email ? { email: idOrInput.email } : {}),
    };
  }

  const rolesList: Role[] = [];
  if (Array.isArray(roles)) {
    rolesList.push(...roles);
  } else if (roles) {
    rolesList.push(roles);
  }

  return {
    id: String(idOrInput),
    roles: rolesList,
    role: rolesList[0],
    ...(attributes ? { attributes } : {}),
  };
}

export interface FromPermissionsInput {
  id: string;
  permissions: Permission[];
  attributes?: Record<string, unknown>;
  name?: string;
  email?: string;
}

/**
 * Normalizes an identity with direct permissions into an AuthorizationSubject.
 *
 * @example
 * fromPermissions('u1', ['users.read', 'reports.view']);
 * fromPermissions({ id: 'u1', permissions: ['users.read'] });
 */
export function fromPermissions(
  idOrInput: string | FromPermissionsInput,
  permissions?: Permission[],
  attributes?: Record<string, unknown>,
): AuthorizationSubject {
  if (typeof idOrInput === 'object' && idOrInput !== null) {
    return {
      id: String(idOrInput.id),
      roles: [],
      permissions: Array.isArray(idOrInput.permissions) ? [...idOrInput.permissions] : [],
      ...(idOrInput.attributes ? { attributes: idOrInput.attributes } : {}),
      ...(idOrInput.name ? { name: idOrInput.name } : {}),
      ...(idOrInput.email ? { email: idOrInput.email } : {}),
    };
  }

  return {
    id: String(idOrInput),
    roles: [],
    permissions: Array.isArray(permissions) ? [...permissions] : [],
    ...(attributes ? { attributes } : {}),
  };
}

export interface JwtClaimsOptions {
  /** Field name(s) to check for subject ID. Defaults to ['sub', 'id'] */
  idField?: string | string[];
  /** Field name(s) or dot-paths to check for roles. Defaults to ['roles', 'role', 'realm_access.roles'] */
  rolesField?: string | string[];
  /** Field name(s) to check for permissions. Defaults to ['permissions', 'perms'] */
  permissionsField?: string | string[];
  /** Optional specific claim keys to copy into subject attributes */
  attributesFields?: string[];
}

/**
 * Safely resolves nested property paths (e.g. 'realm_access.roles') from an object.
 */
function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * Normalizes JWT / OIDC claims payload into an AuthorizationSubject.
 * Supports standard claims as well as Keycloak realm_access and custom claims.
 *
 * Note: This is a generic normalization helper and does not validate token signatures.
 * Signature verification must be performed by your upstream authentication layer.
 *
 * @example
 * // Keycloak JWT with realm_access.roles:
 * const token = {
 *   sub: 'user_kc_123',
 *   realm_access: { roles: ['admin', 'billing'] },
 *   email: 'alex@example.com'
 * };
 * const subject = fromJwtClaims(token);
 */
export function fromJwtClaims(
  claims: Record<string, unknown>,
  options: JwtClaimsOptions = {},
): AuthorizationSubject {
  if (!claims || typeof claims !== 'object') {
    return { id: '', roles: [], permissions: [] };
  }

  // 1. Resolve ID
  const idFields = options.idField
    ? Array.isArray(options.idField)
      ? options.idField
      : [options.idField]
    : ['sub', 'id'];

  let resolvedId = '';
  for (const field of idFields) {
    const val = getByPath(claims, field);
    if (val !== undefined && val !== null && String(val).trim()) {
      resolvedId = String(val);
      break;
    }
  }

  // 2. Resolve Roles
  const rolesFields = options.rolesField
    ? Array.isArray(options.rolesField)
      ? options.rolesField
      : [options.rolesField]
    : ['roles', 'role', 'realm_access.roles'];

  const resolvedRoles: Role[] = [];
  for (const field of rolesFields) {
    const val = getByPath(claims, field);
    if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === 'string') {
          resolvedRoles.push(item);
        }
      }
      if (resolvedRoles.length > 0) break;
    } else if (typeof val === 'string' && val.trim()) {
      resolvedRoles.push(val);
      break;
    }
  }

  // 3. Resolve Permissions
  const permFields = options.permissionsField
    ? Array.isArray(options.permissionsField)
      ? options.permissionsField
      : [options.permissionsField]
    : ['permissions', 'perms'];

  const resolvedPerms: Permission[] = [];
  for (const field of permFields) {
    const val = getByPath(claims, field);
    if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === 'string') {
          resolvedPerms.push(item);
        }
      }
      if (resolvedPerms.length > 0) break;
    } else if (typeof val === 'string' && val.trim()) {
      resolvedPerms.push(val);
      break;
    }
  }

  // 4. Resolve Attributes
  const attributes: Record<string, unknown> = {};
  if (options.attributesFields && Array.isArray(options.attributesFields)) {
    for (const attrField of options.attributesFields) {
      const val = getByPath(claims, attrField);
      if (val !== undefined) {
        attributes[attrField] = val;
      }
    }
  } else {
    // Copy non-standard claims as metadata attributes
    const excludedKeys = new Set([
      'sub',
      'id',
      'roles',
      'role',
      'realm_access',
      'permissions',
      'perms',
    ]);
    for (const [k, v] of Object.entries(claims)) {
      if (!excludedKeys.has(k) && v !== undefined) {
        attributes[k] = v;
      }
    }
  }

  const email = typeof claims.email === 'string' ? claims.email : undefined;
  const name =
    typeof claims.name === 'string'
      ? claims.name
      : typeof claims.preferred_username === 'string'
        ? claims.preferred_username
        : undefined;

  return {
    id: resolvedId,
    roles: resolvedRoles,
    role: resolvedRoles[0],
    permissions: resolvedPerms,
    attributes,
    ...(name ? { name } : {}),
    ...(email ? { email } : {}),
  };
}

export interface SubjectMappingConfig<TSource> {
  getId: (source: TSource) => string;
  getRoles?: (source: TSource) => Role[] | Role | undefined | null;
  getPermissions?: (source: TSource) => Permission[] | undefined | null;
  getAttributes?: (source: TSource) => Record<string, unknown> | undefined | null;
  getName?: (source: TSource) => string | undefined | null;
  getEmail?: (source: TSource) => string | undefined | null;
}

/**
 * Creates an AuthorizationSubject by mapping any arbitrary domain or database model.
 *
 * @example
 * // 1. Simple database record
 * interface DbUser {
 *   user_id: string;
 *   primary_role: string;
 *   is_active: boolean;
 * }
 * const subject = createSubject(dbUser, {
 *   getId: (u) => u.user_id,
 *   getRoles: (u) => [u.primary_role],
 *   getAttributes: (u) => ({ isActive: u.is_active }),
 * });
 *
 * // 2. Custom membership model with nested roles
 * interface OrgMembership {
 *   memberId: string;
 *   organization: { orgId: string };
 *   access: { roles: string[]; customGrants?: string[] };
 * }
 * const memberSubject = createSubject(membership, {
 *   getId: (m) => m.memberId,
 *   getRoles: (m) => m.access.roles,
 *   getPermissions: (m) => m.access.customGrants,
 *   getAttributes: (m) => ({ orgId: m.organization.orgId }),
 * });
 *
 * // 3. Functional transformer
 * const customSubject = createSubject(rawInput, (input) => ({
 *   id: input.id,
 *   roles: input.assignedRoles,
 * }));
 */
export function createSubject<TSource>(
  source: TSource,
  mapping: SubjectMappingConfig<TSource> | ((source: TSource) => AuthorizationSubject),
): AuthorizationSubject {
  if (typeof mapping === 'function') {
    return mapping(source);
  }

  const rawRoles = mapping.getRoles ? mapping.getRoles(source) : undefined;
  const rolesList: Role[] = [];
  if (Array.isArray(rawRoles)) {
    for (const r of rawRoles) {
      if (r) rolesList.push(r);
    }
  } else if (rawRoles) {
    rolesList.push(rawRoles);
  }

  const rawPerms = mapping.getPermissions ? mapping.getPermissions(source) : undefined;
  const permsList: Permission[] = Array.isArray(rawPerms) ? [...rawPerms] : [];

  const attributes = mapping.getAttributes ? mapping.getAttributes(source) : undefined;
  const name = mapping.getName ? mapping.getName(source) : undefined;
  const email = mapping.getEmail ? mapping.getEmail(source) : undefined;

  return {
    id: mapping.getId(source),
    roles: rolesList,
    role: rolesList[0],
    permissions: permsList,
    ...(attributes ? { attributes } : {}),
    ...(name ? { name } : {}),
    ...(email ? { email } : {}),
  };
}
