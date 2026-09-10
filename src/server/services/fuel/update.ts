import type { Prisma, Role } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/errors';
import { writeAuditLogEntry } from '../audit/log';
import { assertEditedReadingWithinBounds, lockForklift } from '../shifts/locking';

interface UpdateFuelLogInput {
  fuelAmountLiters?: string;
  fuelCostZar?: string;
  readingAtRefuel?: string;
  notes?: string;
}

/** PATCH /api/fuel-logs/:id — Admin only. */
export async function updateFuelLog(
  fuelLogId: string,
  input: UpdateFuelLogInput,
  actor: { id: string; role: Role },
  reason?: string,
) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const fuelLog = await tx.fuelLog.findUnique({ where: { id: fuelLogId } });
    if (!fuelLog || fuelLog.isDeleted) {
      throw new ApiError('NOT_FOUND', 'Fuel log not found.');
    }

    const lockedForklift = await lockForklift(tx, fuelLog.forkliftId);
    if (lockedForklift.power_source === 'ELECTRIC') {
      throw new ApiError('INVALID_STATE', 'Electric forklifts do not support fuel tracking.');
    }

    if (input.readingAtRefuel !== undefined) {
      await assertEditedReadingWithinBounds(
        tx,
        fuelLog.forkliftId,
        fuelLog.refuelDateTime,
        input.readingAtRefuel,
        { kind: 'fuel_log', recordId: fuelLogId },
      );
    }

    const before = {
      fuelAmountLiters: fuelLog.fuelAmountLiters.toString(),
      fuelCostZar: fuelLog.fuelCostZar?.toString() ?? null,
      readingAtRefuel: fuelLog.readingAtRefuel.toString(),
      notes: fuelLog.notes,
    };

    const updated = await tx.fuelLog.update({
      where: { id: fuelLogId },
      data: {
        ...(input.fuelAmountLiters !== undefined ? { fuelAmountLiters: input.fuelAmountLiters } : {}),
        ...(input.fuelCostZar !== undefined ? { fuelCostZar: input.fuelCostZar } : {}),
        ...(input.readingAtRefuel !== undefined ? { readingAtRefuel: input.readingAtRefuel } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
    });

    await writeAuditLogEntry(tx, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: 'FUEL_LOG_EDITED',
      targetType: 'FUEL_LOG',
      targetId: fuelLogId,
      beforeValue: before,
      afterValue: {
        fuelAmountLiters: updated.fuelAmountLiters.toString(),
        fuelCostZar: updated.fuelCostZar?.toString() ?? null,
        readingAtRefuel: updated.readingAtRefuel.toString(),
        notes: updated.notes,
      },
      reason,
    });

    return updated;
  });
}

/**
 * DELETE /api/fuel-logs/:id — Admin only, soft delete. No open-record
 * restriction the way shift deletion has (Locked Decision #16 forbids
 * hard delete; there's no "active" state for a fuel log to be caught
 * mid-way through the way a shift can be).
 */
export async function deleteFuelLog(fuelLogId: string, actor: { id: string; role: Role }, reason?: string) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const fuelLog = await tx.fuelLog.findUnique({ where: { id: fuelLogId } });
    if (!fuelLog || fuelLog.isDeleted) {
      throw new ApiError('NOT_FOUND', 'Fuel log not found.');
    }

    await tx.fuelLog.update({ where: { id: fuelLogId }, data: { isDeleted: true } });

    await writeAuditLogEntry(tx, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: 'FUEL_LOG_DELETED',
      targetType: 'FUEL_LOG',
      targetId: fuelLogId,
      beforeValue: { isDeleted: false },
      afterValue: { isDeleted: true },
      reason,
    });
  });
}
