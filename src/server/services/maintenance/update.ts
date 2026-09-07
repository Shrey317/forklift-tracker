import type { Prisma, Role } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/errors';
import { writeAuditLogEntry } from '../audit/log';
import type { UpdateMaintenanceLogInput } from '@/lib/validations/maintenance';

type FieldEditInput = Omit<UpdateMaintenanceLogInput, 'reason'>;

/** PATCH /api/maintenance-logs/:id — Admin only. */
export async function updateMaintenanceLog(
  maintenanceLogId: string,
  input: FieldEditInput,
  actor: { id: string; role: Role },
  reason?: string,
) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const log = await tx.maintenanceLog.findUnique({ where: { id: maintenanceLogId } });
    if (!log || log.isDeleted) {
      throw new ApiError('NOT_FOUND', 'Maintenance log not found.');
    }

    const before = {
      description: log.description,
      costZar: log.costZar?.toString() ?? null,
      status: log.status,
    };

    const updated = await tx.maintenanceLog.update({
      where: { id: maintenanceLogId },
      data: input,
    });

    await writeAuditLogEntry(tx, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: 'MAINTENANCE_LOG_EDITED',
      targetType: 'MAINTENANCE_LOG',
      targetId: maintenanceLogId,
      beforeValue: before,
      afterValue: {
        description: updated.description,
        costZar: updated.costZar?.toString() ?? null,
        status: updated.status,
      },
      reason,
    });

    return updated;
  });
}

/** DELETE /api/maintenance-logs/:id — Admin only, soft delete. */
export async function deleteMaintenanceLog(
  maintenanceLogId: string,
  actor: { id: string; role: Role },
  reason?: string,
) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const log = await tx.maintenanceLog.findUnique({ where: { id: maintenanceLogId } });
    if (!log || log.isDeleted) {
      throw new ApiError('NOT_FOUND', 'Maintenance log not found.');
    }

    await tx.maintenanceLog.update({ where: { id: maintenanceLogId }, data: { isDeleted: true } });

    await writeAuditLogEntry(tx, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: 'MAINTENANCE_LOG_DELETED',
      targetType: 'MAINTENANCE_LOG',
      targetId: maintenanceLogId,
      beforeValue: { isDeleted: false },
      afterValue: { isDeleted: true },
      reason,
    });
  });
}
