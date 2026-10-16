# @ahmedtamer/gatekeeper-core

> Pure, framework-independent authorization and feature-flag evaluator for TypeScript.

Part of the **Gatekeeper** toolkit. Zero runtime dependencies, deterministic evaluation, and full TypeScript type safety for role-based (RBAC) and attribute-based (ABAC) access control.

## Installation

`ash
npm install @ahmedtamer/gatekeeper-core

# or

pnpm add @ahmedtamer/gatekeeper-core

# or

yarn add @ahmedtamer/gatekeeper-core
`

## Features

- **Zero runtime dependencies**: Pure functional logic running identically in Node.js, browsers, Edge runtimes, and Cloudflare Workers.
- **Layered Privilege Model**: Evaluates base role permissions (dmin, manager, member, or custom) combined with explicit user-level direct grants.
- **Feature Flag Engine**: Side-by-side authorization and feature-flag evaluation.
- **Compound Checks**: Built-in support for can(), canAll(), and canAny().

## Quickstart

` ypescript
import { can, canAll, isFeatureEnabled, type GatekeeperUser } from '@ahmedtamer/gatekeeper-core';

const user: GatekeeperUser = {
id: 'usr_123',
name: 'Alice Admin',
email: 'alice@example.com',
role: 'admin',
permissions: ['custom.override'],
};

// Check single permission
if (can(user, 'users.delete')) {
console.log('User can delete users');
}

// Check multiple permissions
if (canAll(user, ['users.read', 'settings.manage'])) {
console.log('User possesses all required permissions');
}

// Evaluate feature flags
const flags = { 'new-dashboard': true, 'beta-analytics': false };
if (isFeatureEnabled('new-dashboard', flags)) {
console.log('Feature is enabled');
}
`

## License

MIT © [Ahmed Tamer](https://github.com/Ahmed1092002)
