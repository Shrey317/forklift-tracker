import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ForkliftDetailPanel } from '@/components/admin/forklift-detail-panel';

export default async function ForkliftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const forklift = await prisma.forklift.findUnique({ where: { id } });
  if (!forklift) notFound();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <p className="text-sm text-slate-500">{forklift.displayId}</p>
        <h1 className="text-2xl font-semibold text-slate-900">{forklift.name}</h1>
      </div>

      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- a server-generated QR code PNG, not an optimizable asset */}
          <img
            src={`/api/forklifts/${forklift.id}/qr-code`}
            alt={`QR code for ${forklift.displayId}`}
            width={192}
            height={192}
          />
          <a
            href={`/api/forklifts/${forklift.id}/qr-code`}
            download={`${forklift.displayId}-qr.png`}
            className="text-sm font-medium text-primary underline"
          >
            Download label
          </a>
        </div>

        <ForkliftDetailPanel
          forklift={{
            id: forklift.id,
            name: forklift.name,
            manufacturer: forklift.manufacturer,
            model: forklift.model,
            status: forklift.status,
            isActive: forklift.isActive,
          }}
        />
      </div>
    </div>
  );
}
