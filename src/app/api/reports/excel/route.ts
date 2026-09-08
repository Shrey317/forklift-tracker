import { requireRole } from '@/lib/auth';
import { handleRouteError } from '@/lib/errors';
import { isValidDateRange } from '@/lib/date-range';
import { ApiError } from '@/lib/errors';
import { getReportData } from '@/server/services/reports/report-data.service';
import { generateExcelReport } from '@/server/services/reports/excel-export.service';
import { z } from 'zod';

const exportQuerySchema = z.object({
  from: z.string().date(),
  to: z.string().date(),
});

/**
 * GET /api/reports/excel?from=2026-09-01&to=2026-09-08
 *
 * Generates and returns an Excel workbook (.xlsx) for the given date range.
 * Uses the exact same data service as the report page and PDF export.
 */
export async function GET(request: Request) {
  try {
    await requireRole('ADMIN');

    const { searchParams } = new URL(request.url);
    const query = exportQuerySchema.parse(Object.fromEntries(searchParams));

    if (!isValidDateRange(query.from, query.to)) {
      throw new ApiError('VALIDATION_FAILED', 'Start date must not be after end date.');
    }

    const data = await getReportData({ from: query.from, to: query.to });
    const buffer = await generateExcelReport(data);

    const filename = `forklift-report-${query.from}-to-${query.to}.xlsx`;

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
