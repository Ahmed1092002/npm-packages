import { describe, expect, it } from 'vitest';
import {
  can,
  canAll,
  canAny,
  defineRolePermissions,
  evaluatePermission,
  getUserEffectivePermissions,
  isFeatureEnabled,
  normalizeFeatureFlags,
  type FeatureFlag,
  type GatekeeperUser,
} from '../src/index.js';

describe('@ahmedtamer/gatekeeper-core - Evaluator & Roles', () => {
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

  describe('Admin access', () => {
    it('allows admin access to all standard permissions', () => {
      expect(can(adminUser, 'users.read')).toBe(true);
      expect(can(adminUser, 'users.create')).toBe(true);
      expect(can(adminUser, 'users.delete')).toBe(true);
      expect(can(adminUser, 'reports.view')).toBe(true);
      expect(can(adminUser, 'settings.manage')).toBe(true);
    });

    it('canAll returns true when admin requests all permissions', () => {
      expect(canAll(adminUser, ['users.read', 'users.delete', 'settings.manage'])).toBe(true);
    });
  });

  describe('Manager access', () => {
    it('allows manager access to reports.view and users.read', () => {
      expect(can(managerUser, 'users.read')).toBe(true);
      expect(can(managerUser, 'reports.view')).toBe(true);
    });

    it('denies manager access to users.delete and settings.manage', () => {
      expect(can(managerUser, 'users.delete')).toBe(false);
      expect(can(managerUser, 'settings.manage')).toBe(false);
    });

    it('canAny returns true if manager has at least one requested permission', () => {
      expect(canAny(managerUser, ['users.delete', 'users.read'])).toBe(true);
      expect(canAny(managerUser, ['users.delete', 'settings.manage'])).toBe(false);
    });
  });

  describe('Member denial', () => {
    it('denies member access to sensitive permissions', () => {
      expect(can(memberUser, 'users.read')).toBe(false);
      expect(can(memberUser, 'users.create')).toBe(false);
      expect(can(memberUser, 'users.delete')).toBe(false);
      expect(can(memberUser, 'settings.manage')).toBe(false);
    });

    it('allows member access only to reports.view by default', () => {
      expect(can(memberUser, 'reports.view')).toBe(true);
    });

    it('evaluatePermission provides descriptive denial reasons', () => {
      const result = evaluatePermission(memberUser, 'users.delete');
      expect(result.allowed).toBe(false);
      expect(result.missingPermissions).toContain('users.delete');
      expect(result.reason).toContain("role 'member' lacks required permission 'users.delete'");
    });
  });

  describe('Direct permissions', () => {
    it('grants direct user permission even if role lacks it', () => {
      const userWithDirectPermission: GatekeeperUser = {
        id: 'user-special',
        role: 'member',
        permissions: ['users.read', 'custom.audit'],
      };

      // Role gives reports.view
      expect(can(userWithDirectPermission, 'reports.view')).toBe(true);
      // Direct permissions give users.read and custom.audit
      expect(can(userWithDirectPermission, 'users.read')).toBe(true);
      expect(can(userWithDirectPermission, 'custom.audit')).toBe(true);
      // Still denied other permissions
      expect(can(userWithDirectPermission, 'users.delete')).toBe(false);
    });

    it('returns combined effective permissions as a Set', () => {
      const customUser: GatekeeperUser = {
        id: 'u-1',
        role: 'manager',
        permissions: ['settings.manage'],
      };
      const perms = getUserEffectivePermissions(customUser);
      expect(perms.has('users.read')).toBe(true);
      expect(perms.has('reports.view')).toBe(true);
      expect(perms.has('settings.manage')).toBe(true);
      expect(perms.size).toBe(3);
    });
  });

  describe('Missing authenticated user', () => {
    it('returns false when user is null or undefined', () => {
      expect(can(null, 'users.read')).toBe(false);
      expect(can(undefined, 'users.read')).toBe(false);
      expect(canAll(null, ['users.read'])).toBe(false);
      expect(canAny(null, ['users.read'])).toBe(false);
    });

    it('evaluatePermission indicates missing user', () => {
      const result = evaluatePermission(null, 'users.read');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('No authenticated user provided.');
    });
  });

  describe('Custom role permissions', () => {
    it('allows custom role map override', () => {
      const customRoleMap = defineRolePermissions({
        analyst: ['reports.view', 'analytics.export'],
      });

      const analystUser: GatekeeperUser = {
        id: 'u-analyst',
        role: 'analyst',
      };

      expect(can(analystUser, 'analytics.export', customRoleMap)).toBe(true);
      expect(can(analystUser, 'users.read', customRoleMap)).toBe(false);
    });
  });

  describe('Feature flag evaluation', () => {
    it('evaluates boolean record flags', () => {
      const flags = {
        'new-dashboard': true,
        'beta-analytics': false,
      };

      expect(isFeatureEnabled(flags, 'new-dashboard')).toBe(true);
      expect(isFeatureEnabled(flags, 'beta-analytics')).toBe(false);
      expect(isFeatureEnabled(flags, 'non-existent')).toBe(false);
    });

    it('evaluates FeatureFlag array', () => {
      const flags: FeatureFlag[] = [
        { key: 'export-reports', enabled: true },
        { key: 'beta-analytics', enabled: false },
      ];

      expect(isFeatureEnabled(flags, 'export-reports')).toBe(true);
      expect(isFeatureEnabled(flags, 'beta-analytics')).toBe(false);
      expect(isFeatureEnabled(flags, 'unknown')).toBe(false);
    });

    it('normalizes flag representations correctly', () => {
      const flagsArray: FeatureFlag[] = [
        { key: 'feat-1', enabled: true },
        { key: 'feat-2', enabled: false },
      ];
      const normalized = normalizeFeatureFlags(flagsArray);
      expect(normalized).toEqual({
        'feat-1': true,
        'feat-2': false,
      });
    });

    it('handles undefined or null flags safely', () => {
      expect(isFeatureEnabled(undefined, 'any')).toBe(false);
    });
  });
});
