import type { Prisma, Role } from '@/generated/prisma/client';
import { ApiError } from '@/lib/errors';
import { writeAuditLogEntry } from '../audit/log';

interface ForkliftLockRow {
  id: string;
  display_id: string;
  name: string;
  manufacturer: string;
  model: string;
  status: string;
  is_active: boolean;
}

/**
 * Transitions a Forklift's isActive flag, enforcing Locked Decision #27
 * (never deactivate with an open shift) as a property of the STATE CHANGE
 * itself — not a rule that only the dedicated POST .../deactivate route
 * happens to enforce. PATCH /api/forklifts/:id's isActive field calls this
 * exact same function for a true→false transition, so there's no second
 * path that could bypass the check.
 *
 * Takes a row lock on the Forklift (SELECT ... FOR UPDATE) before deciding
 * anything, per Section 27's "re-check inside the same transaction, not an
 * earlier check that could go stale before the write." Week 2 note: when
 * shift-starting is built, it must take a lock on this same Forklift row
 * too (it will, per Business Rule 26 / Locked Decision #38's identical
 * requirement for the monotonic-reading check) — that's what actually
 * closes the race between "a shift starts" and "this forklift gets
 * deactivated" happening at the same instant. This function alone is only
 * half of that guarantee until Week 2's shift-start also locks the row.
 */
export async function setForkliftActive(
  tx: Prisma.TransactionClient,
  forkliftId: string,
  targetActive: boolean,
  actor: { id: string; role: Role },
  reason?: string,
): Promise<{ id: string; displayId: string; isActive: boolean }> {
  const rows = await tx.$queryRaw<ForkliftLockRow[]>`
    SELECT id, display_id, name, manufacturer, model, status, is_active
    FROM forklifts WHERE id = ${forkliftId} FOR UPDATE
  `;
  const before = rows[0];
  if (!before) {
    throw new ApiError('NOT_FOUND', 'Forklift not found.');
  }

  if (before.is_active === targetActive) {
    // Already in the target state — a no-op, not an error. Reactivating an
    // already-active forklift (or "deactivating" an already-inactive one)
    // isn't a state change worth an audit entry.
    return { id: before.id, displayId: before.display_id, isActive: before.is_active };
  }

  if (targetActive === false) {
    const openShift = await tx.shift.findFirst({
      where: { forkliftId, status: 'ACTIVE', isDeleted: false },
      select: { id: true },
    });
    if (openShift) {
      throw new ApiError(
        'FORKLIFT_HAS_ACTIVE_SHIFT',
        'This forklift has an open shift. End or force-close it before deactivating.',
      );
    }
  }

  await tx.forklift.update({
    where: { id: forkliftId },
    data: { isActive: targetActive },
  });

  await writeAuditLogEntry(tx, {
    actorUserId: actor.id,
    actorRole: actor.role,
    action: targetActive ? 'FORKLIFT_ACTIVATED' : 'FORKLIFT_DEACTIVATED',
    targetType: 'FORKLIFT',
    targetId: forkliftId,
    beforeValue: { isActive: before.is_active },
    afterValue: { isActive: targetActive },
    reason,
  });

  return { id: before.id, displayId: before.display_id, isActive: targetActive };
}
