import { describe, expect, it } from 'vitest';
import { computeHoursWorked, computeReadingDelta } from '@/server/services/shifts/calculations';

describe('computeHoursWorked (Section 14)', () => {
  it('computes a simple whole-hour shift', () => {
    const start = new Date('2026-08-17T08:00:00Z');
    const end = new Date('2026-08-17T16:00:00Z');
    expect(computeHoursWorked(start, end)).toBe('8.00');
  });

  it('rounds to 2 decimal places', () => {
    const start = new Date('2026-08-17T08:00:00Z');
    const end = new Date('2026-08-17T09:20:00Z'); // 1h20m = 1.3333... hours
    expect(computeHoursWorked(start, end)).toBe('1.33');
  });

  it('handles a shift crossing midnight correctly', () => {
    const start = new Date('2026-08-17T22:00:00Z');
    const end = new Date('2026-08-18T02:00:00Z');
    expect(computeHoursWorked(start, end)).toBe('4.00');
  });

  it('handles a very short shift (minutes) without rounding to zero incorrectly', () => {
    const start = new Date('2026-08-17T08:00:00Z');
    const end = new Date('2026-08-17T08:06:00Z'); // 6 minutes = 0.1 hours
    expect(computeHoursWorked(start, end)).toBe('0.10');
  });
});

describe('computeReadingDelta (Section 14)', () => {
  it('computes a simple delta', () => {
    expect(computeReadingDelta('100.0', '150.5')).toBe('50.5');
  });

  it('handles a zero delta (ending equals starting)', () => {
    expect(computeReadingDelta('100.0', '100.0')).toBe('0.0');
  });

  // This is the exact case that motivated doing this arithmetic through
  // decimal.js instead of raw JS floats: 0.1 + 0.2 famously doesn't equal
  // 0.3 in IEEE 754 floating point, and similar artifacts show up in
  // subtraction of decimal-looking values too. A reading delta is exactly
  // the kind of value that gets SUMMED across many shifts for a report's
  // "Total Reading Delta" — a tiny per-shift error compounds.
  it('does not produce floating-point artifacts on values that trigger them in raw JS math', () => {
    // In raw JS: 100.3 - 100.2 === 0.09999999999999432
    expect(computeReadingDelta('100.2', '100.3')).toBe('0.1');
    // In raw JS: 0.3 - 0.2 === 0.09999999999999998
    expect(computeReadingDelta('0.2', '0.3')).toBe('0.1');
  });

  it('handles large odometer-scale values (up to DECIMAL(10,1) range)', () => {
    expect(computeReadingDelta('12345678.9', '12345690.1')).toBe('11.2');
  });
});
