import type { AuditAction, AuditTargetType, Prisma, Role } from '@/generated/prisma/client';

interface AuditEntryInput {
  actorUserId: string;
  actorRole: Role;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  beforeValue?: unknown;
  afterValue?: unknown;
  reason?: string | null;
}

/**
 * Writes one AuditLogEntry row. MUST be called with the same transaction
 * client (`tx`) as the mutation it's recording — Section 27 requires the
 * mutation and its audit record to never diverge; if one fails, both roll
 * back. Never call this outside a transaction shared with the mutation.
 *
 * before/afterValue are passed through Prisma's Json field as-is; callers
 * are responsible for having already converted any Decimal fields to
 * strings (Locked Decision #29) before calling this, same as any other API
 * boundary — an audit snapshot is still API-facing data.
 */
export async function writeAuditLogEntry(
  tx: Prisma.TransactionClient,
  entry: AuditEntryInput,
): Promise<void> {
  await tx.auditLogEntry.create({
    data: {
      actorUserId: entry.actorUserId,
      actorRole: entry.actorRole,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      beforeValue: entry.beforeValue === undefined ? undefined : (entry.beforeValue as Prisma.InputJsonValue),
      afterValue: entry.afterValue === undefined ? undefined : (entry.afterValue as Prisma.InputJsonValue),
      reason: entry.reason ?? null,
    },
  });
}
