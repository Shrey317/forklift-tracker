import { defineConfig, devices } from '@playwright/test';

/**
 * NOT VERIFIED IN THE SANDBOX THIS WAS BUILT IN — there is no browser
 * available here at all, so this config and every test under tests/e2e/
 * were authored against Playwright's documented API and this project's
 * own routes, but never actually run. This is a meaningfully different
 * (weaker) confidence level than everything else in this codebase, which
 * was checked against a real running Postgres wherever the sandbox
 * allowed it. Run `pnpm exec playwright test` for real before trusting
 * these — start there, not with the CI pipeline.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI, // fails the build if someone accidentally commits a .only()
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: process.env.APP_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  // Section 28: end-to-end tests run against the same disposable database
  // as the integration tests — this starts the actual app server against
  // whatever DATABASE_URL/DIRECT_URL the environment already has set
  // (the CI workflow sets these to the ephemeral postgres service
  // container before this ever runs).
  webServer: {
    command: 'pnpm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
