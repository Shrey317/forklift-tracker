import type { Role, Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { writeAuditLogEntry } from '../audit/log';
import type { CreateMaintenanceLogInput } from '@/lib/validations/maintenance';

/**
 * POST /api/maintenance-logs — Admin only (Locked Decision #7). Every
 * maintenance mutation is an Admin action by definition, so this always
 * writes an audit entry — unlike shift/fuel creation, there's no
 * non-Admin actor case to conditionally skip (Locked Decision #18/#34's
 * scoping doesn't even come up here).
 *
 * Deliberately does NOT touch Forklift.status — Business Rule 6: creating
 * or completing a MaintenanceLog MUST NOT automatically change
 * Forklift.status. Forklift state changes only ever go through
 * PATCH /api/forklifts/:id or POST /api/forklifts/:id/deactivate
 * (Section 19), never a side channel from this endpoint.
 */
export async function createMaintenanceLog(input: CreateMaintenanceLogInput, actor: { id: string; role: Role }) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const maintenanceLog = await tx.maintenanceLog.create({
      data: {
        forkliftId: input.forkliftId,
        date: input.date,
        description: input.description,
        costZar: input.costZar,
        status: input.status,
        createdById: actor.id,
      },
    });

    await writeAuditLogEntry(tx, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: 'MAINTENANCE_LOG_CREATED',
      targetType: 'MAINTENANCE_LOG',
      targetId: maintenanceLog.id,
      beforeValue: null,
      afterValue: {
        forkliftId: maintenanceLog.forkliftId,
        description: maintenanceLog.description,
        costZar: maintenanceLog.costZar?.toString() ?? null,
        status: maintenanceLog.status,
      },
    });

    return maintenanceLog;
  });
}
