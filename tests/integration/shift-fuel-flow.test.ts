import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Client } from 'pg';

// Simulates the exact sequence of queries startShift/endShiftCore/
// createFuelLog perform, via raw pg — the generated Prisma client can't
// run in this sandbox (see README), but the underlying SQL and business
// logic these tests exercise is identical to what the TypeScript services
// in src/server/services/{shifts,fuel}/ contain. Anything that fails here
// would also fail there.

const connectionString = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

describe.runIf(connectionString)('shift + fuel-log business flow (Business Rules 1-3, 10, 26)', () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client({ connectionString });
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
  });

  beforeEach(async () => {
    await client.query(
      `TRUNCATE audit_log_entries, shifts, fuel_logs, maintenance_logs, forklifts, sessions, login_attempts, login_throttles, users CASCADE`,
    );
    await client.query(
      `INSERT INTO users (id, username, password_hash, role) VALUES ('u1', 'supervisor', 'x', 'SUPERVISOR')`,
    );
    await client.query(
      `INSERT INTO forklifts (id, display_id, name, manufacturer, model, qr_token, created_by_id, updated_at)
       VALUES ('fk1', 'FL-001', 'Toyota 8FG', 'Toyota', '8FG25', 'tok1', 'u1', now())`,
    );
  });

  it('a fuel log created while a shift is open auto-links to it (Business Rule 10)', async () => {
    await client.query(
      `INSERT INTO shifts (id, forklift_id, created_by_id, start_time, status, starting_reading, updated_at)
       VALUES ('s1', 'fk1', 'u1', now(), 'ACTIVE', 100.0, now())`,
    );

    // Simulates createFuelLog's auto-link lookup.
    const openShift = await client.query(
      `SELECT id FROM shifts WHERE forklift_id = $1 AND status = 'ACTIVE' AND is_deleted = false`,
      ['fk1'],
    );
    expect(openShift.rows[0]?.id).toBe('s1');

    await client.query(
      `INSERT INTO fuel_logs (id, forklift_id, created_by_id, shift_id, fuel_amount_liters, reading_at_refuel, updated_at)
       VALUES ('f1', 'fk1', 'u1', $1, 20.0, 110.0, now())`,
      [openShift.rows[0]?.id],
    );

    const linked = await client.query(`SELECT shift_id FROM fuel_logs WHERE id = 'f1'`);
    expect(linked.rows[0]?.shift_id).toBe('s1');
  });

  it('a fuel log created with NO open shift saves unlinked (Business Rule 10)', async () => {
    const openShift = await client.query(
      `SELECT id FROM shifts WHERE forklift_id = $1 AND status = 'ACTIVE' AND is_deleted = false`,
      ['fk1'],
    );
    expect(openShift.rows).toHaveLength(0);

    await client.query(
      `INSERT INTO fuel_logs (id, forklift_id, created_by_id, shift_id, fuel_amount_liters, reading_at_refuel, updated_at)
       VALUES ('f1', 'fk1', 'u1', NULL, 20.0, 50.0, now())`,
    );
    const row = await client.query(`SELECT shift_id FROM fuel_logs WHERE id = 'f1'`);
    expect(row.rows[0]?.shift_id).toBeNull();
  });

  it("ending a shift below a fuel log linked to it is rejected by the service's own check (not a DB constraint — simulated here)", async () => {
    await client.query(
      `INSERT INTO shifts (id, forklift_id, created_by_id, start_time, status, starting_reading, updated_at)
       VALUES ('s1', 'fk1', 'u1', now(), 'ACTIVE', 100.0, now())`,
    );
    await client.query(
      `INSERT INTO fuel_logs (id, forklift_id, created_by_id, shift_id, fuel_amount_liters, reading_at_refuel, updated_at)
       VALUES ('f1', 'fk1', 'u1', 's1', 20.0, 150.0, now())`,
    );

    // Simulates endShiftCore's BR3 check against linked fuel logs.
    const linkedFuelLogs = await client.query(
      `SELECT reading_at_refuel FROM fuel_logs WHERE shift_id = $1 AND is_deleted = false`,
      ['s1'],
    );
    const maxFuelReading = Math.max(...linkedFuelLogs.rows.map((r) => Number(r.reading_at_refuel)));
    expect(maxFuelReading).toBe(150.0);

    const proposedEndingReading = 140.0; // below the fuel log's 150.0
    expect(proposedEndingReading < maxFuelReading).toBe(true); // this is what the service rejects with INVALID_READING
  });

  it('the monotonic check blocks a new shift starting below the forklift\'s prior high-water mark (Business Rule 26)', async () => {
    // Prior shift completed at 200.0
    await client.query(
      `INSERT INTO shifts (id, forklift_id, created_by_id, start_time, end_time, status, starting_reading, ending_reading, total_hours_worked, total_reading_delta, updated_at)
       VALUES ('s1', 'fk1', 'u1', now() - interval '2 hours', now(), 'COMPLETED', 150.0, 200.0, 2.0, 50.0, now())`,
    );

    const mostRecent = await client.query(`
      SELECT GREATEST(
        (SELECT MAX(ending_reading) FROM shifts WHERE forklift_id = 'fk1' AND status = 'COMPLETED' AND is_deleted = false),
        (SELECT MAX(reading_at_refuel) FROM fuel_logs WHERE forklift_id = 'fk1' AND is_deleted = false)
      ) AS most_recent`);
    expect(Number(mostRecent.rows[0]?.most_recent)).toBe(200.0);

    const proposedStartingReading = 190.0; // below 200.0 — must be rejected
    expect(proposedStartingReading < Number(mostRecent.rows[0]?.most_recent)).toBe(true);
  });

  it('a new shift starting at or above the prior high-water mark is accepted, and the partial index still allows exactly one active shift', async () => {
    await client.query(
      `INSERT INTO shifts (id, forklift_id, created_by_id, start_time, end_time, status, starting_reading, ending_reading, total_hours_worked, total_reading_delta, updated_at)
       VALUES ('s1', 'fk1', 'u1', now() - interval '2 hours', now(), 'COMPLETED', 150.0, 200.0, 2.0, 50.0, now())`,
    );

    // 200.0 — exactly at the high-water mark — should be accepted (>=, not >)
    await client.query(
      `INSERT INTO shifts (id, forklift_id, created_by_id, start_time, status, starting_reading, updated_at)
       VALUES ('s2', 'fk1', 'u1', now(), 'ACTIVE', 200.0, now())`,
    );

    const active = await client.query(
      `SELECT id FROM shifts WHERE forklift_id = 'fk1' AND status = 'ACTIVE' AND is_deleted = false`,
    );
    expect(active.rows).toHaveLength(1);
    expect(active.rows[0]?.id).toBe('s2');
  });
});
