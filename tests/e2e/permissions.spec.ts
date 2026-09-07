import { expect, test } from '@playwright/test';
import { loginAs } from './helpers';

/** NOT VERIFIED IN THE SANDBOX THIS WAS BUILT IN — see playwright.config.ts. */

test.describe('permission boundaries (Section 12, 28)', () => {
  test('a non-Admin session cannot reach an /admin/* page', async ({ page }) => {
    await loginAs(page, 'supervisor');
    await page.goto('/admin/dashboard');
    // Redirected away, not shown the page (Section 24: every /admin/*
    // route is Admin only).
    await expect(page).not.toHaveURL(/\/admin\/dashboard/);
  });

  test('Fuel Supervisor cannot reach an /admin/* page either', async ({ page }) => {
    await loginAs(page, 'fuel_supervisor');
    await page.goto('/admin/maintenance');
    await expect(page).not.toHaveURL(/\/admin\/maintenance/);
  });

  test('an unauthenticated request cannot reach a protected page', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('an unauthenticated request cannot reach a protected API route', async ({ request }) => {
    const res = await request.get('/api/dashboard');
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('INVALID_ROLE');
  });

  test('Fuel Supervisor cannot start a shift — bypassing the UI to hit the API directly', async ({ request }) => {
    // Section 28: "a protected route can't be reached by calling the API
    // directly and skipping the UI" — this test deliberately doesn't go
    // through any form; the point is the SERVER rejects it regardless of
    // what the UI would have shown.
    const loginRes = await request.post('/api/auth/login', {
      data: { username: 'fuel_supervisor', password: 'TestFuelSupervisorPassword123456' },
    });
    expect(loginRes.ok()).toBe(true);

    const res = await request.post('/api/shifts/start', {
      data: { forkliftId: '00000000-0000-0000-0000-000000000000', startingReading: '0' },
    });
    expect(res.status()).toBe(403);
  });

  test('Supervisor cannot create a fuel log via the API', async ({ request }) => {
    const loginRes = await request.post('/api/auth/login', {
      data: { username: 'supervisor', password: 'TestSupervisorPassword123456' },
    });
    expect(loginRes.ok()).toBe(true);

    const res = await request.post('/api/fuel-logs', {
      data: {
        forkliftId: '00000000-0000-0000-0000-000000000000',
        fuelAmountLiters: '10',
        readingAtRefuel: '0',
      },
    });
    expect(res.status()).toBe(403);
  });

  test('Supervisor cannot edit or delete a shift via the API', async ({ request }) => {
    const loginRes = await request.post('/api/auth/login', {
      data: { username: 'supervisor', password: 'TestSupervisorPassword123456' },
    });
    expect(loginRes.ok()).toBe(true);

    const patchRes = await request.patch('/api/shifts/00000000-0000-0000-0000-000000000000', {
      data: { notes: 'attempted edit' },
    });
    expect(patchRes.status()).toBe(403);

    const deleteRes = await request.delete('/api/shifts/00000000-0000-0000-0000-000000000000');
    expect(deleteRes.status()).toBe(403);
  });

  test('a non-Admin session cannot view the audit log', async ({ request }) => {
    const loginRes = await request.post('/api/auth/login', {
      data: { username: 'supervisor', password: 'TestSupervisorPassword123456' },
    });
    expect(loginRes.ok()).toBe(true);

    const res = await request.get('/api/audit-log');
    expect(res.status()).toBe(403);
  });
});
