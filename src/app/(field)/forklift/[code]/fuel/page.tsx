import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { lookupForkliftByQrToken } from '@/server/services/forklifts/list';
import { FuelForm } from '@/components/forms/fuel-form';

export default async function FuelPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirectTo=/forklift/${encodeURIComponent(code)}/fuel`);
  if (user.role !== 'FUEL_SUPERVISOR' && user.role !== 'ADMIN') {
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

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col gap-6 px-4 py-8">
      <div>
        <p className="text-sm text-slate-500">{forklift.displayId}</p>
        <h1 className="text-2xl font-semibold text-slate-900">Record fuel</h1>
      </div>
      <FuelForm forkliftId={forklift.id} forkliftCode={code} />
    </main>
  );
}
