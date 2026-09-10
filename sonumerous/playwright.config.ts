import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'off',
  },
  projects: [
    { name: 'mobile-320', use: { browserName: 'chromium', viewport: { width: 320, height: 568 } } },
    { name: 'mobile-390', use: { browserName: 'chromium', viewport: { width: 390, height: 844 } } },
    { name: 'desktop-1440', use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } } },
  ],
  webServer: [
    {
      command: 'npx wrangler dev --config wrangler.local.jsonc --port 8791',
      url: 'http://127.0.0.1:8791/api/session',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      cwd: import.meta.dirname,
    },
    {
      command: 'npm run dev',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      cwd: import.meta.dirname,
      env: { SONUMEROUS_API_PORT: '8791' },
    },
  ],
});
