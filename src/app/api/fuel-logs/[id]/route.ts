import { headers } from 'next/headers';
import { requireRole } from '@/lib/auth';
import { assertCsrfSafe } from '@/lib/csrf';
import { apiSuccess, handleRouteError } from '@/lib/errors';
import { serializeDecimals } from '@/lib/decimal';
import { updateFuelLogSchema } from '@/lib/validations/fuel';
import { deleteFuelLog, updateFuelLog } from '@/server/services/fuel/update';

const DECIMAL_KEYS = ['fuelAmountLiters', 'fuelCostZar', 'readingAtRefuel'] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole('ADMIN');

    const headerList = await headers();
    assertCsrfSafe(headerList);

    const { id } = await params;
    const body = await request.json();
    const { reason, ...fields } = updateFuelLogSchema.parse(body);

    const fuelLog = await updateFuelLog(id, fields, actor, reason);
    return apiSuccess(serializeDecimals(fuelLog, DECIMAL_KEYS));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole('ADMIN');

    const headerList = await headers();
    assertCsrfSafe(headerList);

    const { id } = await params;
    await deleteFuelLog(id, actor);
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
