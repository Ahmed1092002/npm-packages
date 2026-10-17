# @ahmed109/gatekeeper-core

[![npm version](https://img.shields.io/npm/v/@ahmed109/gatekeeper-core.svg)](https://www.npmjs.com/package/@ahmed109/gatekeeper-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen.svg)](https://www.npmjs.com/package/@ahmed109/gatekeeper-core)

> Pure, framework-independent authorization and feature-flag evaluation engine for TypeScript and JavaScript.

Part of the **Gatekeeper** toolkit. Zero runtime dependencies, deterministic evaluation, and full TypeScript type safety for Role-Based Access Control (RBAC) and Attribute-Based Access Control (ABAC). Works identically across Node.js, browsers, Edge runtimes, and Cloudflare Workers.

---

## Features

- **Zero Runtime Dependencies**: Completely self-contained, lightweight pure functional evaluation.
- **Flexible Subject Model**: Supports multiple roles (`roles: string[]`), legacy single role (`role: string`), and direct permission grants (`permissions: string[]`).
- **Identity Normalization Adapters**: Built-in zero-dependency mappers for JWT claims (`fromJwtClaims`), custom database/ORM models (`createSubject`), and role lists (`fromRoles`).
- **Scoped Dynamic Policies**: Combine static RBAC with dynamic, contextual rules (e.g. multi-tenant isolation, resource ownership).
- **Safe-Deny Defaults**: Fails securely on unknown roles, missing users, or empty permission sets. Passing an empty role map (`{}`) strictly denies built-in roles.
- **Diagnostic Reasons**: `evaluatePermission()` returns structured diagnostic outcomes (`allowed`, `reason`, `missingPermissions`) for compliance and audit logging.
- **Compound Checks**: Built-in `can()`, `canAll()`, and `canAny()`.
- **Feature Flag Evaluation**: Integrated feature flag evaluation (`isFeatureEnabled`, `normalizeFeatureFlags`).

---

## Installation

```bash
# npm
npm install @ahmed109/gatekeeper-core

# pnpm
pnpm add @ahmed109/gatekeeper-core

# yarn
yarn add @ahmed109/gatekeeper-core
```

---

## Quickstart

### 1. Basic RBAC (Multi-Role & Direct Grants)

```typescript
import { can, canAll, canAny, type AuthorizationSubject } from '@ahmed109/gatekeeper-core';

// Subject with multiple roles and direct permission overrides
const user: AuthorizationSubject = {
  id: 'usr_123',
  roles: ['manager', 'billing_admin'],
  permissions: ['custom.audit_log'],
};

// Single permission check
if (can(user, 'users.read')) {
  console.log('User can view users list');
}

// Compound checks: must have ALL permissions
if (canAll(user, ['users.read', 'reports.view'])) {
  console.log('User has all required permissions');
}

// Compound checks: must have AT LEAST ONE permission
if (canAny(user, ['users.delete', 'custom.audit_log'])) {
  console.log('User has at least one matching privilege');
}
```

### 2. Scoped & Contextual Dynamic Policies (ABAC)

For attribute-based access control such as tenant boundaries or document ownership, pass an `AuthorizationPolicy`:

```typescript
import { can, type AuthorizationPolicy } from '@ahmed109/gatekeeper-core';

const tenantPolicy: AuthorizationPolicy = (subject, permission, context) => {
  // Enforce tenant boundary
  if (context?.tenantId && subject.attributes?.tenantId !== context.tenantId) {
    return false; // Deny immediately
  }
  // Resource ownership rule
  if (permission === 'documents.delete') {
    return subject.id === context?.documentOwnerId;
  }
  return undefined; // Defer to standard RBAC roles
};

const user = {
  id: 'usr_123',
  roles: ['editor'],
  attributes: { tenantId: 'org_acme' },
};

// Evaluates policy first, falls back to role permissions if policy returns undefined
const allowed = can(user, 'documents.delete', {
  policy: tenantPolicy,
  context: { tenantId: 'org_acme', documentOwnerId: 'usr_123' },
});
```

---

## Identity Normalization Adapters

Gatekeeper provides built-in adapters to normalize different identity shapes into a standardized `AuthorizationSubject`:

### 1. Database & ORM Models (`createSubject`)

```typescript
import { createSubject } from '@ahmed109/gatekeeper-core';

// E.g., Prisma, Drizzle, or TypeORM query result
const dbUser = await prisma.user.findUnique({
  where: { id: 'usr_123' },
  include: { memberships: true },
});

const subject = createSubject(dbUser, {
  getId: (u) => u.id,
  getRoles: (u) => u.memberships.map((m) => m.roleName),
  getAttributes: (u) => ({ tenantId: u.organizationId }),
});
```

### 2. Decoded JWT Claims (`fromJwtClaims`)

Extracts user ID, roles, and claims from standard JWT tokens (Auth0, Keycloak, AWS Cognito, Firebase):

```typescript
import { fromJwtClaims } from '@ahmed109/gatekeeper-core';

const jwtPayload = {
  sub: 'auth0|64b9f0a2',
  realm_access: { roles: ['analyst', 'viewer'] },
  email: 'alex@example.com',
  org_id: 'org_enterprise',
};

const subject = fromJwtClaims(jwtPayload);
// subject.id -> 'auth0|64b9f0a2'
// subject.roles -> ['analyst', 'viewer']
// subject.attributes.org_id -> 'org_enterprise'
```

### 3. Role Arrays & Direct Grants (`fromRoles`, `fromPermissions`)

```typescript
import { fromRoles, fromPermissions } from '@ahmed109/gatekeeper-core';

const subjectWithRoles = fromRoles('usr_123', ['admin', 'billing']);
const subjectWithPerms = fromPermissions('usr_456', ['reports.view', 'export.csv']);
```

---

## Diagnostic Audit Evaluation

Use `evaluatePermission()` to get structured diagnostic explanations for authorization decisions:

```typescript
import { evaluatePermission } from '@ahmed109/gatekeeper-core';

const result = evaluatePermission(user, 'users.delete');

console.log(result);
// If allowed:
// { allowed: true, reason: 'Permission granted.' }
//
// If denied:
// {
//   allowed: false,
//   reason: "User with role 'manager' lacks required permission 'users.delete'.",
//   missingPermissions: ['users.delete']
// }
```

---

## Feature Flags

Gatekeeper evaluates boolean record flags and `FeatureFlag` arrays side-by-side:

```typescript
import { isFeatureEnabled, normalizeFeatureFlags } from '@ahmed109/gatekeeper-core';

const flags = {
  'new-dashboard': true,
  'beta-reports': false,
};

if (isFeatureEnabled(flags, 'new-dashboard')) {
  console.log('New dashboard is active');
}
```

---

## API Reference

### Evaluation Functions

| Function                      | Signature                                                | Description                                                          |
| :---------------------------- | :------------------------------------------------------- | :------------------------------------------------------------------- |
| `can`                         | `(subject, permission, options?) => boolean`             | Evaluates if a subject has the requested permission.                 |
| `canAll`                      | `(subject, permissions[], options?) => boolean`          | Returns `true` if subject has **all** requested permissions.         |
| `canAny`                      | `(subject, permissions[], options?) => boolean`          | Returns `true` if subject has **at least one** requested permission. |
| `evaluatePermission`          | `(subject, permission, options?) => AuthorizationResult` | Returns `{ allowed, reason, missingPermissions }`.                   |
| `getUserEffectivePermissions` | `(subject, options?) => Set<Permission>`                 | Resolves deduplicated set of all effective permissions.              |
| `defineRolePermissions`       | `(roles) => RolePermissionsMap`                          | Helper to define type-safe custom role permission sets.              |
| `isFeatureEnabled`            | `(flags, key) => boolean`                                | Checks whether a feature flag is enabled.                            |
| `normalizeFeatureFlags`       | `(flags?) => Record<string, boolean>`                    | Normalizes arrays or objects into boolean flag maps.                 |

### Normalization Adapters

| Adapter           | Signature                                                | Description                                         |
| :---------------- | :------------------------------------------------------- | :-------------------------------------------------- |
| `createSubject`   | `(source, mapper) => AuthorizationSubject`               | Maps any domain model to an `AuthorizationSubject`. |
| `fromRoles`       | `(id, roles, attributes?) => AuthorizationSubject`       | Builds subject from ID and list of roles.           |
| `fromPermissions` | `(id, permissions, attributes?) => AuthorizationSubject` | Builds subject from ID and direct permissions.      |
| `fromJwtClaims`   | `(claims, options?) => AuthorizationSubject`             | Maps standard JWT payload claims to a subject.      |

---

## TypeScript Types

```typescript
export interface AuthorizationSubject {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
  attributes?: Record<string, unknown>;
  [key: string]: unknown;
}

// Backward-compatible alias
export type GatekeeperUser = AuthorizationSubject;

export type AuthorizationPolicy = (
  subject: AuthorizationSubject,
  permission: string,
  context?: Record<string, unknown>,
) => boolean | undefined;

export interface EvaluateOptions {
  roleMap?: RolePermissionsMap;
  context?: Record<string, unknown>;
  policy?: AuthorizationPolicy;
}

export interface AuthorizationResult {
  allowed: boolean;
  reason: string;
  missingPermissions?: string[];
}
```

---

## License

MIT © [Ahmed Tamer](https://github.com/Ahmed1092002)
