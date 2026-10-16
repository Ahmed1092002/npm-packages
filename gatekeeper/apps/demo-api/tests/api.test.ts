import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { store } from '../src/data.js';
import { createServer } from '../src/server.js';

describe('Demo API Integration Tests', () => {
  let app: ReturnType<typeof createServer>;

  beforeEach(() => {
    store.reset();
    app = createServer();
  });

  describe('Unauthenticated requests (missing x-demo-user-id)', () => {
    it('returns 401 on /api/me', async () => {
      const res = await request(app).get('/api/me');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('UNAUTHORIZED');
    });

    it('returns 401 on protected /api/users', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(401);
    });

    it('returns 401 on protected /api/reports', async () => {
      const res = await request(app).get('/api/reports');
      expect(res.status).toBe(401);
    });
  });

  describe('Admin User (x-demo-user-id: user-admin)', () => {
    const adminHeader = { 'x-demo-user-id': 'user-admin' };

    it('retrieves user profile from /api/me', async () => {
      const res = await request(app).get('/api/me').set(adminHeader);
      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('admin');
      expect(res.body.effectivePermissions).toContain('settings.manage');
    });

    it('can read users from /api/users', async () => {
      const res = await request(app).get('/api/users').set(adminHeader);
      expect(res.status).toBe(200);
      expect(res.body.users.length).toBeGreaterThanOrEqual(3);
    });

    it('can delete a user via DELETE /api/users/:id', async () => {
      const res = await request(app).delete('/api/users/user-member').set(adminHeader);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify deletion in next call
      const listRes = await request(app).get('/api/users').set(adminHeader);
      expect(
        listRes.body.users.find((u: { id: string }) => u.id === 'user-member'),
      ).toBeUndefined();
    });

    it('can access /api/settings', async () => {
      const res = await request(app).get('/api/settings').set(adminHeader);
      expect(res.status).toBe(200);
      expect(res.body.settings.organizationName).toBeDefined();
    });

    it('can access /api/reports', async () => {
      const res = await request(app).get('/api/reports').set(adminHeader);
      expect(res.status).toBe(200);
      expect(res.body.reports.length).toBeGreaterThan(0);
    });
  });

  describe('Manager User (x-demo-user-id: user-manager)', () => {
    const managerHeader = { 'x-demo-user-id': 'user-manager' };

    it('can read users from /api/users', async () => {
      const res = await request(app).get('/api/users').set(managerHeader);
      expect(res.status).toBe(200);
    });

    it('can view reports from /api/reports', async () => {
      const res = await request(app).get('/api/reports').set(managerHeader);
      expect(res.status).toBe(200);
    });

    it('is forbidden from deleting users (403)', async () => {
      const res = await request(app).delete('/api/users/user-member').set(managerHeader);
      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: 'FORBIDDEN',
        message: 'You do not have permission to perform this action.',
      });
    });

    it('is forbidden from viewing settings (403)', async () => {
      const res = await request(app).get('/api/settings').set(managerHeader);
      expect(res.status).toBe(403);
    });
  });

  describe('Member User (x-demo-user-id: user-member)', () => {
    const memberHeader = { 'x-demo-user-id': 'user-member' };

    it('can view reports from /api/reports', async () => {
      const res = await request(app).get('/api/reports').set(memberHeader);
      expect(res.status).toBe(200);
    });

    it('is forbidden from reading users (403)', async () => {
      const res = await request(app).get('/api/users').set(memberHeader);
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });

    it('is forbidden from deleting users (403)', async () => {
      const res = await request(app).delete('/api/users/user-manager').set(memberHeader);
      expect(res.status).toBe(403);
    });

    it('is forbidden from settings (403)', async () => {
      const res = await request(app).get('/api/settings').set(memberHeader);
      expect(res.status).toBe(403);
    });
  });

  describe('Feature Flag guarded routes & OpenAPI spec', () => {
    it('serves OpenAPI specification on /api/docs/json', async () => {
      const res = await request(app).get('/api/docs/json');
      expect(res.status).toBe(200);
      expect(res.body.openapi).toBe('3.0.3');
    });

    it('allows exporting reports when export-reports flag is enabled', async () => {
      const res = await request(app)
        .get('/api/reports/export')
        .set({ 'x-demo-user-id': 'user-admin' });
      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/csv');
    });

    it('denies exporting reports when flag is toggled off', async () => {
      store.setFlag('export-reports', false);

      const res = await request(app)
        .get('/api/reports/export')
        .set({ 'x-demo-user-id': 'user-admin' });
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
      expect(res.body.message).toContain("Feature 'export-reports' is disabled.");
    });
  });
});
