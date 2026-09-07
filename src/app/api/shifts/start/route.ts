import { headers } from 'next/headers';
import { requireRole } from '@/lib/auth';
import { assertCsrfSafe } from '@/lib/csrf';
import { apiSuccess, handleRouteError } from '@/lib/errors';
import { serializeDecimals } from '@/lib/decimal';
import { startShiftSchema } from '@/lib/validations/shift';
import { startShift } from '@/server/services/shifts/start';

const DECIMAL_KEYS = ['startingReading', 'endingReading', 'totalHoursWorked', 'totalReadingDelta'] as const;

export async function POST(request: Request) {
  try {
    const actor = await requireRole('SUPERVISOR', 'ADMIN');

    const headerList = await headers();
    assertCsrfSafe(headerList);

    const body = await request.json();
    const input = startShiftSchema.parse(body);

    const shift = await startShift(input, actor);
    return apiSuccess(serializeDecimals(shift, DECIMAL_KEYS), 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
