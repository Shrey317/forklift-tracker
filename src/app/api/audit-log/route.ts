import { requireRole } from '@/lib/auth';
import { apiSuccess, handleRouteError } from '@/lib/errors';
import { listAuditLogQuerySchema } from '@/lib/validations/audit';
import { listAuditLog } from '@/server/services/audit/list';

export async function GET(request: Request) {
  try {
    await requireRole('ADMIN');

    const { searchParams } = new URL(request.url);
    const query = listAuditLogQuerySchema.parse(Object.fromEntries(searchParams));

    const result = await listAuditLog(query);
    return apiSuccess(result.items, 200, { pagination: result.pagination });
  } catch (error) {
    return handleRouteError(error);
  }
}
