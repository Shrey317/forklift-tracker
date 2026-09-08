import { requireRole } from '@/lib/auth';
import { handleRouteError, apiSuccess } from '@/lib/errors';
import { isValidDateRange } from '@/lib/date-range';
import { ApiError } from '@/lib/errors';
import { getReportData } from '@/server/services/reports/report-data.service';
import { z } from 'zod';

const reportQuerySchema = z.object({
  from: z.string().date(),
  to: z.string().date(),
});

/**
 * GET /api/reports?from=2026-09-01&to=2026-09-08
 *
 * Returns full report data for the given date range. Protected: ADMIN only
 * (reports contain full operational data across all forklifts/users).
 */
export async function GET(request: Request) {
  try {
    await requireRole('ADMIN');

    const { searchParams } = new URL(request.url);
    const query = reportQuerySchema.parse(Object.fromEntries(searchParams));

    if (!isValidDateRange(query.from, query.to)) {
      throw new ApiError('VALIDATION_FAILED', 'Start date must not be after end date.');
    }

    const data = await getReportData({ from: query.from, to: query.to });
    return apiSuccess(data);
  } catch (error) {
    return handleRouteError(error);
  }
}
