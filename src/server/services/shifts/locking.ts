import type { Prisma } from '@/generated/prisma/client';
import { ApiError } from '@/lib/errors';

interface ForkliftRow {
  id: string;
  display_id: string;
  status: string;
  is_active: boolean;
}

/**
 * Takes a row lock on a Forklift (SELECT ... FOR UPDATE) and returns its
 * current state. MUST be the first thing called, before any read of that
 * forklift's shifts/fuel_logs that will inform a decision — Section 27:
 * "reading the current max and deciding whether to accept a new one is
 * not safe as a bare read-then-write across concurrent requests."
 *
 * Locking the forklift row serializes concurrent writers against each
 * other for THIS forklift specifically, without blocking activity on any
 * other forklift — every caller here is scoped to one forkliftId.
 */
export async function lockForklift(
  tx: Prisma.TransactionClient,
  forkliftId: string,
): Promise<ForkliftRow> {
  const rows = await tx.$queryRaw<ForkliftRow[]>`
    SELECT id, display_id, status, is_active
    FROM forklifts WHERE id = ${forkliftId} FOR UPDATE
  `;
  const forklift = rows[0];
  if (!forklift) {
    throw new ApiError('NOT_FOUND', 'Forklift not found.');
  }
  return forklift;
}

/**
 * The forklift's most recently recorded reading, per Business Rule 26:
 * the HIGHER of its last COMPLETED shift's endingReading and its last
 * fuel log's readingAtRefuel, considering only non-deleted records.
 * Returns null if the forklift has no prior reading at all (a brand new
 * forklift) — callers fall back to the plain "≥ 0" rule in that case.
 *
 * Deliberately implemented as MAX() across history rather than "whichever
 * record has the latest timestamp": under correct operation the two are
 * equivalent (values only ever increase), but MAX() is the more
 * conservative reading of "never go backward" and doesn't depend on
 * timestamp ordering being perfectly reliable. Must be called AFTER
 * lockForklift() has already acquired the row lock in the same
 * transaction — this function does not lock anything itself.
 */
export async function getMostRecentReading(
  tx: Prisma.TransactionClient,
  forkliftId: string,
): Promise<string | null> {
  const rows = await tx.$queryRaw<{ most_recent: string | null }[]>`
    SELECT GREATEST(
      (SELECT MAX(ending_reading) FROM shifts WHERE forklift_id = ${forkliftId} AND status = 'COMPLETED' AND is_deleted = false),
      (SELECT MAX(reading_at_refuel) FROM fuel_logs WHERE forklift_id = ${forkliftId} AND is_deleted = false)
    ) AS most_recent
  `;
  return rows[0]?.most_recent ?? null;
}

/**
 * Asserts a candidate reading doesn't violate the monotonic rule (Business
 * Rule 26, Locked Decision #38). A forklift with no prior reading is only
 * checked against the ordinary ≥ 0 validation rule (Section 16) — this
 * function has nothing to compare against yet, so it passes. Used at
 * CREATION time (shift-start, fuel-log-create) — a new record is always
 * the most recent thing chronologically, so there's only a "before" to
 * check. See assertEditedReadingWithinBounds below for the bidirectional
 * version used when an existing reading is being edited instead.
 */
export async function assertReadingNotBackward(
  tx: Prisma.TransactionClient,
  forkliftId: string,
  candidateReading: string,
): Promise<void> {
  const mostRecent = await getMostRecentReading(tx, forkliftId);
  if (mostRecent === null) return;

  // String-compare via Number is safe here: both values are already
  // validated Decimal(10,1)-range numbers from Zod/the DB, well within
  // JS's safe integer range even with one decimal place.
  if (Number(candidateReading) < Number(mostRecent)) {
    throw new ApiError(
      'INVALID_READING',
      `Reading ${candidateReading} is below this forklift's most recently recorded reading (${mostRecent}).`,
    );
  }
}

/**
 * The kind of reading event being edited, for excluding it from the
 * timeline it's being checked against — a shift contributes up to two
 * separate timeline points (its start and, once completed, its end),
 * each at its own fixed timestamp; a fuel log contributes one.
 */
export type ReadingEventKind = 'shift_start' | 'shift_end' | 'fuel_log';

/**
 * Validates an EDIT to an existing reading, not a new one — the
 * bidirectional check. A forklift's reading history is really one
 * timeline interleaving shift-starts, shift-ends, and fuel logs, each
 * fixed at its own timestamp (PATCH never changes startTime/endTime/
 * refuelDateTime, only the reading value recorded there). An edited
 * value has to fit its own slot in that timeline: not lower than the
 * highest reading strictly before its timestamp, not higher than the
 * lowest reading strictly after it — editing a value too high is just as
 * much a monotonicity violation as editing it too low, since it would
 * make an earlier point look like it happened after a later, lower one.
 *
 * Excludes only the specific event being edited (by kind + record id),
 * not the whole shift it might belong to — a shift's unedited end (or
 * start) event stays in the timeline as a legitimate bound, since Business
 * Rule 3's own starting<=ending check already governs their relationship
 * to each other, and this function is about the relationship to
 * everything else.
 *
 * Must be called after lockForklift() has already acquired the row lock
 * in the same transaction, same as the creation-time check.
 */
export async function assertEditedReadingWithinBounds(
  tx: Prisma.TransactionClient,
  forkliftId: string,
  timestamp: Date,
  candidateReading: string,
  exclude: { kind: ReadingEventKind; recordId: string },
): Promise<void> {
  const rows = await tx.$queryRaw<{ lower_bound: string | null; upper_bound: string | null }[]>`
    WITH timeline AS (
      SELECT start_time AS ts, starting_reading AS reading, 'shift_start' AS kind, id AS record_id
      FROM shifts WHERE forklift_id = ${forkliftId} AND is_deleted = false
      UNION ALL
      SELECT end_time AS ts, ending_reading AS reading, 'shift_end' AS kind, id AS record_id
      FROM shifts WHERE forklift_id = ${forkliftId} AND is_deleted = false AND status = 'COMPLETED'
      UNION ALL
      SELECT refuel_date_time AS ts, reading_at_refuel AS reading, 'fuel_log' AS kind, id AS record_id
      FROM fuel_logs WHERE forklift_id = ${forkliftId} AND is_deleted = false
    )
    SELECT
      MAX(reading) FILTER (WHERE ts < ${timestamp}) AS lower_bound,
      MIN(reading) FILTER (WHERE ts > ${timestamp}) AS upper_bound
    FROM timeline
    WHERE NOT (kind = ${exclude.kind} AND record_id = ${exclude.recordId})
  `;

  const bounds = rows[0];
  const lowerBound = bounds?.lower_bound ?? null;
  const upperBound = bounds?.upper_bound ?? null;

  if (lowerBound !== null && Number(candidateReading) < Number(lowerBound)) {
    throw new ApiError(
      'INVALID_READING',
      `Reading ${candidateReading} is lower than a reading already recorded before it (${lowerBound}).`,
    );
  }
  if (upperBound !== null && Number(candidateReading) > Number(upperBound)) {
    throw new ApiError(
      'INVALID_READING',
      `Reading ${candidateReading} is higher than a reading already recorded after it (${upperBound}).`,
    );
  }
}
