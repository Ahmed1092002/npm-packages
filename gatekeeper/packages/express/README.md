# @ahmedtamer/gatekeeper-express

> Express middleware for authorization and feature flags with customizable callbacks.

Part of the **Gatekeeper** toolkit. Built on top of [`@ahmedtamer/gatekeeper-core`](https://www.npmjs.com/package/@ahmedtamer/gatekeeper-core).

## Installation

```bash
npm install @ahmedtamer/gatekeeper-express @ahmedtamer/gatekeeper-core
# or
pnpm add @ahmedtamer/gatekeeper-express @ahmedtamer/gatekeeper-core
```

### Peer Dependencies

- `express`: `>=4.18.0`

## Features

- **Route Guards**: `requirePermission()`, `requireAnyPermission()`, and `requireFeatureFlag()`.
- **Customizable Auth Callbacks**: Route-level and global `onUnauthorized(req, res)` and `onForbidden(req, res, missing)`.
- **Safe Fallbacks**: Returns standard JSON 401/403 responses if custom callbacks are not supplied.
- **Request Augmentation**: Safely types `req.user`, `req.gatekeeperFlags`, and `req.can(perm)`.

## Quickstart

```typescript
import express from 'express';
import {
  gatekeeperMiddleware,
  requirePermission,
  requireFeatureFlag,
} from '@ahmedtamer/gatekeeper-express';

const app = express();
app.use(express.json());

// Attach authenticated user and active flags in upstream middleware
app.use((req, _res, next) => {
  req.user = {
    id: 'usr_123',
    name: 'Bob Manager',
    role: 'manager',
    permissions: [],
  };
  req.gatekeeperFlags = {
    'export-reports': true,
  };
  next();
});

// Mount Gatekeeper helper middleware
app.use(gatekeeperMiddleware());

// Protected route: requires 'reports.view' permission
app.get('/api/reports', requirePermission('reports.view'), (req, res) => {
  res.json({ reports: [] });
});

// Protected route: requires permission AND active feature flag
app.get(
  '/api/reports/export',
  requirePermission('reports.view'),
  requireFeatureFlag('export-reports'),
  (req, res) => {
    res.send('id,title,date\n1,Audit,2026-10-17');
  },
);

// Custom forbidden handler
app.post(
  '/api/admin/action',
  requirePermission('settings.manage', {
    onForbidden: (req, res, missing) => {
      res.status(403).json({
        customError: 'FORBIDDEN_CUSTOM',
        missingPermissions: missing,
      });
    },
  }),
  (req, res) => {
    res.json({ success: true });
  },
);

app.listen(3001);
```

## License

MIT © [Ahmed Tamer](https://github.com/Ahmed1092002)
