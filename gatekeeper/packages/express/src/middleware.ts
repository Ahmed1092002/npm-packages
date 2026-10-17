import type { NextFunction, Request, Response, RequestHandler } from 'express';
import {
  can as coreCan,
  canAny as coreCanAny,
  isFeatureEnabled,
  type EvaluateOptions,
  type Permission,
} from '@ahmedtamer/gatekeeper-core';
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

    const extractor = options.getSubject ?? options.getUser;
    const subject = extractor ? extractor(req) : (req.subject ?? req.user);
    if (subject) {
      if (!req.user) req.user = subject;
      if (!req.subject) req.subject = subject;
    }

    if (options.getFlags && !req.gatekeeperFlags) {
      req.gatekeeperFlags = options.getFlags(req);
    }

    req.can = (permission: Permission, canOptions?: EvaluateOptions): boolean => {
      const activeUser = extractor ? extractor(req) : (req.subject ?? req.user);
      const resolvedContext =
        canOptions?.context ??
        options.context ??
        (options.getContext ? options.getContext(req) : undefined);

      return coreCan(activeUser, permission, {
        roleMap: canOptions?.roleMap ?? options.roleMap,
        policy: canOptions?.policy ?? options.policy,
        context: resolvedContext,
      });
    };

    next();
  };
}

/**
 * Express middleware requiring the authenticated user to possess a specific permission.
 *
 * @param permission - The permission required to access the route.
 * @param options - Optional custom role map, user extractor, scoped policy, or failure callbacks.
 */
export function requirePermission(
  permission: Permission,
  options: PermissionMiddlewareOptions = {},
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userExtractor =
      options.getSubject ??
      options.getUser ??
      req.gatekeeperOptions?.getSubject ??
      req.gatekeeperOptions?.getUser;

    const user = userExtractor ? userExtractor(req) : (req.subject ?? req.user);
    const roleMap = options.roleMap ?? req.gatekeeperOptions?.roleMap;
    const policy = options.policy ?? req.gatekeeperOptions?.policy;
    const context =
      options.context ??
      (options.getContext
        ? options.getContext(req)
        : (req.gatekeeperOptions?.context ?? req.gatekeeperOptions?.getContext?.(req)));

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
    const hasPermission = coreCan(user, permission, { roleMap, policy, context });
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
    const userExtractor =
      options.getSubject ??
      options.getUser ??
      req.gatekeeperOptions?.getSubject ??
      req.gatekeeperOptions?.getUser;

    const user = userExtractor ? userExtractor(req) : (req.subject ?? req.user);
    const roleMap = options.roleMap ?? req.gatekeeperOptions?.roleMap;
    const policy = options.policy ?? req.gatekeeperOptions?.policy;
    const context =
      options.context ??
      (options.getContext
        ? options.getContext(req)
        : (req.gatekeeperOptions?.context ?? req.gatekeeperOptions?.getContext?.(req)));

    if (!user) {
      const onUnauthorized = options.onUnauthorized ?? req.gatekeeperOptions?.onUnauthorized;
      if (onUnauthorized) {
        await onUnauthorized(res, req);
        return;
      }
      res.status(401).json(UNAUTHORIZED_PAYLOAD);
      return;
    }

    const hasAny = coreCanAny(user, permissions, { roleMap, policy, context });
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
