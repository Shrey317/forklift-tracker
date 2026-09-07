import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Client } from 'pg';

// Verifies the exact SQL assertEditedReadingWithinBounds
// (src/server/services/shifts/locking.ts) runs, via raw pg — see README
// for why (the generated Prisma client isn't available in this sandbox).
//
// Timeline under test: s1 (100 -> 150) at -6h/-5h, f1 (160) at -4h,
// s2 (170 -> 200) at -3h/-2h. Chosen so every record has something both
// before AND after it except the very first (s1's start) and very last
// (s2's end) — exercising the NULL-bound edge cases along with the
// ordinary interior ones.

const connectionString = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

async function getBounds(
  client: Client,
  timestamp: string,
  kind: string,
  recordId: string,
): Promise<{ lower: string | null; upper: string | null }> {
  const result = await client.query(
    `WITH timeline AS (
       SELECT start_time AS ts, starting_reading AS reading, 'shift_start' AS kind, id AS record_id
       FROM shifts WHERE forklift_id = 'fk1' AND is_deleted = false
       UNION ALL
       SELECT end_time AS ts, ending_reading AS reading, 'shift_end' AS kind, id AS record_id
       FROM shifts WHERE forklift_id = 'fk1' AND is_deleted = false AND status = 'COMPLETED'
       UNION ALL
       SELECT refuel_date_time AS ts, reading_at_refuel AS reading, 'fuel_log' AS kind, id AS record_id
       FROM fuel_logs WHERE forklift_id = 'fk1' AND is_deleted = false
     )
     SELECT
       MAX(reading) FILTER (WHERE ts < $1::timestamp) AS lower_bound,
       MIN(reading) FILTER (WHERE ts > $1::timestamp) AS upper_bound
     FROM timeline
     WHERE NOT (kind = $2 AND record_id = $3)`,
    [timestamp, kind, recordId],
  );
  return { lower: result.rows[0]?.lower_bound ?? null, upper: result.rows[0]?.upper_bound ?? null };
}

describe.runIf(connectionString)('bidirectional edit-time reading bounds (Business Rule 26, edit case)', () => {
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
    await client.query(`INSERT INTO users (id, username, password_hash, role) VALUES ('u1', 'admin', 'x', 'ADMIN')`);
    await client.query(
      `INSERT INTO forklifts (id, display_id, name, manufacturer, model, qr_token, created_by_id, updated_at)
       VALUES ('fk1', 'FL-001', 'Toyota 8FG', 'Toyota', '8FG25', 'tok1', 'u1', now())`,
    );
    await client.query(
      `INSERT INTO shifts (id, forklift_id, created_by_id, start_time, end_time, status, starting_reading, ending_reading, total_hours_worked, total_reading_delta, updated_at)
       VALUES ('s1', 'fk1', 'u1', now() - interval '6 hours', now() - interval '5 hours', 'COMPLETED', 100.0, 150.0, 1.0, 50.0, now())`,
    );
    await client.query(
      `INSERT INTO fuel_logs (id, forklift_id, created_by_id, fuel_amount_liters, reading_at_refuel, refuel_date_time, updated_at)
       VALUES ('f1', 'fk1', 'u1', 20.0, 160.0, now() - interval '4 hours', now())`,
    );
    await client.query(
      `INSERT INTO shifts (id, forklift_id, created_by_id, start_time, end_time, status, starting_reading, ending_reading, total_hours_worked, total_reading_delta, updated_at)
       VALUES ('s2', 'fk1', 'u1', now() - interval '3 hours', now() - interval '2 hours', 'COMPLETED', 170.0, 200.0, 1.0, 30.0, now())`,
    );
  });

  it("editing s1's ending reading (interior record) bounds against its own start and the next record (f1)", async () => {
    const ts = (await client.query(`SELECT end_time FROM shifts WHERE id = 's1'`)).rows[0].end_time;
    const { lower, upper } = await getBounds(client, ts.toISOString(), 'shift_end', 's1');
    expect(Number(lower)).toBe(100.0); // s1's own start — legitimately "before"
    expect(Number(upper)).toBe(160.0); // f1
  });

  it("editing f1's reading bounds against the shift before it and the shift after it", async () => {
    const ts = (await client.query(`SELECT refuel_date_time FROM fuel_logs WHERE id = 'f1'`)).rows[0]
      .refuel_date_time;
    const { lower, upper } = await getBounds(client, ts.toISOString(), 'fuel_log', 'f1');
    expect(Number(lower)).toBe(150.0); // s1's end
    expect(Number(upper)).toBe(170.0); // s2's start
  });

  it("editing s2's starting reading bounds against f1 and its own end", async () => {
    const ts = (await client.query(`SELECT start_time FROM shifts WHERE id = 's2'`)).rows[0].start_time;
    const { lower, upper } = await getBounds(client, ts.toISOString(), 'shift_start', 's2');
    expect(Number(lower)).toBe(160.0); // f1
    expect(Number(upper)).toBe(200.0); // s2's own end
  });

  it('editing the very FIRST record in the timeline has no lower bound (NULL)', async () => {
    const ts = (await client.query(`SELECT start_time FROM shifts WHERE id = 's1'`)).rows[0].start_time;
    const { lower, upper } = await getBounds(client, ts.toISOString(), 'shift_start', 's1');
    expect(lower).toBeNull();
    expect(Number(upper)).toBe(150.0); // s1's own end
  });

  it('editing the very LAST record in the timeline has no upper bound (NULL)', async () => {
    const ts = (await client.query(`SELECT end_time FROM shifts WHERE id = 's2'`)).rows[0].end_time;
    const { lower, upper } = await getBounds(client, ts.toISOString(), 'shift_end', 's2');
    expect(Number(lower)).toBe(170.0); // s2's own start
    expect(upper).toBeNull();
  });

  it('a soft-deleted record in the middle of the timeline is excluded from both neighbors\' bounds', async () => {
    await client.query(`UPDATE fuel_logs SET is_deleted = true WHERE id = 'f1'`);
    const ts = (await client.query(`SELECT start_time FROM shifts WHERE id = 's2'`)).rows[0].start_time;
    const { lower, upper } = await getBounds(client, ts.toISOString(), 'shift_start', 's2');
    // f1 (160) is gone — s2's start now bounds directly against s1's end (150).
    // s2's own END event stays in the timeline (excluding kind='shift_start'
    // for s2 does not exclude s2's separate 'shift_end' event) and remains
    // the correct upper bound at 200.
    expect(Number(lower)).toBe(150.0);
    expect(Number(upper)).toBe(200.0);
  });
});
