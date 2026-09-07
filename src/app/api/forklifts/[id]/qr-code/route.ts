import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ApiError, handleRouteError } from '@/lib/errors';
import { generateQrCodePng } from '@/server/services/forklifts/qr-code';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('ADMIN');

    const { id } = await params;
    const forklift = await prisma.forklift.findUnique({ where: { id }, select: { qrToken: true } });
    if (!forklift) {
      throw new ApiError('NOT_FOUND', 'Forklift not found.');
    }

    const png = await generateQrCodePng(forklift.qrToken);

    // Deliberately a raw image response, not the {data: ...} JSON envelope
    // — that convention is for JSON API responses, and doesn't fit a
    // binary image resource. This lets <img src="/api/forklifts/{id}/qr-code">
    // work directly.
    return new Response(new Uint8Array(png), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'private, no-store', // Section 41 — nothing authenticated goes in a shared/disk cache
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
