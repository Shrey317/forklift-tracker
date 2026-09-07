import type { Role, Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/errors';
import { writeAuditLogEntry } from '../audit/log';
import { assertReadingNotBackward, lockForklift } from './locking';
import { isShiftUniqueConstraintViolation } from './constraint-errors';

interface StartShiftInput {
  forkliftId: string;
  startingReading: string;
  notes?: string;
}

/**
 * Business Rules 1, 2, 9, 26; Locked Decisions #14, #25, #38. Everything
 * happens inside one transaction: the row lock, the status check, the
 * open-shift check, the monotonic-reading check, and the insert. The
 * app-level open-shift check gives a clean SHIFT_ALREADY_ACTIVE error in
 * the ordinary case; the partial unique index (caught below) is what
 * actually holds when two requests land close enough together to both
 * pass that check before either commits (Section 27).
 */
export async function startShift(input: StartShiftInput, actor: { id: string; role: Role }) {
  try {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const forklift = await lockForklift(tx, input.forkliftId);

      if (forklift.status !== 'ACTIVE' || !forklift.is_active) {
        throw new ApiError(
          'FORKLIFT_NOT_AVAILABLE',
          'This forklift is not available to start a shift (not ACTIVE status, or deactivated).',
        );
      }

      const openShift = await tx.shift.findFirst({
        where: { forkliftId: input.forkliftId, status: 'ACTIVE', isDeleted: false },
        select: { id: true },
      });
      if (openShift) {
        throw new ApiError('SHIFT_ALREADY_ACTIVE', 'This forklift already has an open shift.');
      }

      await assertReadingNotBackward(tx, input.forkliftId, input.startingReading);

      const shift = await tx.shift.create({
        data: {
          forkliftId: input.forkliftId,
          createdById: actor.id,
          startTime: new Date(),
          status: 'ACTIVE',
          startingReading: input.startingReading,
          notes: input.notes,
        },
      });

      // Only an Admin-performed create is an "Admin mutation" for Locked
      // Decision #18's purposes (Locked Decision #34's shared-account
      // scoping) — a Supervisor starting their own shift is already fully
      // attributed via createdById/createdAt on the row itself.
      if (actor.role === 'ADMIN') {
        await writeAuditLogEntry(tx, {
          actorUserId: actor.id,
          actorRole: actor.role,
          action: 'SHIFT_CREATED',
          targetType: 'SHIFT',
          targetId: shift.id,
          beforeValue: null,
          afterValue: { forkliftId: shift.forkliftId, startingReading: input.startingReading },
        });
      }

      return shift;
    });
  } catch (error) {
    if (isShiftUniqueConstraintViolation(error)) {
      throw new ApiError('SHIFT_ALREADY_ACTIVE', 'This forklift already has an open shift.');
    }
    throw error;
  }
}
