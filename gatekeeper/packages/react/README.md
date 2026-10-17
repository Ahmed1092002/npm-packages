# @ahmed109/gatekeeper-react

[![npm version](https://img.shields.io/npm/v/@ahmed109/gatekeeper-react.svg)](https://www.npmjs.com/package/@ahmed109/gatekeeper-react)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![React: >=18](https://img.shields.io/badge/React-%3E%3D18.0.0-blue.svg)](https://react.dev/)

> Declarative React authorization and feature-flag toolkit with fail-safe loading states, components, and reactive hooks.

Part of the **Gatekeeper** toolkit. Built on top of [`@ahmed109/gatekeeper-core`](https://www.npmjs.com/package/@ahmed109/gatekeeper-core).

> [!IMPORTANT]
> **Security Notice**: Frontend authorization guards (`<Can>`, `usePermission`) control UI element visibility for optimal user experience. They do **not** replace server-side enforcement. All mutating and sensitive operations must be verified by backend middleware (such as [`@ahmed109/gatekeeper-express`](https://www.npmjs.com/package/@ahmed109/gatekeeper-express)).

---

## Features

- **Fail-Safe Loading**: While `isLoading: true`, all authorization decisions default to closed (`false`), preventing jarring UI flashes of restricted buttons or data.
- **Declarative Guards**: `<Can>` and `<Feature>` components with slot-based `fallback` UI for unauthorized or disabled states.
- **Contextual & ABAC Policies**: Pass runtime `context` directly to `<Can context={...}>` or `usePermission(perm, { context })` for scoped policies (e.g. document owner, project tenant).
- **Reactive Hooks**: Clean hooks for any scenario: `usePermission()`, `useCanAll()`, `useCanAny()`, `useFeatureFlag()`, and `useGatekeeper()`.
- **Memoized Evaluation**: Caches computed permission sets to avoid unnecessary re-renders during app state transitions.

---

## Installation

```bash
# npm
npm install @ahmed109/gatekeeper-react @ahmed109/gatekeeper-core

# pnpm
pnpm add @ahmed109/gatekeeper-react @ahmed109/gatekeeper-core

# yarn
yarn add @ahmed109/gatekeeper-react @ahmed109/gatekeeper-core
```

### Peer Dependencies

- `react`: `>=18.0.0`
- `react-dom`: `>=18.0.0`

---

## Quickstart

### 1. Set Up the Provider

Wrap your application in `GatekeeperProvider`. Provide the active authenticated subject and active feature flags:

```tsx
import React, { useState, useEffect } from 'react';
import { GatekeeperProvider } from '@ahmed109/gatekeeper-react';
import type { AuthorizationSubject } from '@ahmed109/gatekeeper-core';
import { Dashboard } from './Dashboard';

export function App() {
  const [subject, setSubject] = useState<AuthorizationSubject | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch authenticated profile from your API or auth provider
    fetchCurrentUser().then((user) => {
      setSubject(user);
      setLoading(false);
    });
  }, []);

  const featureFlags = {
    'beta-analytics': true,
    'export-csv': false,
  };

  return (
    <GatekeeperProvider
      subject={subject}
      flags={featureFlags}
      isLoading={loading}
      fallback={<div>Loading permissions...</div>}
    >
      <Dashboard />
    </GatekeeperProvider>
  );
}
```

### 2. Declarative UI Guarding with `<Can>` and `<Feature>`

Use `<Can>` to conditionally render components based on permissions, and `<Feature>` for feature flags:

```tsx
import React from 'react';
import { Can, Feature } from '@ahmed109/gatekeeper-react';

export function Dashboard() {
  return (
    <div>
      <h1>Operations Hub</h1>

      {/* Renders children only if user has 'users.read' */}
      <Can
        permission="users.read"
        fallback={<p className="text-muted">You do not have permission to view users.</p>}
      >
        <UsersTable />
      </Can>

      {/* Scoped ABAC check with context */}
      <Can
        permission="projects.delete"
        context={{ ownerId: 'usr_123' }}
        fallback={<button disabled>Delete Project (Owner only)</button>}
      >
        <button className="btn-danger">Delete Project</button>
      </Can>

      {/* Feature Flag gate */}
      <Feature flag="beta-analytics" fallback={<span>Analytics feature coming soon.</span>}>
        <AnalyticsWidget />
      </Feature>
    </div>
  );
}
```

### 3. Programmatic Checks with Hooks

```tsx
import React from 'react';
import {
  usePermission,
  useCanAll,
  useCanAny,
  useFeatureFlag,
  useGatekeeper,
} from '@ahmed109/gatekeeper-react';

export function ActionToolbar({ documentId }: { documentId: string }) {
  // Check single permission with contextual ABAC
  const canEdit = usePermission('documents.edit', { context: { documentId } });

  // Compound permission checks
  const canManageAll = useCanAll(['users.read', 'settings.manage']);
  const canViewAny = useCanAny(['reports.view', 'analytics.export']);

  // Feature flag hook
  const isExportEnabled = useFeatureFlag('export-csv');

  // Full Gatekeeper context access
  const { subject, isLoading } = useGatekeeper();

  if (isLoading) {
    return <span>Loading permissions...</span>;
  }

  return (
    <div className="toolbar">
      {canEdit && <button>Edit Document</button>}
      {canManageAll && <button>System Settings</button>}
      {canViewAny && <button>View Analytics</button>}
      {isExportEnabled && <button>Export Data</button>}
    </div>
  );
}
```

---

## API Reference

### Components

#### `<GatekeeperProvider>`

Top-level context provider that supplies authorization state and evaluators to all descendant components.

| Prop        | Type                                       | Default                    | Description                                                                          |
| :---------- | :----------------------------------------- | :------------------------- | :----------------------------------------------------------------------------------- |
| `subject`   | `AuthorizationSubject \| null`             | `null`                     | The active authenticated subject (supports multi-role and direct grants).            |
| `user`      | `GatekeeperUser \| null`                   | `null`                     | Backward-compatible alias for `subject`.                                             |
| `flags`     | `Record<string, boolean> \| FeatureFlag[]` | `{}`                       | Active feature flags for the current session.                                        |
| `roleMap`   | `RolePermissionsMap`                       | `DEFAULT_ROLE_PERMISSIONS` | Optional custom role-to-permission mapping override.                                 |
| `policy`    | `AuthorizationPolicy`                      | `undefined`                | Optional global ABAC policy callback `(subject, perm, ctx) => boolean \| undefined`. |
| `context`   | `Record<string, unknown>`                  | `undefined`                | Optional default context passed to policy evaluations.                               |
| `isLoading` | `boolean`                                  | `false`                    | When `true`, fail-safe mode activates and all checks return `false`.                 |
| `fallback`  | `ReactNode`                                | `null`                     | Optional UI displayed while `isLoading` is `true`.                                   |
| `children`  | `ReactNode`                                | `undefined`                | Child components.                                                                    |

#### `<Can>`

Conditionally renders children if the authenticated subject possesses the specified permission and passes policy checks.

| Prop         | Type                      | Default      | Description                                              |
| :----------- | :------------------------ | :----------- | :------------------------------------------------------- |
| `permission` | `string`                  | **Required** | The permission string required to display the children.  |
| `context`    | `Record<string, unknown>` | `undefined`  | Context object passed to dynamic authorization policies. |
| `fallback`   | `ReactNode`               | `null`       | Element rendered when access is denied or while loading. |
| `children`   | `ReactNode`               | **Required** | Content revealed when permission is granted.             |

#### `<Feature>`

Conditionally renders children if the specified feature flag is enabled.

| Prop       | Type        | Default      | Description                                                   |
| :--------- | :---------- | :----------- | :------------------------------------------------------------ |
| `flag`     | `string`    | **Required** | The feature flag key to check.                                |
| `fallback` | `ReactNode` | `null`       | Element rendered when the feature flag is disabled or absent. |
| `children` | `ReactNode` | **Required** | Content revealed when feature flag is active.                 |

---

### Hooks

| Hook             | Signature                                                       | Description                                                                           |
| :--------------- | :-------------------------------------------------------------- | :------------------------------------------------------------------------------------ |
| `usePermission`  | `(permission: string, options?: EvaluateOptions) => boolean`    | Evaluates permission with optional contextual policy options.                         |
| `useCanAll`      | `(permissions: string[], options?: EvaluateOptions) => boolean` | Returns `true` only if subject has **all** listed permissions.                        |
| `useCanAny`      | `(permissions: string[], options?: EvaluateOptions) => boolean` | Returns `true` if subject has **at least one** listed permission.                     |
| `useFeatureFlag` | `(key: string) => boolean`                                      | Returns `true` if feature flag is active and enabled.                                 |
| `useGatekeeper`  | `() => GatekeeperContextValue`                                  | Returns full context: `{ subject, flags, isLoading, can, roleMap, policy, context }`. |

---

## License

MIT © [Ahmed Tamer](https://github.com/Ahmed1092002)
