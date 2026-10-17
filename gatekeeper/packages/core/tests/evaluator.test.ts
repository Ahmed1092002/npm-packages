import { describe, expect, it } from 'vitest';
import {
  can,
  canAll,
  canAny,
  defineRolePermissions,
  defineRoleHierarchy,
  explain,
  evaluatePermission,
  getUserEffectivePermissions,
  isFeatureEnabled,
  normalizeFeatureFlags,
  type AuthorizationPolicy,
  type FeatureFlag,
  type GatekeeperUser,
} from '../src/index.js';

describe('@ahmed109/gatekeeper-core - Evaluator & Roles', () => {
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

  describe('Empty role map vs. options normalization', () => {
    const noRoles = {};

    it('denies a normally allowed built-in role when empty role map {} is passed', () => {
      // adminUser normally has users.delete, users.read, etc.
      expect(can(adminUser, 'users.delete', noRoles)).toBe(false);
      expect(can(adminUser, 'users.read', noRoles)).toBe(false);
      expect(canAll(adminUser, ['users.read', 'users.delete'], noRoles)).toBe(false);
      expect(canAny(adminUser, ['users.delete', 'reports.view'], noRoles)).toBe(false);

      const result = evaluatePermission(adminUser, 'users.delete', noRoles);
      expect(result.allowed).toBe(false);
      expect(result.missingPermissions).toContain('users.delete');
      expect(result.reason).toContain(
        "User with role 'admin' lacks required permission 'users.delete'",
      );

      const effective = getUserEffectivePermissions(adminUser, noRoles);
      expect(effective.size).toBe(0);
    });

    it('still uses default roles when options argument is omitted or undefined', () => {
      expect(can(adminUser, 'users.delete')).toBe(true);
      expect(can(adminUser, 'users.delete', undefined)).toBe(true);
      expect(canAll(adminUser, ['users.read', 'users.delete'])).toBe(true);
      expect(canAll(adminUser, ['users.read', 'users.delete'], undefined)).toBe(true);
      expect(canAny(adminUser, ['users.delete', 'unknown.perm'])).toBe(true);
      expect(canAny(adminUser, ['users.delete', 'unknown.perm'], undefined)).toBe(true);

      const result = evaluatePermission(adminUser, 'users.delete');
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('Permission granted.');

      const resultUndef = evaluatePermission(adminUser, 'users.delete', undefined);
      expect(resultUndef.allowed).toBe(true);

      const effective = getUserEffectivePermissions(adminUser);
      expect(effective.has('users.delete')).toBe(true);
      expect(effective.has('users.read')).toBe(true);

      const effectiveUndef = getUserEffectivePermissions(adminUser, undefined);
      expect(effectiveUndef.has('users.delete')).toBe(true);
    });

    it('still evaluates a non-empty custom role map correctly', () => {
      const customRoleMap = {
        admin: ['users.read'], // admin only gets users.read, not users.delete
      };

      expect(can(adminUser, 'users.read', customRoleMap)).toBe(true);
      expect(can(adminUser, 'users.delete', customRoleMap)).toBe(false);
      expect(canAll(adminUser, ['users.read'], customRoleMap)).toBe(true);
      expect(canAll(adminUser, ['users.read', 'users.delete'], customRoleMap)).toBe(false);
      expect(canAny(adminUser, ['users.delete', 'users.read'], customRoleMap)).toBe(true);

      const result = evaluatePermission(adminUser, 'users.delete', customRoleMap);
      expect(result.allowed).toBe(false);

      const effective = getUserEffectivePermissions(adminUser, customRoleMap);
      expect(effective.size).toBe(1);
      expect(effective.has('users.read')).toBe(true);
    });

    it('still works with modern EvaluateOptions', () => {
      // EvaluateOptions with explicit empty roleMap
      expect(can(adminUser, 'users.delete', { roleMap: {} })).toBe(false);
      expect(getUserEffectivePermissions(adminUser, { roleMap: {} }).size).toBe(0);

      // EvaluateOptions with custom roleMap
      expect(can(adminUser, 'users.read', { roleMap: { admin: ['users.read'] } })).toBe(true);
      expect(can(adminUser, 'users.delete', { roleMap: { admin: ['users.read'] } })).toBe(false);

      // EvaluateOptions with context and policy
      expect(
        can(adminUser, 'custom.perm', {
          policy: (_subject, _perm, context) => context?.allowAll === true,
          context: { allowAll: true },
        }),
      ).toBe(true);

      // EvaluateOptions with context but no roleMap (falls back to default roles)
      expect(can(adminUser, 'users.delete', { context: { tenantId: '123' } })).toBe(true);
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

  describe('Permission patterns, inheritance, and explanations (v0.3)', () => {
    it('matches namespace wildcards without granting unrelated namespaces', () => {
      const user = { id: 'billing-user', permissions: ['billing.*'] };
      expect(can(user, 'billing.export')).toBe(true);
      expect(can(user, 'billing.refund')).toBe(true);
      expect(can(user, 'users.delete')).toBe(false);
    });

    it('resolves inherited roles and handles cycles safely', () => {
      const hierarchy = defineRoleHierarchy({ admin: ['manager'], manager: ['member'], member: ['admin'] });
      const map = { admin: ['settings.manage'], manager: ['users.read'], member: ['reports.view'] };
      const user = { id: 'u', role: 'admin' };
      expect(can(user, 'reports.view', { roleMap: map, roleHierarchy: hierarchy })).toBe(true);
      expect(can(user, 'users.read', { roleMap: map, roleHierarchy: hierarchy })).toBe(true);
    });

    it('explains the matching wildcard and evaluated inherited roles', () => {
      const result = explain(
        { id: 'u', role: 'admin' },
        'billing.export',
        { roleMap: { admin: ['billing.*'], member: [] }, roleHierarchy: { admin: ['member'] } },
      );
      expect(result.allowed).toBe(true);
      expect(result.matchedPermission).toBe('billing.*');
      expect(result.evaluatedRoles).toEqual(['admin', 'member']);
      expect(result.source).toBe('role-permission');
    });
  });

  describe('Multiple-role & Scoped Policy Evaluation (v0.2)', () => {
    it('evaluates legacy single role', () => {
      const subject = { id: 'u-legacy', role: 'manager' };
      expect(can(subject, 'reports.view')).toBe(true);
      expect(can(subject, 'users.delete')).toBe(false);
    });

    it('combines permissions across multiple roles in roles array', () => {
      const customMap = {
        'billing-manager': ['billing.read', 'billing.export'],
        'support-agent': ['tickets.reply', 'users.read'],
      };

      const user = {
        id: 'u-multi',
        roles: ['billing-manager', 'support-agent'],
      };

      expect(can(user, 'billing.export', customMap)).toBe(true);
      expect(can(user, 'tickets.reply', customMap)).toBe(true);
      expect(can(user, 'users.read', customMap)).toBe(true);
      expect(can(user, 'settings.manage', customMap)).toBe(false);
    });

    it('combines direct permissions with multiple roles and deduplicates', () => {
      const customMap = {
        editor: ['posts.read', 'posts.edit'],
        reviewer: ['posts.read', 'posts.review'],
      };

      const user = {
        id: 'u-combo',
        roles: ['editor', 'reviewer'],
        permissions: ['posts.publish', 'posts.edit'], // posts.edit duplicated
      };

      const effective = getUserEffectivePermissions(user, customMap);
      expect(Array.from(effective).sort()).toEqual([
        'posts.edit',
        'posts.publish',
        'posts.read',
        'posts.review',
      ]);
      expect(can(user, 'posts.publish', customMap)).toBe(true);
      expect(can(user, 'posts.review', customMap)).toBe(true);
    });

    it('denies safely if neither roles nor direct permissions are present', () => {
      const emptyUser = { id: 'u-empty' };
      expect(can(emptyUser, 'reports.view')).toBe(false);
      expect(getUserEffectivePermissions(emptyUser).size).toBe(0);
    });

    describe('Scoped Authorization Policy', () => {
      it('uses decision when policy returns boolean true', () => {
        const user = { id: 'usr_1', role: 'member' }; // member normally lacks settings.manage
        const policy = () => true;

        expect(can(user, 'settings.manage', { policy })).toBe(true);
      });

      it('uses decision when policy returns boolean false', () => {
        const user = { id: 'usr_admin', role: 'admin' }; // admin normally has users.delete
        const policy = () => false;

        expect(can(user, 'users.delete', { policy })).toBe(false);
      });

      it('falls back to normal RBAC when policy returns undefined', () => {
        const user = { id: 'usr_1', role: 'manager' };
        const policy: AuthorizationPolicy = (subject, perm, ctx) => {
          if (perm === 'projects.update') {
            return ctx?.ownerId === subject.id;
          }
          return undefined; // fallback
        };

        // Scoped check with matching context
        expect(can(user, 'projects.update', { policy, context: { ownerId: 'usr_1' } })).toBe(true);

        // Scoped check with non-matching context
        expect(can(user, 'projects.update', { policy, context: { ownerId: 'other_user' } })).toBe(
          false,
        );

        // Fallback to RBAC: manager has reports.view
        expect(can(user, 'reports.view', { policy })).toBe(true);
        // Fallback to RBAC: manager lacks settings.manage
        expect(can(user, 'settings.manage', { policy })).toBe(false);
      });
    });

    describe('Identity Adapters & Normalizers', () => {
      it('normalizes roles with fromRoles', async () => {
        const { fromRoles } = await import('../src/index.js');
        const s1 = fromRoles('u1', 'admin');
        expect(s1.id).toBe('u1');
        expect(s1.roles).toEqual(['admin']);
        expect(s1.role).toBe('admin');

        const s2 = fromRoles({
          id: 'u2',
          roles: ['role-a', 'role-b'],
          attributes: { tenantId: 't-99' },
        });
        expect(s2.id).toBe('u2');
        expect(s2.roles).toEqual(['role-a', 'role-b']);
        expect(s2.attributes?.tenantId).toBe('t-99');
      });

      it('normalizes direct permissions with fromPermissions', async () => {
        const { fromPermissions } = await import('../src/index.js');
        const s = fromPermissions('u1', ['users.read', 'reports.view']);
        expect(s.id).toBe('u1');
        expect(s.permissions).toEqual(['users.read', 'reports.view']);
        expect(s.roles).toEqual([]);
      });

      it('normalizes JWT claims including nested realm_access.roles', async () => {
        const { fromJwtClaims } = await import('../src/index.js');
        const token = {
          sub: 'auth0|123456',
          realm_access: {
            roles: ['finance-admin', 'audit-viewer'],
          },
          email: 'finance@example.com',
          name: 'Finance User',
          org_id: 'org_abc',
        };

        const subject = fromJwtClaims(token);
        expect(subject.id).toBe('auth0|123456');
        expect(subject.roles).toEqual(['finance-admin', 'audit-viewer']);
        expect(subject.email).toBe('finance@example.com');
        expect(subject.name).toBe('Finance User');
        expect(subject.attributes?.org_id).toBe('org_abc');
      });

      it('creates subject from custom domain model with createSubject', async () => {
        const { createSubject } = await import('../src/index.js');
        interface DbAccount {
          accountId: string;
          profile: { fullName: string; contactEmail: string };
          membership: { assignedRoles: string[]; directGrants?: string[] };
          tenant: { id: string; tier: string };
        }

        const dbUser: DbAccount = {
          accountId: 'acc_789',
          profile: { fullName: 'Alex Mercer', contactEmail: 'alex@corp.local' },
          membership: { assignedRoles: ['engineer', 'ops'], directGrants: ['cluster.deploy'] },
          tenant: { id: 'ten_enterprise', tier: 'gold' },
        };

        const subject = createSubject(dbUser, {
          getId: (u) => u.accountId,
          getName: (u) => u.profile.fullName,
          getEmail: (u) => u.profile.contactEmail,
          getRoles: (u) => u.membership.assignedRoles,
          getPermissions: (u) => u.membership.directGrants,
          getAttributes: (u) => ({ tenantId: u.tenant.id, tier: u.tenant.tier }),
        });

        expect(subject.id).toBe('acc_789');
        expect(subject.name).toBe('Alex Mercer');
        expect(subject.roles).toEqual(['engineer', 'ops']);
        expect(subject.permissions).toEqual(['cluster.deploy']);
        expect(subject.attributes).toEqual({ tenantId: 'ten_enterprise', tier: 'gold' });
      });
    });
  });
});
