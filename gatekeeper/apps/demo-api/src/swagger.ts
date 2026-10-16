export const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Gatekeeper Demo API',
    version: '1.0.0',
    description:
      'Reference implementation of an Express backend guarded by @ahmedtamer/gatekeeper-express middleware and @ahmedtamer/gatekeeper-core RBAC. Note: This OpenAPI specification is currently manually maintained for demonstration and exploratory purposes, rather than auto-generated from route declarations.',
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Local development server',
    },
  ],
  components: {
    securitySchemes: {
      DemoUserIdAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-demo-user-id',
        description:
          'Pass seeded user ID: "user-admin", "user-manager", or "user-member" to simulate authentication.',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'FORBIDDEN' },
          message: {
            type: 'string',
            example: 'You do not have permission to perform this action.',
          },
        },
        required: ['error', 'message'],
      },
      GatekeeperUser: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'user-admin' },
          name: { type: 'string', example: 'Alice Admin' },
          email: { type: 'string', example: 'alice@gatekeeper.dev' },
          role: { type: 'string', example: 'admin' },
          permissions: {
            type: 'array',
            items: { type: 'string' },
            example: ['users.read', 'users.create', 'users.delete'],
          },
        },
        required: ['id', 'role'],
      },
      Report: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'rep-01' },
          title: { type: 'string', example: 'Compliance Audit' },
          category: { type: 'string', example: 'Security' },
          date: { type: 'string', example: '2026-10-10' },
          status: { type: 'string', example: 'Ready' },
          summary: { type: 'string' },
        },
      },
      FeatureFlag: {
        type: 'object',
        properties: {
          key: { type: 'string', example: 'new-dashboard' },
          enabled: { type: 'boolean', example: true },
          description: { type: 'string' },
        },
      },
    },
  },
  security: [
    {
      DemoUserIdAuth: [],
    },
  ],
  paths: {
    '/api/me': {
      get: {
        summary: 'Get current user profile and effective permissions',
        tags: ['Authentication & Session'],
        responses: {
          200: {
            description: 'Current user profile with roles, permissions, and active feature flags',
          },
          401: {
            description: 'Authentication required when header is absent',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/api/feature-flags': {
      get: {
        summary: 'Get system feature flags',
        tags: ['Feature Flags'],
        security: [],
        responses: {
          200: {
            description: 'List of all system feature flags and active status',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/FeatureFlag' },
                },
              },
            },
          },
        },
      },
    },
    '/api/feature-flags/{key}/toggle': {
      post: {
        summary: 'Toggle feature flag state',
        tags: ['Feature Flags'],
        description: 'Requires "settings.manage" permission (admin only).',
        parameters: [
          {
            name: 'key',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Key of the feature flag to toggle',
          },
        ],
        responses: {
          200: {
            description: 'Flag successfully toggled',
          },
          401: {
            description: 'Unauthorized (missing x-demo-user-id header)',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          403: {
            description: 'Forbidden (lacks settings.manage)',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          404: {
            description: 'Flag not found',
          },
        },
      },
    },
    '/api/reports': {
      get: {
        summary: 'List reports',
        tags: ['Reports'],
        description: 'Requires "reports.view" permission.',
        responses: {
          200: {
            description: 'Array of reports',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Report' },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized (missing x-demo-user-id header)',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          403: {
            description: 'Forbidden (lacks reports.view)',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/api/reports/export': {
      get: {
        summary: 'Export reports as CSV',
        tags: ['Reports'],
        description: 'Requires "reports.view" permission and "export-reports" feature flag.',
        responses: {
          200: {
            description: 'CSV document containing reports',
            content: {
              'text/csv': {
                schema: { type: 'string' },
              },
            },
          },
          401: {
            description: 'Unauthorized',
          },
          403: {
            description: 'Forbidden (missing permission or feature flag disabled)',
          },
        },
      },
    },
    '/api/users': {
      get: {
        summary: 'List system users',
        tags: ['User Management'],
        description: 'Requires "users.read" permission.',
        responses: {
          200: {
            description: 'List of users',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/GatekeeperUser' },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          403: {
            description: 'Forbidden (lacks users.read)',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/api/users/{id}': {
      delete: {
        summary: 'Delete user by ID',
        tags: ['User Management'],
        description: 'Requires "users.delete" permission (admin only).',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID of the user to delete',
          },
        ],
        responses: {
          200: {
            description: 'User successfully deleted',
          },
          401: {
            description: 'Unauthorized',
          },
          403: {
            description: 'Forbidden (lacks users.delete)',
          },
          404: {
            description: 'User not found',
          },
        },
      },
    },
    '/api/settings': {
      get: {
        summary: 'Get organization security and system settings',
        tags: ['Settings'],
        description: 'Requires "settings.manage" permission (admin only).',
        responses: {
          200: {
            description: 'Current system configuration settings',
          },
          401: {
            description: 'Unauthorized',
          },
          403: {
            description: 'Forbidden (lacks settings.manage)',
          },
        },
      },
    },
    '/api/reset': {
      post: {
        summary: 'Reset in-memory demo data store to initial seed values',
        tags: ['System'],
        description: 'Requires "settings.manage" permission (admin only).',
        responses: {
          200: {
            description: 'Demo store reset successfully',
          },
          401: {
            description: 'Unauthorized',
          },
          403: {
            description: 'Forbidden (lacks settings.manage)',
          },
        },
      },
    },
    '/health': {
      get: {
        summary: 'Service health check',
        tags: ['System'],
        security: [],
        responses: {
          200: {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'healthy' },
                    timestamp: { type: 'string', example: '2026-10-17T00:00:00.000Z' },
                  },
                  required: ['status', 'timestamp'],
                },
              },
            },
          },
        },
      },
    },
    '/api/docs/json': {
      get: {
        summary: 'Get OpenAPI 3.0 specification in JSON format',
        tags: ['Documentation'],
        security: [],
        responses: {
          200: {
            description: 'OpenAPI 3.0 specification document',
          },
        },
      },
    },
  },
};
