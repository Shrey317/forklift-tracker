import type { Prisma } from '@/generated/prisma/client';

/**
 * Converts a Prisma Decimal (or null) to a string for API responses.
 * Locked Decision #29: fuelCostZar, costZar, startingReading, endingReading,
 * totalHoursWorked, totalReadingDelta, fuelAmountLiters, readingAtRefuel are
 * NEVER serialized as raw JSON numbers — Prisma's Decimal type doesn't
 * survive JSON.stringify with its precision intact, and a raw float would
 * silently lose it.
 */
export function toApiDecimal(value: Prisma.Decimal | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value.toString();
}

/**
 * Applies toApiDecimal to a fixed set of keys on an object, returning a new
 * object with those keys converted to strings (or null). Non-decimal
 * fields pass through unchanged. Use this once per route response shape
 * rather than converting fields ad hoc (Section 18).
 *
 * Deliberately returns `Omit<T, K> & Record<K, string | null>` rather than
 * `T` — the whole point of this function is that the listed keys STOP
 * being Decimal and become string, so the return type says that honestly
 * instead of asserting past a real type mismatch.
 */
export function serializeDecimals<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  decimalKeys: readonly K[],
): Omit<T, K> & Record<K, string | null> {
  const result: Record<string, unknown> = { ...obj };
  for (const key of decimalKeys) {
    const value = obj[key] as unknown;
    result[key as string] =
      value !== null && value !== undefined && typeof value === 'object' && 'toString' in value
        ? (value as Prisma.Decimal).toString()
        : null;
  }
  return result as Omit<T, K> & Record<K, string | null>;
}
