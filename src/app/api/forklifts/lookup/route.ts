import { requireRole } from '@/lib/auth';
import { ApiError, apiSuccess, handleRouteError } from '@/lib/errors';
import { lookupForkliftQuerySchema } from '@/lib/validations/forklift';
import { lookupForkliftByQrToken } from '@/server/services/forklifts/list';

export async function GET(request: Request) {
  try {
    await requireRole('ADMIN', 'SUPERVISOR', 'FUEL_SUPERVISOR');

    const { searchParams } = new URL(request.url);
    const { code } = lookupForkliftQuerySchema.parse(Object.fromEntries(searchParams));

    const forklift = await lookupForkliftByQrToken(code);
    if (!forklift) {
      throw new ApiError('NOT_FOUND', 'No matching forklift found.');
    }

    return apiSuccess(forklift);
  } catch (error) {
    return handleRouteError(error);
  }
}
