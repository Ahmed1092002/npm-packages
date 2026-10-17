import express, { type Request, type Response } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { AuthorizationPolicy, GatekeeperUser } from '@ahmed109/gatekeeper-core';
import {
  gatekeeperMiddleware,
  requireAnyPermission,
  requireFeatureFlag,
  requirePermission,
} from '../src/index.js';

describe('@ahmed109/gatekeeper-express Middleware', () => {
  const adminUser: GatekeeperUser = {
    id: 'user-admin',
    name: 'Admin User',
    role: 'admin',
  };

  const managerUser: GatekeeperUser = {
    id: 'user-manager',
    name: 'Manager User',
    role: 'manager',
  };

  const memberUser: GatekeeperUser = {
    id: 'user-member',
    name: 'Member User',
    role: 'member',
  };

  // Helper app factory
  const createTestApp = (userOverride?: GatekeeperUser | null, flags?: Record<string, boolean>) => {
    const app = express();
    app.use(express.json());

    // Simulated auth layer
    app.use((req: Request, _res: Response, next) => {
      if (userOverride !== undefined) {
        req.user = userOverride ?? undefined;
      }
      if (flags) {
        req.gatekeeperFlags = flags;
      }
      next();
    });

    app.use(gatekeeperMiddleware());

    // Test routes
    app.get('/protected/users', requirePermission('users.read'), (_req, res) => {
      res.json({ success: true, data: 'users list' });
    });

    app.delete('/protected/users/:id', requirePermission('users.delete'), (_req, res) => {
      res.json({ success: true, message: 'user deleted' });
    });

    app.get('/protected/settings', requirePermission('settings.manage'), (_req, res) => {
      res.json({ success: true, message: 'settings updated' });
    });

    app.get(
      '/protected/any',
      requireAnyPermission(['users.delete', 'reports.view']),
      (_req, res) => {
        res.json({ success: true, message: 'accessed via any' });
      },
    );

    app.get('/protected/feature', requireFeatureFlag('beta-analytics'), (_req, res) => {
      res.json({ success: true, message: 'beta feature accessed' });
    });

    return app;
  };

  describe('Missing authenticated user', () => {
    it('returns HTTP 401 when req.user is absent', async () => {
      const app = createTestApp(null);
      const res = await request(app).get('/protected/users');

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
    });
  });

  describe('Admin access', () => {
    it('allows admin to read users (200 OK)', async () => {
      const app = createTestApp(adminUser);
      const res = await request(app).get('/protected/users');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('allows admin to delete users (200 OK)', async () => {
      const app = createTestApp(adminUser);
      const res = await request(app).delete('/protected/users/42');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('user deleted');
    });

    it('allows admin to manage settings (200 OK)', async () => {
      const app = createTestApp(adminUser);
      const res = await request(app).get('/protected/settings');

      expect(res.status).toBe(200);
    });
  });

  describe('Manager access & limitations', () => {
    it('allows manager to read users (200 OK)', async () => {
      const app = createTestApp(managerUser);
      const res = await request(app).get('/protected/users');

      expect(res.status).toBe(200);
    });

    it('denies manager from deleting users (403 Forbidden)', async () => {
      const app = createTestApp(managerUser);
      const res = await request(app).delete('/protected/users/42');

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: 'FORBIDDEN',
        message: 'You do not have permission to perform this action.',
      });
    });

    it('denies manager from settings.manage (403 Forbidden)', async () => {
      const app = createTestApp(managerUser);
      const res = await request(app).get('/protected/settings');

      expect(res.status).toBe(403);
    });
  });

  describe('Member denial', () => {
    it('denies member from reading users (403 Forbidden)', async () => {
      const app = createTestApp(memberUser);
      const res = await request(app).get('/protected/users');

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: 'FORBIDDEN',
        message: 'You do not have permission to perform this action.',
      });
    });
  });

  describe('Direct permissions', () => {
    it('allows member with direct users.read permission', async () => {
      const memberWithDirectPerm: GatekeeperUser = {
        id: 'member-elevated',
        role: 'member',
        permissions: ['users.read'],
      };

      const app = createTestApp(memberWithDirectPerm);
      const res = await request(app).get('/protected/users');

      expect(res.status).toBe(200);
    });
  });

  describe('requireAnyPermission', () => {
    it('allows member because member has reports.view', async () => {
      const app = createTestApp(memberUser);
      const res = await request(app).get('/protected/any');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('accessed via any');
    });

    it('denies user if user has none of the permissions', async () => {
      const userWithoutAny: GatekeeperUser = {
        id: 'user-guest',
        role: 'guest',
      };
      const app = createTestApp(userWithoutAny);
      const res = await request(app).get('/protected/any');

      expect(res.status).toBe(403);
    });
  });

  describe('requireFeatureFlag', () => {
    it('denies access when feature flag is disabled (403)', async () => {
      const app = createTestApp(adminUser, { 'beta-analytics': false });
      const res = await request(app).get('/protected/feature');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
      expect(res.body.message).toContain("Feature 'beta-analytics' is disabled.");
    });

    it('grants access when feature flag is enabled (200)', async () => {
      const app = createTestApp(adminUser, { 'beta-analytics': true });
      const res = await request(app).get('/protected/feature');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('beta feature accessed');
    });
  });

  describe('Custom onUnauthorized and onForbidden handlers', () => {
    it('invokes route-level onUnauthorized callback when user is missing', async () => {
      const app = express();
      app.get(
        '/custom-unauth',
        requirePermission('users.read', {
          onUnauthorized: (res) => {
            res.status(401).json({ custom: true, code: 'AUTH_REQUIRED' });
          },
        }),
      );

      const res = await request(app).get('/custom-unauth');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ custom: true, code: 'AUTH_REQUIRED' });
    });

    it('invokes route-level onForbidden callback with missing permissions list', async () => {
      const app = express();
      app.use((req, _res, next) => {
        req.user = memberUser;
        next();
      });
      app.get(
        '/custom-forbidden',
        requirePermission('users.delete', {
          onForbidden: (res, missing) => {
            res.status(403).json({
              error: 'ACCESS_DENIED',
              lacking: missing,
            });
          },
        }),
      );

      const res = await request(app).get('/custom-forbidden');
      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: 'ACCESS_DENIED',
        lacking: ['users.delete'],
      });
    });

    it('falls back to global gatekeeperMiddleware onUnauthorized and onForbidden handlers', async () => {
      const app = express();
      app.use(
        gatekeeperMiddleware({
          onUnauthorized: (res) => {
            res.status(401).json({ globalUnauth: true });
          },
          onForbidden: (res, missing) => {
            res.status(403).json({ globalForbidden: true, missing });
          },
        }),
      );

      app.get('/test-route', requirePermission('settings.manage'), (_req, res) => {
        res.json({ ok: true });
      });

      // 1. Unauthenticated -> invokes global onUnauthorized
      const unauthRes = await request(app).get('/test-route');
      expect(unauthRes.status).toBe(401);
      expect(unauthRes.body).toEqual({ globalUnauth: true });

      // 2. Forbidden -> invokes global onForbidden
      const forbiddenApp = express();
      forbiddenApp.use((req, _res, next) => {
        req.user = memberUser;
        next();
      });
      forbiddenApp.use(
        gatekeeperMiddleware({
          onForbidden: (res, missing) => {
            res.status(403).json({ globalForbidden: true, missing });
          },
        }),
      );
      forbiddenApp.get('/test-route', requirePermission('settings.manage'), (_req, res) => {
        res.json({ ok: true });
      });

      const forbRes = await request(forbiddenApp).get('/test-route');
      expect(forbRes.status).toBe(403);
      expect(forbRes.body).toEqual({
        globalForbidden: true,
        missing: ['settings.manage'],
      });
    });

    it('works with requireAnyPermission custom handlers', async () => {
      const app = express();
      app.get(
        '/custom-any-unauth',
        requireAnyPermission(['users.read', 'settings.manage'], {
          onUnauthorized: (res) => {
            res.status(401).json({ error: 'PLEASE_LOGIN' });
          },
        }),
      );

      const res = await request(app).get('/custom-any-unauth');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'PLEASE_LOGIN' });
    });
  });

  describe('Custom getUser and getFlags extractors', () => {
    it('extracts user using route-level getUser option', async () => {
      const app = express();
      app.use((req, _res, next) => {
        (req as unknown as { sessionUser: GatekeeperUser }).sessionUser = adminUser;
        next();
      });

      app.get(
        '/custom-user-route',
        requirePermission('settings.manage', {
          getUser: (req) => (req as unknown as { sessionUser?: GatekeeperUser }).sessionUser,
        }),
        (_req, res) => {
          res.json({ success: true });
        },
      );

      const res = await request(app).get('/custom-user-route');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('extracts flags using custom getFlags resolver in requireFeatureFlag', async () => {
      const app = express();
      app.get(
        '/custom-flag-route',
        requireFeatureFlag('export-reports', {
          getFlags: () => ({ 'export-reports': true }),
        }),
        (_req, res) => {
          res.json({ exported: true });
        },
      );

      const res = await request(app).get('/custom-flag-route');
      expect(res.status).toBe(200);
      expect(res.body.exported).toBe(true);
    });

    it('uses global getUser and getFlags configured in gatekeeperMiddleware', async () => {
      const app = express();
      app.use((req, _res, next) => {
        (req as unknown as { customAuth: GatekeeperUser }).customAuth = adminUser;
        next();
      });

      app.use(
        gatekeeperMiddleware({
          getUser: (req) => (req as unknown as { customAuth?: GatekeeperUser }).customAuth,
          getFlags: () => ({ 'beta-analytics': true }),
        }),
      );

      app.get('/via-global-user', requirePermission('users.create'), (req, res) => {
        res.json({ ok: true, canDelete: req.can?.('users.delete') });
      });

      app.get('/via-global-flag', requireFeatureFlag('beta-analytics'), (_req, res) => {
        res.json({ betaEnabled: true });
      });

      const userRes = await request(app).get('/via-global-user');
      expect(userRes.status).toBe(200);
      expect(userRes.body.canDelete).toBe(true);

      const flagRes = await request(app).get('/via-global-flag');
      expect(flagRes.status).toBe(200);
      expect(flagRes.body.betaEnabled).toBe(true);
    });
  });

  describe('Multiple-role subjects and policy support (v0.2)', () => {
    it('grants access when subject satisfies permission via one of multiple roles', async () => {
      const app = express();
      const customRoleMap = {
        'billing-manager': ['billing.export'],
        'support-agent': ['tickets.reply'],
      };

      const multiRoleSubject = {
        id: 'u-finance',
        roles: ['billing-manager', 'support-agent'],
      };

      app.use((req, _res, next) => {
        req.subject = multiRoleSubject;
        next();
      });

      app.use(gatekeeperMiddleware({ roleMap: customRoleMap }));

      app.get(
        '/billing/export',
        requirePermission('billing.export', { roleMap: customRoleMap }),
        (_req, res) => {
          res.json({ exported: true });
        },
      );

      app.get(
        '/tickets/reply',
        requirePermission('tickets.reply', { roleMap: customRoleMap }),
        (_req, res) => {
          res.json({ replied: true });
        },
      );

      app.get(
        '/admin/settings',
        requirePermission('settings.manage', { roleMap: customRoleMap }),
        (_req, res) => {
          res.json({ managed: true });
        },
      );

      const billRes = await request(app).get('/billing/export');
      expect(billRes.status).toBe(200);

      const ticketRes = await request(app).get('/tickets/reply');
      expect(ticketRes.status).toBe(200);

      const adminRes = await request(app).get('/admin/settings');
      expect(adminRes.status).toBe(403);
    });

    it('supports route-level policy with dynamic context', async () => {
      const app = express();
      app.use((req, _res, next) => {
        req.user = { id: 'usr_doc_owner', role: 'member' };
        next();
      });

      const ownershipPolicy: AuthorizationPolicy = (subject, perm, ctx) => {
        if (perm === 'documents.update') {
          return ctx?.ownerId === subject.id;
        }
        return undefined;
      };

      app.get(
        '/documents/:id',
        requirePermission('documents.update', {
          policy: ownershipPolicy,
          getContext: (req) => ({
            ownerId: req.params.id === 'doc-owned' ? 'usr_doc_owner' : 'someone_else',
          }),
        }),
        (_req, res) => {
          res.json({ updated: true });
        },
      );

      const allowedRes = await request(app).get('/documents/doc-owned');
      expect(allowedRes.status).toBe(200);
      expect(allowedRes.body.updated).toBe(true);

      const deniedRes = await request(app).get('/documents/doc-other');
      expect(deniedRes.status).toBe(403);
    });
  });
});
