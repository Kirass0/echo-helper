/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { themeBootScriptPlugin } from './src/app/themeBootScript';

export default defineConfig({
  base: '/echo-helper/',
  plugins: [react(), themeBootScriptPlugin()],
  define: {
    // The build date, stamped once when the bundle is built (shown as "Updated <date>").
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  test: {
    // At most four test files at once, so the Core's heavier suites fit in memory locally and on a 4-core CI runner.
    maxWorkers: 4,
    projects: [
      {
        // Core and other pure TypeScript: plain Node, no DOM.
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        // React components, with React Testing Library.
        extends: true,
        test: {
          name: 'components',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
          setupFiles: ['src/test/setup.ts'],
        },
      },
    ],
  },
});
