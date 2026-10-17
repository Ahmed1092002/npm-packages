# @ahmed109/gatekeeper-express

[![npm version](https://img.shields.io/npm/v/@ahmed109/gatekeeper-express.svg)](https://www.npmjs.com/package/@ahmed109/gatekeeper-express)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![Express: >=4.18](https://img.shields.io/badge/Express-%3E%3D4.18.0-blue.svg)](https://expressjs.com/)

> Express middleware for route-level authorization and feature flags with customizable error callbacks, request augmentation, and ABAC policy support.

Part of the **Gatekeeper** toolkit. Built on top of [`@ahmed109/gatekeeper-core`](https://www.npmjs.com/package/@ahmed109/gatekeeper-core).

---

## Features

- **Route Guards**: Protect endpoints with `requirePermission()`, `requireAnyPermission()`, and `requireFeatureFlag()`.
- **Request Augmentation**: Automatically attaches typed helpers: `req.can(permission, options)`, `req.subject`, `req.user`, and `req.gatekeeperFlags`.
- **Contextual & ABAC Policies**: Derive dynamic evaluation context from incoming request parameters, headers, or route params via `getContext(req)`.
- **Customizable Auth Handlers**: Customize denial responses per route or globally via `onUnauthorized(req, res)` and `onForbidden(req, res, missing)`.
- **Safe JSON Fallbacks**: Defaults to clean, structured HTTP 401 Unauthorized and 403 Forbidden JSON responses if custom handlers are omitted.

---

## Installation

```bash
# npm
npm install @ahmed109/gatekeeper-express @ahmed109/gatekeeper-core

# pnpm
pnpm add @ahmed109/gatekeeper-express @ahmed109/gatekeeper-core

# yarn
yarn add @ahmed109/gatekeeper-express @ahmed109/gatekeeper-core
```

### Peer Dependencies

- `express`: `>=4.18.0`

---

## Quickstart

```typescript
import express from 'express';
import {
  gatekeeperMiddleware,
  requirePermission,
  requireAnyPermission,
  requireFeatureFlag,
} from '@ahmed109/gatekeeper-express';

const app = express();
app.use(express.json());

// 1. Upstream authentication middleware (e.g. JWT or session)
app.use((req, _res, next) => {
  // Attach user/subject and active feature flags
  req.user = {
    id: 'usr_123',
    name: 'Sarah Connor',
    roles: ['manager'],
    permissions: ['reports.export'],
    attributes: { tenantId: 'org_cyberdyne' },
  };
  req.gatekeeperFlags = {
    'beta-analytics': true,
    'export-csv': true,
  };
  next();
});

// 2. Mount Gatekeeper helper middleware
app.use(gatekeeperMiddleware());

// 3. Protected route: requires 'reports.view'
app.get('/api/reports', requirePermission('reports.view'), (req, res) => {
  res.json({ reports: [{ id: 1, title: 'Quarterly Audit' }] });
});

// 4. Compound route: requires AT LEAST ONE matching permission
app.get('/api/management', requireAnyPermission(['users.read', 'settings.manage']), (req, res) => {
  res.json({ message: 'Welcome to management' });
});

// 5. Dual gate: requires permission AND an enabled feature flag
app.get(
  '/api/reports/export',
  requirePermission('reports.export'),
  requireFeatureFlag('export-csv'),
  (req, res) => {
    res.send('id,title\n1,Quarterly Audit');
  },
);

app.listen(3001, () => {
  console.log('API listening on http://localhost:3001');
});
```

---

## Contextual & ABAC Route Protection

You can enforce dynamic authorization rules (e.g. multi-tenant boundary checks or resource ownership) using `getContext` and `policy`:

```typescript
import { requirePermission } from '@ahmed109/gatekeeper-express';
import type { AuthorizationPolicy } from '@ahmed109/gatekeeper-core';

// Define dynamic policy
const tenantIsolationPolicy: AuthorizationPolicy = (subject, permission, context) => {
  // Check if subject belongs to the requested route tenant
  if (context?.tenantId && subject.attributes?.tenantId !== context.tenantId) {
    return false; // Deny cross-tenant access
  }
  return undefined; // Defer to RBAC roles
};

app.get(
  '/api/tenants/:tenantId/projects',
  requirePermission('projects.read', {
    policy: tenantIsolationPolicy,
    getContext: (req) => ({ tenantId: req.params.tenantId }),
  }),
  (req, res) => {
    res.json({ projects: [] });
  },
);
```

---

## Custom Error Handlers (`onUnauthorized` & `onForbidden`)

Supply custom callbacks globally in `gatekeeperMiddleware` or on specific routes:

```typescript
app.post(
  '/api/users',
  requirePermission('users.create', {
    // Custom 401 callback for unauthenticated requests
    onUnauthorized: (req, res) => {
      res.status(401).json({
        error: 'AUTH_REQUIRED',
        message: 'Please log in to continue.',
      });
    },
    // Custom 403 callback when user lacks permissions
    onForbidden: (req, res, missingPermissions) => {
      res.status(403).json({
        error: 'INSUFFICIENT_PRIVILEGES',
        message: 'You lack permissions to create users.',
        required: missingPermissions,
      });
    },
  }),
  (req, res) => {
    res.status(201).json({ success: true });
  },
);
```

---

## Programmatic Checks via `req.can()`

Inside your controller or route handler, use the augmented `req.can()` helper for programmatic conditional logic:

```typescript
app.get('/api/profile', (req, res) => {
  const isSuperAdmin = req.can('settings.manage');

  res.json({
    user: req.user,
    capabilities: {
      canManageSettings: isSuperAdmin,
      canExportData: req.can('reports.export'),
    },
  });
});
```

---

## Default HTTP Error Responses

If no custom `onUnauthorized` or `onForbidden` handlers are provided, Gatekeeper automatically returns:

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Authentication required to access this resource."
}
```

### 403 Forbidden

```json
{
  "error": "Forbidden",
  "message": "You do not have permission to perform this action.",
  "missingPermissions": ["users.delete"]
}
```

### 404 Feature Flag Disabled (or 403)

```json
{
  "error": "Feature Disabled",
  "message": "The feature 'beta-analytics' is currently disabled."
}
```

---

## API Reference

### Middlewares

| Middleware             | Signature                                                                          | Description                                                         |
| :--------------------- | :--------------------------------------------------------------------------------- | :------------------------------------------------------------------ |
| `gatekeeperMiddleware` | `(options?: GatekeeperMiddlewareOptions) => RequestHandler`                        | Mounts global helpers, extractor functions, and options onto `req`. |
| `requirePermission`    | `(permission: string, options?: PermissionMiddlewareOptions) => RequestHandler`    | Enforces single permission check on route.                          |
| `requireAnyPermission` | `(permissions: string[], options?: PermissionMiddlewareOptions) => RequestHandler` | Enforces that subject has **at least one** required permission.     |
| `requireFeatureFlag`   | `(flagKey: string, options?: FeatureFlagMiddlewareOptions) => RequestHandler`      | Ensures feature flag is active before proceeding.                   |

### Middleware Options

```typescript
export interface PermissionMiddlewareOptions {
  roleMap?: RolePermissionsMap;
  policy?: AuthorizationPolicy;
  context?: Record<string, unknown>;
  getContext?: (req: Request) => Record<string, unknown>;
  onUnauthorized?: (req: Request, res: Response) => void;
  onForbidden?: (req: Request, res: Response, missingPermissions: string[]) => void;
}
```

### Augmented `Request` Properties

```typescript
declare global {
  namespace Express {
    interface Request {
      user?: AuthorizationSubject | null;
      subject?: AuthorizationSubject | null;
      gatekeeperFlags?: Record<string, boolean>;
      can: (permission: string, options?: EvaluateOptions) => boolean;
    }
  }
}
```

---

## License

MIT © [Ahmed Tamer](https://github.com/Ahmed1092002)
