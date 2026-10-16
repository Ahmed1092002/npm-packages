import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/core/vitest.config.ts',
      'packages/react/vitest.config.ts',
      'packages/express/vitest.config.ts',
      'apps/demo-api/vitest.config.ts',
    ],
  },
});
