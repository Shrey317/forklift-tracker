import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { johannesburgDateRangeToUtc } from '@/lib/date-range';

interface ListAuditLogQuery {
  targetType?: string;
  targetId?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

/**
 * GET /api/audit-log — Admin only, paginated, read-only (Section 19, 24).
 * No update or delete function exists anywhere in this file or any
 * caller of it — MUST NOT #12 isn't just unimplemented, there's no route
 * that could even try.
 */
export async function listAuditLog(query: ListAuditLogQuery) {
  const where: Prisma.AuditLogEntryWhereInput = {};

  if (query.targetType) where.targetType = query.targetType as Prisma.AuditLogEntryWhereInput['targetType'];
  if (query.targetId) where.targetId = query.targetId;
  if (query.from || query.to) {
    const { gte, lt } = johannesburgDateRangeToUtc(query.from, query.to);
    where.createdAt = { gte, lt };
  }

  const [items, totalCount] = await Promise.all([
    prisma.auditLogEntry.findMany({
      where,
      include: { actorUser: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.auditLogEntry.count({ where }),
  ]);

  return { items, pagination: { page: query.page, pageSize: query.pageSize, totalCount } };
}
