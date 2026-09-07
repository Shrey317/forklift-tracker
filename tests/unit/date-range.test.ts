import { describe, expect, it } from 'vitest';
import { isValidDateRange, johannesburgDateRangeToUtc } from '@/lib/date-range';

describe('johannesburgDateRangeToUtc (Locked Decision #30, Section 14)', () => {
  it('converts a simple single-day range to the correct half-open UTC interval', () => {
    const { gte, lt } = johannesburgDateRangeToUtc('2026-08-17', '2026-08-17');
    // Start of Aug 17 SAST (UTC+2) = Aug 16 22:00 UTC
    expect(gte?.toISOString()).toBe('2026-08-16T22:00:00.000Z');
    // Start of the day AFTER Aug 17 (Aug 18) SAST = Aug 17 22:00 UTC
    expect(lt?.toISOString()).toBe('2026-08-17T22:00:00.000Z');
  });

  it('a multi-day range spans correctly', () => {
    const { gte, lt } = johannesburgDateRangeToUtc('2026-08-01', '2026-08-05');
    expect(gte?.toISOString()).toBe('2026-07-31T22:00:00.000Z');
    expect(lt?.toISOString()).toBe('2026-08-05T22:00:00.000Z'); // start of Aug 6
  });

  it('handles a month boundary correctly (to = last day of the month)', () => {
    const { lt } = johannesburgDateRangeToUtc('2026-08-25', '2026-08-31');
    // Day after Aug 31 is Sep 1 — this is exactly where naive string
    // manipulation (e.g. incrementing a day digit without rollover)
    // breaks.
    expect(lt?.toISOString()).toBe('2026-08-31T22:00:00.000Z'); // start of Sep 1 SAST
  });

  it('handles a year boundary correctly (to = Dec 31)', () => {
    const { lt } = johannesburgDateRangeToUtc('2026-12-25', '2026-12-31');
    expect(lt?.toISOString()).toBe('2026-12-31T22:00:00.000Z'); // start of Jan 1, 2027 SAST
  });

  it('handles a leap-day boundary correctly (Feb 2028 is a leap year)', () => {
    const { lt } = johannesburgDateRangeToUtc('2028-02-20', '2028-02-29');
    expect(lt?.toISOString()).toBe('2028-02-29T22:00:00.000Z'); // start of Mar 1
  });

  it('supports an open-ended range with only `from`', () => {
    const { gte, lt } = johannesburgDateRangeToUtc('2026-08-17', undefined);
    expect(gte?.toISOString()).toBe('2026-08-16T22:00:00.000Z');
    expect(lt).toBeUndefined();
  });

  it('supports an open-ended range with only `to`', () => {
    const { gte, lt } = johannesburgDateRangeToUtc(undefined, '2026-08-17');
    expect(gte).toBeUndefined();
    expect(lt?.toISOString()).toBe('2026-08-17T22:00:00.000Z');
  });

  it('returns an empty object when neither bound is given', () => {
    expect(johannesburgDateRangeToUtc()).toEqual({});
  });
});

describe('isValidDateRange', () => {
  it('accepts from before to', () => {
    expect(isValidDateRange('2026-08-01', '2026-08-17')).toBe(true);
  });
  it('accepts from equal to to (a single day)', () => {
    expect(isValidDateRange('2026-08-17', '2026-08-17')).toBe(true);
  });
  it('rejects from after to', () => {
    expect(isValidDateRange('2026-08-17', '2026-08-01')).toBe(false);
  });
  it('accepts when either bound is missing', () => {
    expect(isValidDateRange(undefined, '2026-08-17')).toBe(true);
    expect(isValidDateRange('2026-08-17', undefined)).toBe(true);
  });
});
