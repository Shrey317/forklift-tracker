import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import type { ListMaintenanceLogsQuery } from '@/lib/validations/maintenance';

export async function listMaintenanceLogs(query: ListMaintenanceLogsQuery) {
  const where: Prisma.MaintenanceLogWhereInput = { isDeleted: false }; // Business Rule 22

  if (query.forkliftId) where.forkliftId = query.forkliftId;
  if (query.status) where.status = query.status;

  const [items, totalCount] = await Promise.all([
    prisma.maintenanceLog.findMany({
      where,
      include: { forklift: { select: { displayId: true, name: true } } },
      orderBy: { date: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.maintenanceLog.count({ where }),
  ]);

  return { items, pagination: { page: query.page, pageSize: query.pageSize, totalCount } };
}
