import { defineConfig } from '@playwright/test';

/**
 * Provides Playwright test settings for ShareSkippy's end-to-end suite.
 *
 * The configuration adapts reporting and retries for CI, limits timeouts to keep
 * failure feedback fast, and controls server lifecycle so manual runs can
 * reuse an existing dev server when available.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    headless: true,
    actionTimeout: 10_000,
  },
  webServer: {
    command: 'npm run start',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000,
  },
});
