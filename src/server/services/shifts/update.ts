import type { Prisma, Role } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/errors';
import { writeAuditLogEntry } from '../audit/log';
import { assertEditedReadingWithinBounds, lockForklift } from './locking';
import { computeReadingDelta } from './calculations';

interface UpdateShiftInput {
  startingReading?: string;
  endingReading?: string;
  notes?: string;
}

/**
 * PATCH /api/shifts/:id — Admin only (enforced at the route). Business
 * Rule 28: never touches status or endTime (not in the input type at
 * all). Business Rule 26's edit case, per the resolved design: each
 * edited reading is checked bidirectionally against its own fixed
 * position in the forklift's full reading timeline
 * (assertEditedReadingWithinBounds), not just checked against what came
 * before it the way a brand-new record would be.
 */
export async function updateShift(
  shiftId: string,
  input: UpdateShiftInput,
  actor: { id: string; role: Role },
  reason?: string,
) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const shift = await tx.shift.findUnique({ where: { id: shiftId } });
    if (!shift || shift.isDeleted) {
      throw new ApiError('NOT_FOUND', 'Shift not found.');
    }

    // Setting an ending reading on a shift that hasn't been ended would
    // violate the DB's shift_status_fields_check constraint anyway (Locked
    // Decision #37) — caught here first for a clean, specific error
    // instead of a raw constraint failure surfacing as INTERNAL_ERROR.
    if (input.endingReading !== undefined && shift.status === 'ACTIVE') {
      throw new ApiError(
        'VALIDATION_FAILED',
        'Cannot set an ending reading on a shift that has not been ended yet.',
      );
    }

    await lockForklift(tx, shift.forkliftId);

    if (input.startingReading !== undefined) {
      await assertEditedReadingWithinBounds(tx, shift.forkliftId, shift.startTime, input.startingReading, {
        kind: 'shift_start',
        recordId: shiftId,
      });
    }
    if (input.endingReading !== undefined && shift.endTime) {
      await assertEditedReadingWithinBounds(tx, shift.forkliftId, shift.endTime, input.endingReading, {
        kind: 'shift_end',
        recordId: shiftId,
      });
    }

    const finalStartingReading = input.startingReading ?? shift.startingReading.toString();
    const finalEndingReading = input.endingReading ?? shift.endingReading?.toString();

    // Business Rule 3, re-checked with the FINAL (post-edit) values —
    // editing either reading individually could still break their mutual
    // relationship even if each passed its own bidirectional check above.
    if (shift.status === 'COMPLETED' && finalEndingReading !== undefined) {
      if (Number(finalEndingReading) < Number(finalStartingReading)) {
        throw new ApiError('INVALID_READING', 'Ending reading cannot be less than the starting reading.');
      }
      const linkedFuelLogs = await tx.fuelLog.findMany({
        where: { shiftId, isDeleted: false },
        select: { readingAtRefuel: true },
      });
      if (linkedFuelLogs.length > 0) {
        const maxFuelReading = Math.max(
          ...linkedFuelLogs.map((f: { readingAtRefuel: Prisma.Decimal }) => Number(f.readingAtRefuel)),
        );
        if (Number(finalEndingReading) < maxFuelReading) {
          throw new ApiError(
            'INVALID_READING',
            'Ending reading cannot be less than a fuel reading recorded during this shift.',
          );
        }
      }
    }

    // Recompute totalReadingDelta whenever either reading changes on a
    // completed shift — Business Rule 28 explicitly says this for
    // endingReading; startingReading feeds the same formula (Section 14)
    // so leaving it stale on a starting-reading-only edit would be the
    // same bug BR28 is naming, just for the other operand.
    const readingChanged = input.startingReading !== undefined || input.endingReading !== undefined;
    const shouldRecomputeDelta = shift.status === 'COMPLETED' && readingChanged && finalEndingReading !== undefined;

    const before = {
      startingReading: shift.startingReading.toString(),
      endingReading: shift.endingReading?.toString() ?? null,
      notes: shift.notes,
    };

    const updated = await tx.shift.update({
      where: { id: shiftId },
      data: {
        ...(input.startingReading !== undefined ? { startingReading: input.startingReading } : {}),
        ...(input.endingReading !== undefined ? { endingReading: input.endingReading } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(shouldRecomputeDelta
          ? { totalReadingDelta: computeReadingDelta(finalStartingReading, finalEndingReading as string) }
          : {}),
      },
    });

    await writeAuditLogEntry(tx, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: 'SHIFT_EDITED',
      targetType: 'SHIFT',
      targetId: shiftId,
      beforeValue: before,
      afterValue: {
        startingReading: updated.startingReading.toString(),
        endingReading: updated.endingReading?.toString() ?? null,
        notes: updated.notes,
      },
      reason,
    });

    return updated;
  });
}

/**
 * DELETE /api/shifts/:id — Admin only, soft delete. MUST NOT #22 / Business
 * Rule 27: never soft-delete an ACTIVE shift — it must be ended or
 * force-closed first. A soft-deleted active shift would still physically
 * be occupying the forklift, while the partial unique index (which only
 * counts non-deleted rows) would no longer see it, silently allowing a
 * second shift to start on a forklift that's actually still out.
 */
export async function deleteShift(shiftId: string, actor: { id: string; role: Role }, reason?: string) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const shift = await tx.shift.findUnique({ where: { id: shiftId } });
    if (!shift || shift.isDeleted) {
      throw new ApiError('NOT_FOUND', 'Shift not found.');
    }
    if (shift.status === 'ACTIVE') {
      throw new ApiError(
        'VALIDATION_FAILED',
        'Cannot delete an active shift — end or force-close it first.',
      );
    }

    await tx.shift.update({ where: { id: shiftId }, data: { isDeleted: true } });

    await writeAuditLogEntry(tx, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: 'SHIFT_DELETED',
      targetType: 'SHIFT',
      targetId: shiftId,
      beforeValue: { isDeleted: false },
      afterValue: { isDeleted: true },
      reason,
    });
  });
}
