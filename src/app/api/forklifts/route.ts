import { headers } from 'next/headers';
import { requireRole } from '@/lib/auth';
import { assertCsrfSafe } from '@/lib/csrf';
import { apiSuccess, handleRouteError } from '@/lib/errors';
import { createForkliftSchema, listForkliftsQuerySchema } from '@/lib/validations/forklift';
import { createForklift } from '@/server/services/forklifts/create';
import { listForklifts } from '@/server/services/forklifts/list';

export async function GET(request: Request) {
  try {
    // "All" access (Section 19) — every authenticated role can search for
    // a forklift, not just Admin.
    await requireRole('ADMIN', 'SUPERVISOR', 'FUEL_SUPERVISOR');

    const { searchParams } = new URL(request.url);
    const query = listForkliftsQuerySchema.parse(Object.fromEntries(searchParams));

    const result = await listForklifts(query);
    return apiSuccess(result.items, 200, { pagination: result.pagination });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireRole('ADMIN');

    const headerList = await headers();
    assertCsrfSafe(headerList);

    const body = await request.json();
    const input = createForkliftSchema.parse(body);

    const forklift = await createForklift(input, actor);
    return apiSuccess(forklift, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
