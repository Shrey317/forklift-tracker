import Decimal from 'decimal.js';

/**
 * Hours worked for a completed shift: (endTime - startTime) in hours,
 * rounded to 2 decimals (Section 14's formula table). Returns a string —
 * Prisma accepts strings for Decimal-typed fields, and Locked Decision #29
 * already establishes that decimals cross any boundary as strings, not
 * raw numbers, so this module's public surface doesn't need to depend on
 * which specific Decimal class the generated client happens to use.
 */
export function computeHoursWorked(startTime: Date, endTime: Date): string {
  const ms = endTime.getTime() - startTime.getTime();
  const hours = new Decimal(ms).dividedBy(1000 * 60 * 60);
  return hours.toFixed(2); // decimal.js's toFixed rounds correctly, unlike raw float math
}

/**
 * Reading delta for a completed shift: endingReading - startingReading
 * (Section 14). Takes and returns strings — the same convention as
 * computeHoursWorked above — and does the actual subtraction through
 * decimal.js internally, never raw JS float arithmetic, which is exactly
 * the precision loss Locked Decision #29 exists to prevent in the first
 * place; doing the *calculation* itself in floats would defeat the point
 * of having stored these as DECIMAL columns at all.
 */
export function computeReadingDelta(startingReading: string, endingReading: string): string {
  return new Decimal(endingReading).minus(new Decimal(startingReading)).toFixed(1);
}
