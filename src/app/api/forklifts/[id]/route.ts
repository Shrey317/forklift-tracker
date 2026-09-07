import { headers } from 'next/headers';
import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { assertCsrfSafe } from '@/lib/csrf';
import { apiSuccess, handleRouteError } from '@/lib/errors';
import { updateForkliftSchema } from '@/lib/validations/forklift';
import { updateForkliftFields } from '@/server/services/forklifts/update';
import { setForkliftActive } from '@/server/services/forklifts/set-active';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole('ADMIN');

    const headerList = await headers();
    assertCsrfSafe(headerList);

    const { id } = await params; // Next.js 16 async request API (Section 3)
    const body = await request.json();
    const { isActive, reason, ...fieldEdits } = updateForkliftSchema.parse(body);

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let latest = null;

      if (Object.keys(fieldEdits).length > 0) {
        latest = await updateForkliftFields(tx, id, fieldEdits, actor, reason);
      }

      if (isActive !== undefined) {
        await setForkliftActive(tx, id, isActive, actor, reason);
      }

      return latest ?? tx.forklift.findUniqueOrThrow({ where: { id } });
    });

    return apiSuccess(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
