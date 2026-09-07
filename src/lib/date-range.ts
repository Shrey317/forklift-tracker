import { fromZonedTime } from 'date-fns-tz';

const TIMEZONE = 'Africa/Johannesburg';

/**
 * Converts a from/to calendar-day range (each an ISO date string like
 * "2026-08-17") into the half-open UTC interval Locked Decision #30 and
 * Section 14 specify: [start of from-day, start of the day AFTER to-day),
 * both in Africa/Johannesburg wall-clock time before conversion — not an
 * approximate `to-day 23:59:59.999`, which is exactly the
 * off-by-a-millisecond trap Section 14 calls out.
 *
 * Uses date-fns-tz against the real IANA tzdata rather than hardcoding a
 * fixed UTC+2 offset — South Africa doesn't currently observe DST, but
 * expressing that as "this is what the timezone database says," not an
 * assumption baked into arithmetic, is what actually makes it safe to
 * leave alone if that (or the timezone database) ever changes.
 *
 * Either bound may be omitted (an open-ended range on that side).
 */
export function johannesburgDateRangeToUtc(
  from?: string,
  to?: string,
): { gte?: Date; lt?: Date } {
  const result: { gte?: Date; lt?: Date } = {};

  if (from) {
    result.gte = fromZonedTime(`${from}T00:00:00`, TIMEZONE);
  }
  if (to) {
    const dayAfter = addOneDay(to);
    result.lt = fromZonedTime(`${dayAfter}T00:00:00`, TIMEZONE);
  }

  return result;
}

/** Adds one calendar day to an ISO date string ("2026-08-17" -> "2026-08-18"), handling month/year rollover via UTC-anchored arithmetic (the date itself has no timezone yet — it's a calendar day label, not an instant). */
function addOneDay(isoDate: string): string {
  const parts = isoDate.split('-').map(Number);
  const [year, month, day] = parts;
  if (year === undefined || month === undefined || day === undefined) {
    throw new Error(`Invalid ISO date string: ${isoDate}`);
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/**
 * Validates from <= to. Section 14: "from after to returns
 * VALIDATION_FAILED." Applied uniformly to every endpoint that accepts a
 * date range (list endpoints and the report both use from/to the same way
 * — Section 19's table gives them the identical shape, so there's no
 * reason for them to disagree on what a range means).
 */
export function isValidDateRange(from?: string, to?: string): boolean {
  if (!from || !to) return true;
  return from <= to; // ISO date strings sort lexicographically = chronologically
}
