import { requireRole } from '@/lib/auth';
import type { Shift } from '@/generated/prisma/client';
import { apiSuccess, handleRouteError } from '@/lib/errors';
import { serializeDecimals } from '@/lib/decimal';
import { listShiftsQuerySchema } from '@/lib/validations/shift';
import { listShifts } from '@/server/services/shifts/list';

const DECIMAL_KEYS = ['startingReading', 'endingReading', 'totalHoursWorked', 'totalReadingDelta'] as const;

export async function GET(request: Request) {
  try {
    await requireRole('ADMIN', 'SUPERVISOR');

    const { searchParams } = new URL(request.url);
    const query = listShiftsQuerySchema.parse(Object.fromEntries(searchParams));

    const result = await listShifts(query);
    const items = result.items.map((s: Shift) => serializeDecimals(s, DECIMAL_KEYS));

    return apiSuccess(items, 200, { pagination: result.pagination });
  } catch (error) {
    return handleRouteError(error);
  }
}
