import { headers } from 'next/headers';
import { requireRole } from '@/lib/auth';
import type { MaintenanceLog } from '@/generated/prisma/client';
import { assertCsrfSafe } from '@/lib/csrf';
import { apiSuccess, handleRouteError } from '@/lib/errors';
import { serializeDecimals } from '@/lib/decimal';
import { createMaintenanceLogSchema, listMaintenanceLogsQuerySchema } from '@/lib/validations/maintenance';
import { createMaintenanceLog } from '@/server/services/maintenance/create';
import { listMaintenanceLogs } from '@/server/services/maintenance/list';

const DECIMAL_KEYS = ['costZar'] as const;

export async function GET(request: Request) {
  try {
    // Section 12: Supervisor can view maintenance records, Fuel Supervisor
    // cannot.
    await requireRole('ADMIN', 'SUPERVISOR');

    const { searchParams } = new URL(request.url);
    const query = listMaintenanceLogsQuerySchema.parse(Object.fromEntries(searchParams));

    const result = await listMaintenanceLogs(query);
    const items = result.items.map((m: MaintenanceLog) => serializeDecimals(m, DECIMAL_KEYS));

    return apiSuccess(items, 200, { pagination: result.pagination });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    // Locked Decision #7: maintenance logging is admin-only, full stop —
    // unlike shifts/fuel, there's no Supervisor/Fuel-Supervisor create path.
    const actor = await requireRole('ADMIN');

    const headerList = await headers();
    assertCsrfSafe(headerList);

    const body = await request.json();
    const input = createMaintenanceLogSchema.parse(body);

    const maintenanceLog = await createMaintenanceLog(input, actor);
    return apiSuccess(serializeDecimals(maintenanceLog, DECIMAL_KEYS), 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
