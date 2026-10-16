import type { GatekeeperUser, Permission, RolePermissionsMap } from '@gatekeeper/core';

// Safely extend the Express namespace so TypeScript consumers get typing for req.user
declare global {
  namespace Express {
    interface Request {
      user?: GatekeeperUser;
      gatekeeperFlags?: Record<string, boolean>;
      can?: (permission: Permission) => boolean;
    }
  }
}

export interface GatekeeperMiddlewareOptions {
  /**
   * Optional custom role-to-permissions map to use across middleware checks.
   */
  roleMap?: RolePermissionsMap;

  /**
   * Optional custom user extractor if user is stored in a non-standard property.
   */
  getUser?: (req: unknown) => GatekeeperUser | undefined | null;

  /**
   * Optional feature flag resolver.
   */
  getFlags?: (req: unknown) => Record<string, boolean> | undefined;

  /**
   * Custom unauthorized response handler for missing users (defaults to 401).
   */
  onUnauthorized?: (res: unknown) => void;

  /**
   * Custom forbidden response handler for denied permissions (defaults to 403).
   */
  onForbidden?: (res: unknown, missingPermissions: Permission[]) => void;
}

export interface PermissionMiddlewareOptions {
  roleMap?: RolePermissionsMap;
  getUser?: (req: unknown) => GatekeeperUser | undefined | null;
}

export interface FeatureFlagMiddlewareOptions {
  getFlags?: (req: unknown) => Record<string, boolean> | undefined;
}
