import { headers } from 'next/headers';
import { z } from 'zod';
import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { assertCsrfSafe } from '@/lib/csrf';
import { apiSuccess, handleRouteError } from '@/lib/errors';
import { setForkliftActive } from '@/server/services/forklifts/set-active';

const bodySchema = z.object({ reason: z.string().max(1000).optional() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole('ADMIN');

    const headerList = await headers();
    assertCsrfSafe(headerList);

    const { id } = await params;
    const rawBody = await request.text();
    const { reason } = bodySchema.parse(rawBody ? JSON.parse(rawBody) : {});

    const result = await prisma.$transaction((tx: Prisma.TransactionClient) => setForkliftActive(tx, id, false, actor, reason));

    return apiSuccess(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
