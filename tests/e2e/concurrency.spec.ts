import { expect, test } from '@playwright/test';

/** NOT VERIFIED IN THE SANDBOX THIS WAS BUILT IN — see playwright.config.ts. */

test.describe('concurrent shift-start race (Section 27, 28, 33)', () => {
  test('two near-simultaneous shift-start attempts on the same forklift resolve to exactly one success', async ({
    request,
  }) => {
    const loginRes = await request.post('/api/auth/login', {
      data: { username: 'admin', password: 'TestAdminPassword123456' },
    });
    expect(loginRes.ok()).toBe(true);

    // Admin creates a fresh forklift so this test doesn't depend on
    // whatever fixture data may or may not already exist.
    const createRes = await request.post('/api/forklifts', {
      data: { name: 'E2E Concurrency Test Forklift', manufacturer: 'Toyota', model: 'Test' },
    });
    expect(createRes.ok()).toBe(true);
    const forklift = (await createRes.json()).data;

    // Fire both requests without awaiting the first — this is the actual
    // race condition, not two sequential calls.
    const [resultA, resultB] = await Promise.all([
      request.post('/api/shifts/start', { data: { forkliftId: forklift.id, startingReading: '0' } }),
      request.post('/api/shifts/start', { data: { forkliftId: forklift.id, startingReading: '0' } }),
    ]);

    const statuses = [resultA.status(), resultB.status()].sort();
    // Exactly one success (201) and one clean, correctly-worded rejection
    // (409 SHIFT_ALREADY_ACTIVE) — never zero successes, never two.
    expect(statuses).toEqual([201, 409]);

    const rejected = resultA.status() === 409 ? resultA : resultB;
    const rejectedBody = await rejected.json();
    expect(rejectedBody.error.code).toBe('SHIFT_ALREADY_ACTIVE');
  });
});
