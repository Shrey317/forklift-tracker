import type { Prisma, Role } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/errors';
import { writeAuditLogEntry } from '../audit/log';
import { lockForklift } from './locking';
import { computeHoursWorked, computeReadingDelta } from './calculations';

interface EndShiftInput {
  endingReading: string;
  notes?: string;
}

async function endShiftCore(
  tx: Prisma.TransactionClient,
  shiftId: string,
  input: EndShiftInput,
  actor: { id: string; role: Role },
  endType: 'NORMAL' | 'FORCE_CLOSED',
) {
  const shift = await tx.shift.findUnique({ where: { id: shiftId } });
  if (!shift || shift.isDeleted) {
    throw new ApiError('NOT_FOUND', 'Shift not found.');
  }
  if (shift.status === 'COMPLETED') {
    throw new ApiError('SHIFT_ALREADY_COMPLETED', 'This shift has already been completed.');
  }

  // Section 27 lists shift end/force-close among the operations that must
  // take the forklift row lock — not because THIS check needs the
  // forklift's wider reading history (it doesn't; see the comment below),
  // but to serialize against a concurrent shift-START on the same
  // forklift that might be reading the "most recent reading" state this
  // operation is about to change.
  await lockForklift(tx, shift.forkliftId);

  // Business Rule 3: endingReading >= startingReading.
  if (Number(input.endingReading) < Number(shift.startingReading)) {
    throw new ApiError('INVALID_READING', 'Ending reading cannot be less than the starting reading.');
  }

  // Business Rule 3: endingReading >= the highest readingAtRefuel among
  // fuel logs already linked to THIS shift. Deliberately narrower than
  // the full-history monotonic check (Business Rule 26) — that check is
  // for NEW Shift.startingReading/FuelLog.readingAtRefuel values only.
  // It's still sufficient here: Business Rule 10's auto-link means every
  // fuel entry recorded while this shift was open is already linked to
  // it, so there's no other source of a newer, higher reading this check
  // could be missing.
  const linkedFuelLogs = await tx.fuelLog.findMany({
    where: { shiftId, isDeleted: false },
    select: { readingAtRefuel: true },
  });
  if (linkedFuelLogs.length > 0) {
    const maxFuelReading = Math.max(...linkedFuelLogs.map((f: { readingAtRefuel: Prisma.Decimal }) => Number(f.readingAtRefuel)));
    if (Number(input.endingReading) < maxFuelReading) {
      throw new ApiError(
        'INVALID_READING',
        'Ending reading cannot be less than a fuel reading already recorded during this shift.',
      );
    }
  }

  const endTime = new Date();
  const totalHoursWorked = computeHoursWorked(shift.startTime, endTime);
  const totalReadingDelta = computeReadingDelta(shift.startingReading.toString(), input.endingReading);

  const updated = await tx.shift.update({
    where: { id: shiftId },
    data: {
      endTime,
      status: 'COMPLETED',
      endingReading: input.endingReading,
      totalHoursWorked,
      totalReadingDelta,
      endedById: actor.id,
      endType,
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
  });

  if (actor.role === 'ADMIN') {
    await writeAuditLogEntry(tx, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: endType === 'FORCE_CLOSED' ? 'SHIFT_FORCE_CLOSED' : 'SHIFT_ENDED',
      targetType: 'SHIFT',
      targetId: shiftId,
      beforeValue: { status: shift.status, endTime: null },
      afterValue: { status: 'COMPLETED', endingReading: input.endingReading, totalHoursWorked, totalReadingDelta },
    });
  }

  return updated;
}

/** Business Rules 3–4, 9. Supervisor or Admin — enforced at the route layer. */
export async function endShift(shiftId: string, input: EndShiftInput, actor: { id: string; role: Role }) {
  return prisma.$transaction((tx: Prisma.TransactionClient) => endShiftCore(tx, shiftId, input, actor, 'NORMAL'));
}

/** Locked Decision #8 — manual admin force-close, no automatic detection of forgotten shifts. Admin only — enforced at the route layer. */
export async function forceCloseShift(
  shiftId: string,
  input: EndShiftInput,
  actor: { id: string; role: Role },
) {
  return prisma.$transaction((tx: Prisma.TransactionClient) => endShiftCore(tx, shiftId, input, actor, 'FORCE_CLOSED'));
}
