import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { lookupForkliftByQrToken } from '@/server/services/forklifts/list';
import { prisma } from '@/lib/prisma';
import { EndShiftForm } from '@/components/forms/end-shift-form';

export default async function EndShiftPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirectTo=/forklift/${encodeURIComponent(code)}/end-shift`);
  if (user.role !== 'SUPERVISOR' && user.role !== 'ADMIN') {
    redirect(`/forklift/${encodeURIComponent(code)}`);
  }

  const forklift = await lookupForkliftByQrToken(code);
  if (!forklift) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Forklift not found</h1>
        <Link href="/scan" className="text-sm font-medium text-primary underline">
          Back to scan
        </Link>
      </main>
    );
  }

  const openShift = await prisma.shift.findFirst({
    where: { forkliftId: forklift.id, status: 'ACTIVE', isDeleted: false },
    orderBy: { startTime: 'desc' },
  });

  if (!openShift) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-lg font-semibold text-slate-900">No shift in progress</h1>
        <p className="text-sm text-slate-500">{forklift.displayId} doesn&apos;t have an open shift right now.</p>
        <Link href={`/forklift/${code}`} className="text-sm font-medium text-primary underline">
          Back to {forklift.displayId}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col gap-6 px-4 py-8">
      <div>
        <p className="text-sm text-slate-500">{forklift.displayId}</p>
        <h1 className="text-2xl font-semibold text-slate-900">End shift</h1>
        <p className="mt-1 text-sm text-slate-500">
          Started at {openShift.startingReading.toString()} km
        </p>
      </div>
      <EndShiftForm
        shiftId={openShift.id}
        forkliftCode={code}
        startingReading={openShift.startingReading.toString()}
      />
    </main>
  );
}
