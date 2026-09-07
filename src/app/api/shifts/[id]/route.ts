import { headers } from 'next/headers';
import { requireRole } from '@/lib/auth';
import { assertCsrfSafe } from '@/lib/csrf';
import { apiSuccess, handleRouteError } from '@/lib/errors';
import { serializeDecimals } from '@/lib/decimal';
import { updateShiftSchema } from '@/lib/validations/shift';
import { deleteShift, updateShift } from '@/server/services/shifts/update';

const DECIMAL_KEYS = ['startingReading', 'endingReading', 'totalHoursWorked', 'totalReadingDelta'] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole('ADMIN');

    const headerList = await headers();
    assertCsrfSafe(headerList);

    const { id } = await params;
    const body = await request.json();
    const { reason, ...fields } = updateShiftSchema.parse(body);

    const shift = await updateShift(id, fields, actor, reason);
    return apiSuccess(serializeDecimals(shift, DECIMAL_KEYS));
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
    await deleteShift(id, actor);
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
