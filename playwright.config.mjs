import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 3,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: process.env.SITE_URL || 'http://127.0.0.1:8787', trace: 'retain-on-failure' },
  webServer: process.env.SITE_URL ? undefined : {
    command: 'npx wrangler dev --ip 127.0.0.1 --host localhost --port 8787',
    url: 'http://127.0.0.1:8787',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
