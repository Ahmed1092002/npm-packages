export * from './types.js';
export * from './middleware.js';

// Re-export core types for Express consumer convenience
export type {
  GatekeeperUser,
  Permission,
  Role,
  FeatureFlag,
  RolePermissionsMap,
  AuthorizationResult,
} from '@gatekeeper/core';
