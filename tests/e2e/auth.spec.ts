import { expect, test } from '@playwright/test';
import { loginAs } from './helpers';

/**
 * NOT VERIFIED IN THE SANDBOX THIS WAS BUILT IN — see playwright.config.ts.
 * Authored against this project's own routes and Playwright's documented
 * API, never actually run. Run these for real before trusting them.
 */

test.describe('login (Section 28)', () => {
  test('admin logs in and lands on the admin dashboard', async ({ page }) => {
    await loginAs(page, 'admin');
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('supervisor logs in and lands on the scan page', async ({ page }) => {
    await loginAs(page, 'supervisor');
    await expect(page).toHaveURL(/\/scan/);
  });

  test('fuel supervisor logs in and lands on the scan page', async ({ page }) => {
    await loginAs(page, 'fuel_supervisor');
    await expect(page).toHaveURL(/\/scan/);
  });

  test('an unknown username and a wrong password produce the identical message (Locked Decision #35)', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByLabel('Username').fill('admin');
    await page.getByLabel('Password').fill('wrong_password_entirely');
    await page.getByRole('button', { name: 'Sign in' }).click();
    const wrongPasswordMessage = await page.getByRole('alert').textContent();

    await page.goto('/login');
    await page.getByLabel('Username').fill('nonexistent_user');
    await page.getByLabel('Password').fill('anything_at_all');
    await page.getByRole('button', { name: 'Sign in' }).click();
    const unknownUserMessage = await page.getByRole('alert').textContent();

    expect(wrongPasswordMessage).toBe(unknownUserMessage);
  });

  test('logging out clears the session — the old cookie no longer authenticates', async ({ page }) => {
    await loginAs(page, 'admin');
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login/);

    // Reusing the browser context (and whatever cookie it still holds)
    // to hit a protected page directly must bounce back to login, not
    // render the protected content.
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
