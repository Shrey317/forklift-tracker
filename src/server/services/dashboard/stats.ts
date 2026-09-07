import Decimal from 'decimal.js';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma/client';
import { rankByUsage, type RankableForklift, type UsageRanking } from './ranking';

interface ShiftGroupRow {
  forkliftId: string;
  _sum: { totalReadingDelta: Prisma.Decimal | null };
}

interface ForkliftLookupRow {
  id: string;
  displayId: string;
  name: string;
}

/**
 * Most/least-used forklift: highest/lowest SUM(totalReadingDelta) among
 * COMPLETED, non-deleted shifts, tie-broken by lowest displayId (Section
 * 14). Only forklifts with at least one qualifying shift participate — a
 * forklift with zero qualifying shifts doesn't show up with a reading
 * delta of 0, it simply isn't ranked. The actual ranking/tie-break logic
 * lives in ranking.ts (kept Prisma-free so it's directly unit-testable);
 * this function is just the DB fetch that feeds it.
 */
async function getUsageRankings(): Promise<{ most: UsageRanking | null; least: UsageRanking | null }> {
  const grouped = await prisma.shift.groupBy({
    by: ['forkliftId'],
    where: { isDeleted: false, status: 'COMPLETED' },
    _sum: { totalReadingDelta: true },
  });

  if (grouped.length === 0) {
    return { most: null, least: null };
  }

  const forklifts: ForkliftLookupRow[] = await prisma.forklift.findMany({
    where: { id: { in: grouped.map((g) => g.forkliftId) } },
    select: { id: true, displayId: true, name: true },
  });
  const forkliftById = new Map(forklifts.map((f) => [f.id, f]));

  const ranked: RankableForklift[] = grouped.map((g) => {
    const forklift = forkliftById.get(g.forkliftId);
    return {
      displayId: forklift?.displayId ?? '',
      name: forklift?.name ?? '',
      totalReadingDelta: g._sum.totalReadingDelta ?? new Decimal(0),
    };
  });

  return rankByUsage(ranked);
}

/**
 * GET /api/dashboard — Admin only. Takes no from/to (Section 14): the
 * three fleet-status counts are current-state snapshots; the three
 * period-based stats default to all-time over non-deleted records. A
 * specific period is what the Report feature is for, not this endpoint.
 */
export async function getDashboardStats() {
  const [totalForklifts, activeForklifts, forkliftsUnderMaintenance, fuelAgg, hoursAgg, rankings] =
    await Promise.all([
      prisma.forklift.count({ where: { isActive: true } }),
      prisma.forklift.count({ where: { isActive: true, status: 'ACTIVE' } }),
      prisma.forklift.count({
        where: { isActive: true, status: { in: ['MAINTENANCE', 'OUT_OF_SERVICE'] } },
      }),
      prisma.fuelLog.aggregate({ where: { isDeleted: false }, _sum: { fuelAmountLiters: true } }),
      prisma.shift.aggregate({
        where: { isDeleted: false, status: 'COMPLETED' },
        _sum: { totalHoursWorked: true },
      }),
      getUsageRankings(),
    ]);

  return {
    totalForklifts,
    activeForklifts,
    forkliftsUnderMaintenance,
    totalFuelUsedLiters: (fuelAgg._sum.fuelAmountLiters ?? new Decimal(0)).toString(),
    totalHoursWorked: (hoursAgg._sum.totalHoursWorked ?? new Decimal(0)).toString(),
    mostUsedForklift: rankings.most,
    leastUsedForklift: rankings.least,
  };
}
