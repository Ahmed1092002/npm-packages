# @ahmed109/gatekeeper-react

> Declarative React authorization and feature-flag toolkit with fail-safe loading state.

Part of the **Gatekeeper** toolkit. Built on top of [`@ahmed109/gatekeeper-core`](https://www.npmjs.com/package/@ahmed109/gatekeeper-core).

## Installation

```bash
npm install @ahmed109/gatekeeper-react @ahmed109/gatekeeper-core
# or
pnpm add @ahmed109/gatekeeper-react @ahmed109/gatekeeper-core
```

### Peer Dependencies

- `react`: `>=18.0.0`
- `react-dom`: `>=18.0.0`

## Features

- **Fail-Safe Loading**: Authorization decisions default to closed (`false`) during `isLoading: true`, eliminating UI flashes of restricted content.
- **Declarative Guards**: `<Can>` and `<Feature>` components with customizable `fallback` slots.
- **Reactive Hooks**: `usePermission()`, `useFeatureFlag()`, `useCanAll()`, `useCanAny()`, and `useGatekeeper()`.
- **Permission Memoization**: Automatically caches effective permission sets to minimize evaluation overhead.

## Quickstart

```tsx
import React from 'react';
import { GatekeeperProvider, Can, Feature, usePermission } from '@ahmed109/gatekeeper-react';
import type { GatekeeperUser } from '@ahmed109/gatekeeper-core';

const currentUser: GatekeeperUser = {
  id: 'usr_123',
  name: 'Alice',
  role: 'manager',
  permissions: [],
};

const activeFlags = {
  'beta-analytics': true,
};

export function App() {
  return (
    <GatekeeperProvider user={currentUser} flags={activeFlags} isLoading={false}>
      <Dashboard />
    </GatekeeperProvider>
  );
}

function Dashboard() {
  const canManage = usePermission('settings.manage');

  return (
    <div>
      <h1>Operations Dashboard</h1>

      {/* Declarative permission guard */}
      <Can permission="users.read" fallback={<p>Access denied to users list.</p>}>
        <UsersList />
      </Can>

      {/* Declarative feature flag guard */}
      <Feature flag="beta-analytics" fallback={<p>Analytics coming soon.</p>}>
        <AnalyticsPanel />
      </Feature>
    </div>
  );
}
```

## License

MIT © [Ahmed Tamer](https://github.com/Ahmed1092002)
