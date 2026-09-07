import type { Page } from '@playwright/test';

/**
 * Matches the CI workflow's seeded test credentials (same values set as
 * ADMIN_PASSWORD/SUPERVISOR_PASSWORD/FUEL_SUPERVISOR_PASSWORD in
 * .github/workflows/ci.yml's test job) — fine to hardcode here since
 * this only ever runs against a disposable test database, never
 * production.
 */
export const TEST_CREDENTIALS = {
  admin: { username: 'admin', password: 'TestAdminPassword123456' },
  supervisor: { username: 'supervisor', password: 'TestSupervisorPassword123456' },
  fuel_supervisor: { username: 'fuel_supervisor', password: 'TestFuelSupervisorPassword123456' },
} as const;

export async function loginAs(page: Page, role: keyof typeof TEST_CREDENTIALS): Promise<void> {
  const { username, password } = TEST_CREDENTIALS[role];
  await page.goto('/login');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}
