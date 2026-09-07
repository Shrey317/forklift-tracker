import type { Role, Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { writeAuditLogEntry } from '../audit/log';
import { assertReadingNotBackward, lockForklift } from '../shifts/locking';
import type { CreateFuelLogInput } from '@/lib/validations/fuel';

export async function createFuelLog(input: CreateFuelLogInput, actor: { id: string; role: Role }) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Fuel entries are deliberately NOT gated on forklift status or
    // isActive (Locked Decision #10: maintenance/fuel entries are never
    // blocked by status; Business Rule 7: fuel never requires an open
    // shift) — the lock here is purely for the monotonic-reading check's
    // safety, not an availability gate the way shift-start's is.
    await lockForklift(tx, input.forkliftId);

    await assertReadingNotBackward(tx, input.forkliftId, input.readingAtRefuel);

    // Business Rule 10: a new fuel entry attaches to the forklift's open
    // shift, if one exists — otherwise it saves unlinked. At most one
    // open shift can ever exist per forklift (Locked Decision #14), so
    // there's no "multiple open" case to resolve.
    const openShift = await tx.shift.findFirst({
      where: { forkliftId: input.forkliftId, status: 'ACTIVE', isDeleted: false },
      select: { id: true },
    });

    const fuelLog = await tx.fuelLog.create({
      data: {
        forkliftId: input.forkliftId,
        createdById: actor.id,
        shiftId: openShift?.id,
        fuelAmountLiters: input.fuelAmountLiters,
        fuelCostZar: input.fuelCostZar,
        readingAtRefuel: input.readingAtRefuel,
        notes: input.notes,
      },
    });

    // Same Locked Decision #18/#34 scoping as shift creation: only an
    // Admin-performed create needs an audit entry.
    if (actor.role === 'ADMIN') {
      await writeAuditLogEntry(tx, {
        actorUserId: actor.id,
        actorRole: actor.role,
        action: 'FUEL_LOG_CREATED',
        targetType: 'FUEL_LOG',
        targetId: fuelLog.id,
        beforeValue: null,
        afterValue: {
          forkliftId: input.forkliftId,
          fuelAmountLiters: input.fuelAmountLiters,
          readingAtRefuel: input.readingAtRefuel,
          shiftId: fuelLog.shiftId,
        },
      });
    }

    return fuelLog;
  });
}
