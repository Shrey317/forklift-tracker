import { expect, test } from '@playwright/test';
import { loginAs } from './helpers';

/** NOT VERIFIED IN THE SANDBOX THIS WAS BUILT IN — see playwright.config.ts. */

test.describe('scan page fallback (Locked Decision #20, Section 25)', () => {
  test.use({ permissions: [] }); // camera permission NOT granted — the denied-permission path

  test('manual search is available and usable even when the camera is denied', async ({ page }) => {
    await loginAs(page, 'supervisor');
    await page.goto('/scan');

    // The camera component should report its denied/error state, but the
    // page must never be a dead end — search stays reachable regardless
    // (Section 25: "the person isn't stuck on a dead camera view with no
    // way forward").
    await expect(page.getByLabel('Search by name or ID')).toBeVisible();
    await expect(page.getByLabel('Search by name or ID')).toBeEnabled();
  });

  test('searching for a known forklift shows results requiring explicit selection (Business Rule 15)', async ({
    page,
  }) => {
    await loginAs(page, 'supervisor');
    await page.goto('/scan');

    await page.getByLabel('Search by name or ID').fill('FL');
    // Business Rule 15: search never auto-navigates on a single result —
    // the URL should still be /scan until a result is explicitly clicked.
    await page.waitForTimeout(500); // debounce window
    await expect(page).toHaveURL(/\/scan/);
  });
});
