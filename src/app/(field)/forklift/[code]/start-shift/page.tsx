import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { lookupForkliftByQrToken } from '@/server/services/forklifts/list';
import { StartShiftForm } from '@/components/forms/start-shift-form';

export default async function StartShiftPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirectTo=/forklift/${encodeURIComponent(code)}/start-shift`);
  // Section 24: Supervisor, Admin only. A hidden action link on the
  // landing page isn't enforcement (Section 28) — this page checks for
  // itself, same as every API route does.
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

  if (forklift.status !== 'ACTIVE') {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Not available</h1>
        <p className="text-sm text-slate-500">
          {forklift.displayId} is currently {forklift.status.replace('_', ' ').toLowerCase()} and can&apos;t
          start a new shift.
        </p>
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
        <h1 className="text-2xl font-semibold text-slate-900">Start shift</h1>
      </div>
      <StartShiftForm forkliftId={forklift.id} forkliftCode={code} />
    </main>
  );
}
