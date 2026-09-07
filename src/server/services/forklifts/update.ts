import type { Prisma, Role } from '@/generated/prisma/client';
import { ApiError } from '@/lib/errors';
import type { UpdateForkliftInput } from '@/lib/validations/forklift';
import { writeAuditLogEntry } from '../audit/log';

type FieldEditInput = Omit<UpdateForkliftInput, 'isActive' | 'reason'>;

export async function updateForkliftFields(
  tx: Prisma.TransactionClient,
  forkliftId: string,
  input: FieldEditInput,
  actor: { id: string; role: Role },
  reason?: string,
) {
  const before = await tx.forklift.findUnique({ where: { id: forkliftId } });
  if (!before) {
    throw new ApiError('NOT_FOUND', 'Forklift not found.');
  }

  if (Object.keys(input).length === 0) {
    return before;
  }

  const after = await tx.forklift.update({
    where: { id: forkliftId },
    data: input,
  });

  // A single PATCH can touch several fields at once, but AuditAction is
  // one enum value per row. The action label captures the most significant
  // category of what changed (status change ranks above a plain field
  // edit); before/afterValue capture the FULL diff regardless, so no
  // information is lost even when only one label is chosen.
  const statusChanged = input.status !== undefined && input.status !== before.status;
  const action = statusChanged ? 'FORKLIFT_STATUS_CHANGED' : 'FORKLIFT_EDITED';

  await writeAuditLogEntry(tx, {
    actorUserId: actor.id,
    actorRole: actor.role,
    action,
    targetType: 'FORKLIFT',
    targetId: forkliftId,
    beforeValue: {
      name: before.name,
      manufacturer: before.manufacturer,
      model: before.model,
      status: before.status,
    },
    afterValue: {
      name: after.name,
      manufacturer: after.manufacturer,
      model: after.model,
      status: after.status,
    },
    reason,
  });

  return after;
}
