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

    it('returns 401 on protected POST /api/feature-flags/:key/toggle', async () => {
      const res = await request(app).post('/api/feature-flags/new-dashboard/toggle');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('UNAUTHORIZED');
    });

    it('returns 401 on protected POST /api/reset', async () => {
      const res = await request(app).post('/api/reset');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('UNAUTHORIZED');
    });

    it('allows unauthenticated access to public GET /api/feature-flags', async () => {
      const res = await request(app).get('/api/feature-flags');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.flags)).toBe(true);
    });

    it('allows unauthenticated access to public GET /health', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
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

    it('can toggle feature flags via POST /api/feature-flags/:key/toggle', async () => {
      const toggleRes = await request(app)
        .post('/api/feature-flags/beta-analytics/toggle')
        .set(adminHeader);

      expect(toggleRes.status).toBe(200);
      expect(toggleRes.body.message).toContain('beta-analytics');

      const flag = store.getFlags().find((f) => f.key === 'beta-analytics');
      expect(flag?.enabled).toBe(true);
    });

    it('returns 404 when toggling non-existent flag as admin', async () => {
      const res = await request(app)
        .post('/api/feature-flags/non-existent-flag/toggle')
        .set(adminHeader);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });

    it('can reset demo store via POST /api/reset', async () => {
      // Mutate something first
      store.deleteUser('user-manager');
      expect(store.findUserById('user-manager')).toBeUndefined();

      // Reset
      const res = await request(app).post('/api/reset').set(adminHeader);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify reset restored users
      expect(store.findUserById('user-manager')).toBeDefined();
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

    it('is forbidden from toggling feature flags (403)', async () => {
      const res = await request(app)
        .post('/api/feature-flags/beta-analytics/toggle')
        .set(managerHeader);
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });

    it('is forbidden from resetting demo store (403)', async () => {
      const res = await request(app).post('/api/reset').set(managerHeader);
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
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

    it('is forbidden from toggling feature flags (403)', async () => {
      const res = await request(app)
        .post('/api/feature-flags/new-dashboard/toggle')
        .set(memberHeader);
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });

    it('is forbidden from resetting demo store (403)', async () => {
      const res = await request(app).post('/api/reset').set(memberHeader);
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });
  });

  describe('Feature Flag guarded routes & OpenAPI spec', () => {
    it('serves OpenAPI specification with explicit security: [] for public endpoints', async () => {
      const res = await request(app).get('/api/docs/json');
      expect(res.status).toBe(200);
      expect(res.body.openapi).toBe('3.0.3');
      expect(res.body.paths['/api/feature-flags/{key}/toggle']).toBeDefined();
      expect(res.body.paths['/api/reset']).toBeDefined();

      // Global security scheme defines DemoUserIdAuth
      expect(res.body.security).toEqual([{ DemoUserIdAuth: [] }]);

      // Public endpoints explicitly override global security with empty array
      expect(res.body.paths['/api/feature-flags'].get.security).toEqual([]);
      expect(res.body.paths['/health'].get.security).toEqual([]);

      // Protected endpoints inherit global security (no security: [] override)
      expect(res.body.paths['/api/me'].get.security).toBeUndefined();
      expect(res.body.paths['/api/users'].get.security).toBeUndefined();
      expect(res.body.paths['/api/settings'].get.security).toBeUndefined();
      expect(res.body.paths['/api/reset'].post.security).toBeUndefined();
      expect(res.body.paths['/api/feature-flags/{key}/toggle'].post.security).toBeUndefined();
    });

    it('allows exporting reports when export-reports flag is enabled', async () => {
      const res = await request(app)
        .get('/api/reports/export')
        .set({ 'x-demo-user-id': 'user-admin' });
      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/csv');
      expect(res.text).toContain('ID,Title,Category,Date,Status,Summary');
    });

    it('safely escapes commas, quotes, and newlines in exported CSV reports', async () => {
      const reports = store.getReports();
      reports.push({
        id: 'rep-test-csv',
        title: 'Audit: "Executive, Summary"',
        category: 'Security',
        date: '2026-10-16',
        status: 'Ready',
        summary: 'Paragraph 1,\nParagraph 2 with "quoted" remarks.',
      });

      const res = await request(app)
        .get('/api/reports/export')
        .set({ 'x-demo-user-id': 'user-admin' });

      expect(res.status).toBe(200);
      expect(res.text).toContain('rep-test-csv');
      // Verify proper RFC 4180 escaping
      expect(res.text).toContain('"Audit: ""Executive, Summary"""');
      expect(res.text).toContain('"Paragraph 1,\nParagraph 2 with ""quoted"" remarks."');
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
