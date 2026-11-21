import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

// Runs against the built output (`vite build` first), served by `vite preview` under the Pages base path.
export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  // No retries: a flaky test fails the gate (spec §16).
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/echo-helper/`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/echo-helper/`,
    reuseExistingServer: !process.env.CI,
  },
});
