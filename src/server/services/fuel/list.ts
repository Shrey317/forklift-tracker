import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import type { ListFuelLogsQuery } from '@/lib/validations/fuel';
import { johannesburgDateRangeToUtc } from '@/lib/date-range';

export async function listFuelLogs(query: ListFuelLogsQuery) {
  const where: Prisma.FuelLogWhereInput = { isDeleted: false }; // Business Rule 22

  if (query.forkliftId) {
    where.forkliftId = query.forkliftId;
  }
  if (query.from || query.to) {
    const { gte, lt } = johannesburgDateRangeToUtc(query.from, query.to);
    where.refuelDateTime = { gte, lt }; // placed by refuelDateTime (Section 14)
  }

  const [items, totalCount] = await Promise.all([
    prisma.fuelLog.findMany({
      where,
      include: { forklift: { select: { displayId: true, name: true } } },
      orderBy: { refuelDateTime: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.fuelLog.count({ where }),
  ]);

  return { items, pagination: { page: query.page, pageSize: query.pageSize, totalCount } };
}
