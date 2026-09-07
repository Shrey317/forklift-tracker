import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import type { ListShiftsQuery } from '@/lib/validations/shift';
import { johannesburgDateRangeToUtc } from '@/lib/date-range';

export async function listShifts(query: ListShiftsQuery) {
  const where: Prisma.ShiftWhereInput = { isDeleted: false }; // Business Rule 22

  if (query.forkliftId) where.forkliftId = query.forkliftId;
  if (query.status) where.status = query.status;
  if (query.from || query.to) {
    // A completed shift is placed by its endTime (Section 14) — an ACTIVE
    // shift has no endTime yet and simply won't match a date-filtered
    // query, which is correct: it isn't part of a historical range until
    // it's completed.
    const { gte, lt } = johannesburgDateRangeToUtc(query.from, query.to);
    where.endTime = { gte, lt };
  }

  const [items, totalCount] = await Promise.all([
    prisma.shift.findMany({
      where,
      include: { forklift: { select: { displayId: true, name: true } } },
      orderBy: { startTime: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.shift.count({ where }),
  ]);

  return { items, pagination: { page: query.page, pageSize: query.pageSize, totalCount } };
}
