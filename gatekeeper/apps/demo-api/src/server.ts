import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { getUserEffectivePermissions } from '@ahmed109/gatekeeper-core';
import {
  gatekeeperMiddleware,
  requireFeatureFlag,
  requirePermission,
} from '@ahmed109/gatekeeper-express';
import { store } from './data.js';
import { swaggerDocument } from './swagger.js';
import { formatCsv } from './csv.js';

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Swagger Documentation
  app.get('/api/docs/json', (_req: Request, res: Response) => {
    res.json(swaggerDocument);
  });
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  // Demo Authentication Middleware
  // Reads x-demo-user-id header and associates simulated user
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const demoUserId = req.header('x-demo-user-id');
    if (demoUserId) {
      const user = store.findUserById(demoUserId);
      if (user) {
        req.user = user;
      }
    }

    // Attach active feature flags to request
    req.gatekeeperFlags = store.getFlagsRecord();
    next();
  });

  // Gatekeeper Request Helper Middleware
  app.use(gatekeeperMiddleware());

  // --- Endpoints ---

  /**
   * GET /api/me
   * Returns authenticated user profile, resolved permissions, and active flags.
   */
  app.get('/api/me', (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required. Pass a valid "x-demo-user-id" header.',
      });
      return;
    }

    const effectivePermissions = Array.from(getUserEffectivePermissions(req.user));
    res.json({
      user: req.user,
      effectivePermissions,
      flags: store.getFlagsRecord(),
    });
  });

  /**
   * GET /api/feature-flags
   * Returns list of all system feature flags.
   */
  app.get('/api/feature-flags', (_req: Request, res: Response) => {
    res.json({
      flags: store.getFlags(),
    });
  });

  /**
   * POST /api/feature-flags/:key/toggle
   * Protected: requires 'settings.manage'
   * Allows toggling a feature flag for live experimentation in the demo.
   */
  app.post(
    '/api/feature-flags/:key/toggle',
    requirePermission('settings.manage'),
    (req: Request, res: Response) => {
      const { key } = req.params;
      const currentFlags = store.getFlags();
      const flag = currentFlags.find((f) => f.key === key);

      if (!flag) {
        res.status(404).json({ error: 'NOT_FOUND', message: `Flag '${key}' not found.` });
        return;
      }

      store.setFlag(key, !flag.enabled);
      res.json({
        message: `Feature flag '${key}' is now ${!flag.enabled ? 'enabled' : 'disabled'}.`,
        flags: store.getFlags(),
      });
    },
  );

  /**
   * GET /api/reports
   * Protected: requires 'reports.view'
   */
  app.get('/api/reports', requirePermission('reports.view'), (_req: Request, res: Response) => {
    res.json({
      reports: store.getReports(),
      total: store.getReports().length,
    });
  });

  /**
   * GET /api/reports/export
   * Protected: requires 'reports.view' AND feature flag 'export-reports'
   */
  app.get(
    '/api/reports/export',
    requirePermission('reports.view'),
    requireFeatureFlag('export-reports'),
    (_req: Request, res: Response) => {
      const reports = store.getReports();
      const csv = formatCsv(
        ['ID', 'Title', 'Category', 'Date', 'Status', 'Summary'],
        reports.map((r) => [r.id, r.title, r.category, r.date, r.status, r.summary]),
      );

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="reports-export.csv"');
      res.send(csv);
    },
  );

  /**
   * GET /api/users
   * Protected: requires 'users.read'
   */
  app.get('/api/users', requirePermission('users.read'), (_req: Request, res: Response) => {
    res.json({
      users: store.getUsers(),
      total: store.getUsers().length,
    });
  });

  /**
   * DELETE /api/users/:id
   * Protected: requires 'users.delete'
   */
  app.delete('/api/users/:id', requirePermission('users.delete'), (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'User ID is required.' });
      return;
    }

    const deleted = store.deleteUser(id);
    if (!deleted) {
      res.status(404).json({ error: 'NOT_FOUND', message: `User '${id}' not found.` });
      return;
    }

    res.json({
      success: true,
      message: `User '${id}' was successfully deleted.`,
      remainingUsers: store.getUsers(),
    });
  });

  /**
   * GET /api/settings
   * Protected: requires 'settings.manage'
   */
  app.get('/api/settings', requirePermission('settings.manage'), (_req: Request, res: Response) => {
    res.json({
      settings: store.getSettings(),
    });
  });

  /**
   * POST /api/reset
   * Protected: requires 'settings.manage'
   * Resets in-memory demo data to original seed
   */
  app.post('/api/reset', requirePermission('settings.manage'), (_req: Request, res: Response) => {
    store.reset();
    res.json({ success: true, message: 'Demo store reset to seed data.' });
  });

  // Healthcheck endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Global 404 Handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Resource not found' });
  });

  return app;
}
