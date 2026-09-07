import { headers } from 'next/headers';
import { requireRole } from '@/lib/auth';
import type { FuelLog } from '@/generated/prisma/client';
import { assertCsrfSafe } from '@/lib/csrf';
import { apiSuccess, handleRouteError } from '@/lib/errors';
import { serializeDecimals } from '@/lib/decimal';
import { createFuelLogSchema, listFuelLogsQuerySchema } from '@/lib/validations/fuel';
import { createFuelLog } from '@/server/services/fuel/create';
import { listFuelLogs } from '@/server/services/fuel/list';

const DECIMAL_KEYS = ['fuelAmountLiters', 'fuelCostZar', 'readingAtRefuel'] as const;

export async function GET(request: Request) {
  try {
    // "All" access (Section 19) — every role can view fuel history.
    await requireRole('ADMIN', 'SUPERVISOR', 'FUEL_SUPERVISOR');

    const { searchParams } = new URL(request.url);
    const query = listFuelLogsQuerySchema.parse(Object.fromEntries(searchParams));

    const result = await listFuelLogs(query);
    const items = result.items.map((f: FuelLog) => serializeDecimals(f, DECIMAL_KEYS));

    return apiSuccess(items, 200, { pagination: result.pagination });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireRole('FUEL_SUPERVISOR', 'ADMIN');

    const headerList = await headers();
    assertCsrfSafe(headerList);

    const body = await request.json();
    const input = createFuelLogSchema.parse(body);

    const fuelLog = await createFuelLog(input, actor);
    return apiSuccess(serializeDecimals(fuelLog, DECIMAL_KEYS), 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
