import { headers } from 'next/headers';
import { requireRole } from '@/lib/auth';
import { assertCsrfSafe } from '@/lib/csrf';
import { apiSuccess, handleRouteError } from '@/lib/errors';
import { serializeDecimals } from '@/lib/decimal';
import { endShiftSchema } from '@/lib/validations/shift';
import { endShift } from '@/server/services/shifts/end';

const DECIMAL_KEYS = ['startingReading', 'endingReading', 'totalHoursWorked', 'totalReadingDelta'] as const;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole('SUPERVISOR', 'ADMIN');

    const headerList = await headers();
    assertCsrfSafe(headerList);

    const { id } = await params;
    const body = await request.json();
    const input = endShiftSchema.parse(body);

    const shift = await endShift(id, input, actor);
    return apiSuccess(serializeDecimals(shift, DECIMAL_KEYS));
  } catch (error) {
    return handleRouteError(error);
  }
}
