import type Decimal from 'decimal.js';

export interface RankableForklift {
  displayId: string;
  name: string;
  totalReadingDelta: Decimal;
}

export interface UsageRanking {
  displayId: string;
  name: string;
  totalReadingDelta: string;
}

/**
 * Highest/lowest SUM(totalReadingDelta), tied values broken by lowest
 * displayId in EITHER direction (Section 14 gives both Most-Used and
 * Least-Used the identical "lowest displayId" tie-break rule — it's not
 * "furthest from the tie" in either case). Returns null for both when
 * there are no candidates at all — the zero-data case, not an error.
 *
 * Deliberately has no Prisma import at all, unlike stats.ts which calls
 * this — importing anything from a file that touches @/lib/prisma
 * transitively fails in this sandbox (the generated client doesn't
 * exist), so this pure piece is kept separate and directly testable.
 */
export function rankByUsage(
  candidates: RankableForklift[],
): { most: UsageRanking | null; least: UsageRanking | null } {
  if (candidates.length === 0) {
    return { most: null, least: null };
  }

  const byUsageDesc = [...candidates].sort((a, b) => {
    const diff = b.totalReadingDelta.comparedTo(a.totalReadingDelta);
    return diff !== 0 ? diff : a.displayId.localeCompare(b.displayId);
  });
  const byUsageAsc = [...candidates].sort((a, b) => {
    const diff = a.totalReadingDelta.comparedTo(b.totalReadingDelta);
    return diff !== 0 ? diff : a.displayId.localeCompare(b.displayId);
  });

  const toResult = (r: RankableForklift): UsageRanking => ({
    displayId: r.displayId,
    name: r.name,
    totalReadingDelta: r.totalReadingDelta.toString(),
  });

  return {
    most: byUsageDesc[0] ? toResult(byUsageDesc[0]) : null,
    least: byUsageAsc[0] ? toResult(byUsageAsc[0]) : null,
  };
}
