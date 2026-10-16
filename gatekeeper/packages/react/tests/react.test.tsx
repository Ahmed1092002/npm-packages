import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Can,
  Feature,
  GatekeeperProvider,
  useFeatureFlag,
  useGatekeeper,
  usePermission,
} from '../src/index.js';
import type { GatekeeperUser } from '@gatekeeper/core';

describe('@gatekeeper/react', () => {
  const adminUser: GatekeeperUser = {
    id: 'user-admin',
    name: 'Admin User',
    role: 'admin',
  };

  const memberUser: GatekeeperUser = {
    id: 'user-member',
    name: 'Member User',
    role: 'member',
  };

  const sampleFlags = {
    'new-dashboard': true,
    'beta-analytics': false,
  };

  describe('<Can /> component', () => {
    it('renders children when user has permission', () => {
      render(
        <GatekeeperProvider user={adminUser}>
          <Can permission="users.delete" fallback={<div>Forbidden</div>}>
            <div>Delete User Button</div>
          </Can>
        </GatekeeperProvider>,
      );

      expect(screen.getByText('Delete User Button')).toBeInTheDocument();
      expect(screen.queryByText('Forbidden')).not.toBeInTheDocument();
    });

    it('renders fallback when user lacks permission', () => {
      render(
        <GatekeeperProvider user={memberUser}>
          <Can permission="users.delete" fallback={<div>Forbidden Fallback</div>}>
            <div>Delete User Button</div>
          </Can>
        </GatekeeperProvider>,
      );

      expect(screen.queryByText('Delete User Button')).not.toBeInTheDocument();
      expect(screen.getByText('Forbidden Fallback')).toBeInTheDocument();
    });

    it('renders nothing when denied and no fallback is supplied', () => {
      const { container } = render(
        <GatekeeperProvider user={memberUser}>
          <Can permission="users.delete">
            <div>Delete User Button</div>
          </Can>
        </GatekeeperProvider>,
      );

      expect(container).toBeEmptyDOMElement();
    });

    it('supports multiple permissions with requireAll', () => {
      render(
        <GatekeeperProvider user={adminUser}>
          <Can
            permissions={['users.read', 'users.create']}
            requireAll={true}
            fallback={<div>Forbidden</div>}
          >
            <div>User Admin Panel</div>
          </Can>
        </GatekeeperProvider>,
      );

      expect(screen.getByText('User Admin Panel')).toBeInTheDocument();
    });
  });

  describe('<Feature /> component', () => {
    it('renders children when feature flag is enabled', () => {
      render(
        <GatekeeperProvider user={memberUser} flags={sampleFlags}>
          <Feature flag="new-dashboard" fallback={<div>Old Dashboard</div>}>
            <div>Modern Dashboard View</div>
          </Feature>
        </GatekeeperProvider>,
      );

      expect(screen.getByText('Modern Dashboard View')).toBeInTheDocument();
      expect(screen.queryByText('Old Dashboard')).not.toBeInTheDocument();
    });

    it('renders fallback when feature flag is disabled', () => {
      render(
        <GatekeeperProvider user={memberUser} flags={sampleFlags}>
          <Feature flag="beta-analytics" fallback={<div>Analytics Inactive</div>}>
            <div>Live Beta Charts</div>
          </Feature>
        </GatekeeperProvider>,
      );

      expect(screen.queryByText('Live Beta Charts')).not.toBeInTheDocument();
      expect(screen.getByText('Analytics Inactive')).toBeInTheDocument();
    });
  });

  describe('Hooks: usePermission and useFeatureFlag', () => {
    const TestHookConsumer = () => {
      const canRead = usePermission('users.read');
      const canDelete = usePermission('users.delete');
      const hasDashboard = useFeatureFlag('new-dashboard');
      const hasBeta = useFeatureFlag('beta-analytics');

      return (
        <div>
          <span data-testid="can-read">{canRead ? 'yes' : 'no'}</span>
          <span data-testid="can-delete">{canDelete ? 'yes' : 'no'}</span>
          <span data-testid="flag-dashboard">{hasDashboard ? 'on' : 'off'}</span>
          <span data-testid="flag-beta">{hasBeta ? 'on' : 'off'}</span>
        </div>
      );
    };

    it('returns correct permission and flag evaluations for manager', () => {
      const managerUser: GatekeeperUser = {
        id: 'u-mgr',
        role: 'manager',
      };

      render(
        <GatekeeperProvider user={managerUser} flags={sampleFlags}>
          <TestHookConsumer />
        </GatekeeperProvider>,
      );

      expect(screen.getByTestId('can-read')).toHaveTextContent('yes');
      expect(screen.getByTestId('can-delete')).toHaveTextContent('no');
      expect(screen.getByTestId('flag-dashboard')).toHaveTextContent('on');
      expect(screen.getByTestId('flag-beta')).toHaveTextContent('off');
    });

    it('throws error when hook used outside GatekeeperProvider', () => {
      const BadComponent = () => {
        useGatekeeper();
        return null;
      };

      expect(() => render(<BadComponent />)).toThrow(
        'useGatekeeper must be used within a <GatekeeperProvider>',
      );
    });
  });

  describe('Loading states and safe fallbacks', () => {
    it('renders provider fallback when isLoading is true and fallback is supplied', () => {
      render(
        <GatekeeperProvider
          user={adminUser}
          isLoading={true}
          fallback={<div>Loading Gatekeeper...</div>}
        >
          <div>Protected Content</div>
        </GatekeeperProvider>,
      );

      expect(screen.getByText('Loading Gatekeeper...')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('fails safe in <Feature /> component during loading without leaking enabled content', () => {
      render(
        <GatekeeperProvider user={adminUser} flags={{ 'new-dashboard': true }} isLoading={true}>
          <Feature flag="new-dashboard" fallback={<div>Feature Loading Fallback</div>}>
            <div>Confidential Beta Feature</div>
          </Feature>
        </GatekeeperProvider>,
      );

      // Must NOT render enabled feature while loading
      expect(screen.queryByText('Confidential Beta Feature')).not.toBeInTheDocument();
      // Must render fallback
      expect(screen.getByText('Feature Loading Fallback')).toBeInTheDocument();
    });

    it('ensures hooks return false and empty permissions during loading', () => {
      const LoadingHookConsumer = () => {
        const canDelete = usePermission('users.delete');
        const hasDashboard = useFeatureFlag('new-dashboard');
        const { effectivePermissions } = useGatekeeper();

        return (
          <div>
            <span data-testid="load-can-delete">{canDelete ? 'true' : 'false'}</span>
            <span data-testid="load-flag">{hasDashboard ? 'true' : 'false'}</span>
            <span data-testid="load-perms-count">{effectivePermissions.length}</span>
          </div>
        );
      };

      render(
        <GatekeeperProvider user={adminUser} flags={{ 'new-dashboard': true }} isLoading={true}>
          <LoadingHookConsumer />
        </GatekeeperProvider>,
      );

      expect(screen.getByTestId('load-can-delete')).toHaveTextContent('false');
      expect(screen.getByTestId('load-flag')).toHaveTextContent('false');
      expect(screen.getByTestId('load-perms-count')).toHaveTextContent('0');
    });
  });
});
