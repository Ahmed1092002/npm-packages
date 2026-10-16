import type { Request, Response } from 'express';
import type { GatekeeperUser, Permission, RolePermissionsMap } from '@ahmedtamer/gatekeeper-core';

export type UnauthorizedHandler = (res: Response, req: Request) => void | Promise<void>;
export type ForbiddenHandler = (
  res: Response,
  missingPermissions: Permission[],
  req: Request,
) => void | Promise<void>;

// Safely extend the Express namespace so TypeScript consumers get typing for req.user
declare global {
  namespace Express {
    interface Request {
      user?: GatekeeperUser;
      gatekeeperFlags?: Record<string, boolean>;
      gatekeeperOptions?: GatekeeperMiddlewareOptions;
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
  getUser?: (req: Request) => GatekeeperUser | undefined | null;

  /**
   * Optional feature flag resolver.
   */
  getFlags?: (req: Request) => Record<string, boolean> | undefined;

  /**
   * Custom unauthorized response handler for missing users (defaults to 401 JSON).
   */
  onUnauthorized?: UnauthorizedHandler;

  /**
   * Custom forbidden response handler for denied permissions (defaults to 403 JSON).
   */
  onForbidden?: ForbiddenHandler;
}

export interface PermissionMiddlewareOptions {
  roleMap?: RolePermissionsMap;
  getUser?: (req: Request) => GatekeeperUser | undefined | null;
  /**
   * Custom unauthorized response handler overriding global settings.
   */
  onUnauthorized?: UnauthorizedHandler;
  /**
   * Custom forbidden response handler overriding global settings.
   */
  onForbidden?: ForbiddenHandler;
}

export interface FeatureFlagMiddlewareOptions {
  getFlags?: (req: Request) => Record<string, boolean> | undefined;
}
