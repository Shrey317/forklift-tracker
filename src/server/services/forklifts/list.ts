import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import type { ListForkliftsQuery } from '@/lib/validations/forklift';

export async function listForklifts(query: ListForkliftsQuery) {
  const where: Prisma.ForkliftWhereInput = {};

  // Business Rule 22: deactivated forklifts excluded from lists by
  // default. includeInactive is an explicit opt-in for the Admin fleet
  // page (see the validation schema's comment for why this param exists).
  if (!query.includeInactive) {
    where.isActive = true;
  }
  if (query.status) {
    where.status = query.status;
  }
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { displayId: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [items, totalCount] = await Promise.all([
    prisma.forklift.findMany({
      where,
      // Allow-listed sort field, never an arbitrary client-supplied column
      // (Section 19's pagination note).
      orderBy: { displayId: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.forklift.count({ where }),
  ]);

  return {
    items,
    pagination: { page: query.page, pageSize: query.pageSize, totalCount },
  };
}

/**
 * Business Rule 23: filters ONLY on isActive = true, never on status — a
 * forklift in MAINTENANCE or OUT_OF_SERVICE must still be scannable, since
 * fuel and maintenance entries against it are allowed (Locked Decision #10).
 */
export async function lookupForkliftByQrToken(qrToken: string) {
  return prisma.forklift.findFirst({
    where: { qrToken, isActive: true },
  });
}
