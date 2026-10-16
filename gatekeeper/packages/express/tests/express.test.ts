import express, { type Request, type Response } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { GatekeeperUser } from '@gatekeeper/core';
import {
  gatekeeperMiddleware,
  requireAnyPermission,
  requireFeatureFlag,
  requirePermission,
} from '../src/index.js';

describe('@gatekeeper/express Middleware', () => {
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
});
