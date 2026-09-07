import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';

// This talks to Postgres directly via `pg` rather than through the
// generated Prisma client, because `prisma generate` cannot run in the
// sandbox this was originally built in (binaries.prisma.sh isn't reachable
// there — see README). The SQL under test is identical either way; once
// the generated client exists, this can call it through
// `prisma.$queryRaw` instead without changing what's being verified.
// Requires a real Postgres reachable at TEST_DATABASE_URL (or DATABASE_URL)
// — per Section 28, this invariant can't be proven against a mock.
//
// Uses a Pool, not a single Client — a single Client serializes concurrent
// .query() calls over one connection, which doesn't actually exercise
// multi-connection concurrency the way separate Vercel serverless function
// invocations would in production. A Pool gives each call its own
// connection, which is the real scenario this test needs to prove safe.

const connectionString = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

describe.runIf(connectionString)('forklift sequence allocation (Section 18)', () => {
  let pool: Pool;

  beforeAll(() => {
    pool = new Pool({ connectionString, max: 25 });
  });

  afterAll(async () => {
    await pool.end();
  });

  it('nextval() never hands out the same sequence value twice under real concurrency', async () => {
    const CONCURRENT_CALLS = 25; // matches the fleet's actual scale

    const results = await Promise.all(
      Array.from({ length: CONCURRENT_CALLS }, () =>
        pool.query<{ nextval: string }>(`SELECT nextval('forklifts_sequence_number_seq')`),
      ),
    );

    const values = results.map((r) => r.rows[0]?.nextval);
    const uniqueValues = new Set(values);

    expect(values).toHaveLength(CONCURRENT_CALLS);
    expect(uniqueValues.size).toBe(CONCURRENT_CALLS); // no duplicates, no gaps in the assertion even if the sequence itself has gaps from prior runs
  });

  it('nextval() returns a bigint-typed value as a string, not a JS number (precision-loss guard)', async () => {
    const result = await pool.query<{ nextval: string }>(
      `SELECT nextval('forklifts_sequence_number_seq')`,
    );
    expect(typeof result.rows[0]?.nextval).toBe('string');
  });
});
