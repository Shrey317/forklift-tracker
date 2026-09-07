import { getCurrentUser } from '@/lib/auth';
import { ApiError, apiSuccess, handleRouteError } from '@/lib/errors';
import { getDashboardData } from '@/server/services/dashboard/dashboard.service';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError('INVALID_ROLE', 'Unauthorized');

    const data = await getDashboardData(user);
    return apiSuccess(data);
  } catch (error) {
    return handleRouteError(error);
  }
}
