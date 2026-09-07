import { describe, expect, it } from 'vitest';
import Decimal from 'decimal.js';
import { rankByUsage } from '@/server/services/dashboard/ranking';

describe('rankByUsage (Section 14 — Most/Least-Used Forklift)', () => {
  it('picks a clear highest and lowest with no ties', () => {
    const result = rankByUsage([
      { displayId: 'FL-001', name: 'A', totalReadingDelta: new Decimal('50.0') },
      { displayId: 'FL-002', name: 'B', totalReadingDelta: new Decimal('200.0') },
      { displayId: 'FL-003', name: 'C', totalReadingDelta: new Decimal('10.0') },
    ]);
    expect(result.most?.displayId).toBe('FL-002');
    expect(result.least?.displayId).toBe('FL-003');
  });

  // The exact scenario verified against real Postgres: a clear winner
  // (FL-003=100) plus a tie for lowest (FL-001 and FL-002 both at 60).
  it('breaks a tie by lowest displayId, matching what was verified against real data', () => {
    const result = rankByUsage([
      { displayId: 'FL-003', name: 'A', totalReadingDelta: new Decimal('100.0') },
      { displayId: 'FL-001', name: 'B', totalReadingDelta: new Decimal('60.0') },
      { displayId: 'FL-002', name: 'C', totalReadingDelta: new Decimal('60.0') },
    ]);
    expect(result.most?.displayId).toBe('FL-003');
    expect(result.least?.displayId).toBe('FL-001'); // wins the tie over FL-002
  });

  it('breaks a tie for MOST-used the same way (lowest displayId), not "furthest from the tie"', () => {
    const result = rankByUsage([
      { displayId: 'FL-005', name: 'A', totalReadingDelta: new Decimal('90.0') },
      { displayId: 'FL-002', name: 'B', totalReadingDelta: new Decimal('90.0') },
      { displayId: 'FL-009', name: 'C', totalReadingDelta: new Decimal('10.0') },
    ]);
    expect(result.most?.displayId).toBe('FL-002'); // lowest of the two tied at 90
  });

  it('handles a single forklift (most and least are the same)', () => {
    const result = rankByUsage([{ displayId: 'FL-001', name: 'A', totalReadingDelta: new Decimal('25.0') }]);
    expect(result.most?.displayId).toBe('FL-001');
    expect(result.least?.displayId).toBe('FL-001');
  });

  it('returns null for both when there are no candidates at all (the zero-data case)', () => {
    const result = rankByUsage([]);
    expect(result.most).toBeNull();
    expect(result.least).toBeNull();
  });

  it('serializes totalReadingDelta as a string, not a number (Locked Decision #29)', () => {
    const result = rankByUsage([{ displayId: 'FL-001', name: 'A', totalReadingDelta: new Decimal('42.5') }]);
    expect(typeof result.most?.totalReadingDelta).toBe('string');
    expect(result.most?.totalReadingDelta).toBe('42.5');
  });
});
