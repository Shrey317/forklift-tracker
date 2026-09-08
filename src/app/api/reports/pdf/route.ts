import { requireRole } from '@/lib/auth';
import { handleRouteError, ApiError } from '@/lib/errors';
import { isValidDateRange } from '@/lib/date-range';
import { getReportData } from '@/server/services/reports/report-data.service';
import { generatePdfBuffer } from '@/server/services/reports/pdf-export';
import { z } from 'zod';

const exportQuerySchema = z.object({
  from: z.string().date(),
  to: z.string().date(),
});

export async function GET(request: Request) {
  try {
    await requireRole('ADMIN');

    const { searchParams } = new URL(request.url);
    const query = exportQuerySchema.parse(Object.fromEntries(searchParams));

    if (!isValidDateRange(query.from, query.to)) {
      throw new ApiError('VALIDATION_FAILED', 'Start date must not be after end date.');
    }

    const reportData = await getReportData({ from: query.from, to: query.to });
    const buffer = await generatePdfBuffer(reportData, query.from, query.to);

    return new Response(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="forklift-report-${query.from}-to-${query.to}.pdf"`,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
