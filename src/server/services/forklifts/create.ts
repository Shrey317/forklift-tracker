import type { Role, Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import type { CreateForkliftInput } from '@/lib/validations/forklift';
import { writeAuditLogEntry } from '../audit/log';
import { allocateDisplayId } from './display-id';
import { generateQrToken } from './qr-token';

export async function createForklift(input: CreateForkliftInput, actor: { id: string; role: Role }) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const { sequenceNumber, displayId } = await allocateDisplayId(tx);
    const qrToken = generateQrToken();

    const forklift = await tx.forklift.create({
      data: {
        sequenceNumber,
        displayId,
        name: input.name,
        manufacturer: input.manufacturer,
        model: input.model,
        powerSource: input.powerSource,
        trackingMode: input.trackingMode,
        qrToken,
        createdById: actor.id,
      },
    });

    await writeAuditLogEntry(tx, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: 'FORKLIFT_CREATED',
      targetType: 'FORKLIFT',
      targetId: forklift.id,
      beforeValue: null,
      afterValue: {
        displayId: forklift.displayId,
        name: forklift.name,
        manufacturer: forklift.manufacturer,
        model: forklift.model,
        powerSource: forklift.powerSource,
        trackingMode: forklift.trackingMode,
        status: forklift.status,
        isActive: forklift.isActive,
      },
    });

    return forklift;
  });
}
