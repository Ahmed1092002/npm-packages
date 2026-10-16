import type { NextFunction, Request, Response, RequestHandler } from 'express';
import {
  can as coreCan,
  canAny as coreCanAny,
  isFeatureEnabled,
  type Permission,
} from '@gatekeeper/core';
import type {
  FeatureFlagMiddlewareOptions,
  GatekeeperMiddlewareOptions,
  PermissionMiddlewareOptions,
} from './types.js';

/**
 * Standard HTTP 401 response payload.
 */
export const UNAUTHORIZED_PAYLOAD = {
  error: 'UNAUTHORIZED',
  message: 'Authentication required.',
};

/**
 * Standard HTTP 403 response payload.
 */
export const FORBIDDEN_PAYLOAD = {
  error: 'FORBIDDEN',
  message: 'You do not have permission to perform this action.',
};

/**
 * Global Gatekeeper middleware that attaches utility helpers to the Request object.
 */
export function gatekeeperMiddleware(options: GatekeeperMiddlewareOptions = {}): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    req.gatekeeperOptions = options;

    const user = options.getUser ? options.getUser(req) : req.user;
    if (user && !req.user) {
      req.user = user;
    }

    if (options.getFlags && !req.gatekeeperFlags) {
      req.gatekeeperFlags = options.getFlags(req);
    }

    req.can = (permission: Permission): boolean => {
      const activeUser = options.getUser ? options.getUser(req) : req.user;
      return coreCan(activeUser, permission, options.roleMap);
    };

    next();
  };
}

/**
 * Express middleware requiring the authenticated user to possess a specific permission.
 *
 * @param permission - The permission required to access the route.
 * @param options - Optional custom role map, user extractor, or failure callbacks.
 */
export function requirePermission(
  permission: Permission,
  options: PermissionMiddlewareOptions = {},
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userExtractor = options.getUser ?? req.gatekeeperOptions?.getUser;
    const user = userExtractor ? userExtractor(req) : req.user;
    const roleMap = options.roleMap ?? req.gatekeeperOptions?.roleMap;

    // Missing authenticated user -> 401 or custom onUnauthorized handler
    if (!user) {
      const onUnauthorized = options.onUnauthorized ?? req.gatekeeperOptions?.onUnauthorized;
      if (onUnauthorized) {
        await onUnauthorized(res, req);
        return;
      }
      res.status(401).json(UNAUTHORIZED_PAYLOAD);
      return;
    }

    // Permission check -> 403 or custom onForbidden handler if denied
    const hasPermission = coreCan(user, permission, roleMap);
    if (!hasPermission) {
      const onForbidden = options.onForbidden ?? req.gatekeeperOptions?.onForbidden;
      if (onForbidden) {
        await onForbidden(res, [permission], req);
        return;
      }
      res.status(403).json(FORBIDDEN_PAYLOAD);
      return;
    }

    next();
  };
}

/**
 * Express middleware requiring the authenticated user to possess AT LEAST ONE
 * of the specified permissions.
 */
export function requireAnyPermission(
  permissions: Permission[],
  options: PermissionMiddlewareOptions = {},
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userExtractor = options.getUser ?? req.gatekeeperOptions?.getUser;
    const user = userExtractor ? userExtractor(req) : req.user;
    const roleMap = options.roleMap ?? req.gatekeeperOptions?.roleMap;

    if (!user) {
      const onUnauthorized = options.onUnauthorized ?? req.gatekeeperOptions?.onUnauthorized;
      if (onUnauthorized) {
        await onUnauthorized(res, req);
        return;
      }
      res.status(401).json(UNAUTHORIZED_PAYLOAD);
      return;
    }

    const hasAny = coreCanAny(user, permissions, roleMap);
    if (!hasAny) {
      const onForbidden = options.onForbidden ?? req.gatekeeperOptions?.onForbidden;
      if (onForbidden) {
        await onForbidden(res, permissions, req);
        return;
      }
      res.status(403).json(FORBIDDEN_PAYLOAD);
      return;
    }

    next();
  };
}

/**
 * Express middleware that guards an endpoint behind a feature flag.
 */
export function requireFeatureFlag(
  flagKey: string,
  options: FeatureFlagMiddlewareOptions = {},
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const flagsResolver = options.getFlags ?? req.gatekeeperOptions?.getFlags;
    const flags = flagsResolver ? flagsResolver(req) : req.gatekeeperFlags;

    const enabled = isFeatureEnabled(flags, flagKey);
    if (!enabled) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: `Feature '${flagKey}' is disabled.`,
      });
      return;
    }

    next();
  };
}
