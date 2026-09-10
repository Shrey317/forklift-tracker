import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { lookupForkliftByQrToken } from '@/server/services/forklifts/list';
import { prisma } from '@/lib/prisma';

export default async function ForkliftLandingPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params; // Next.js 16 async request API (Section 3)

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?redirectTo=/forklift/${encodeURIComponent(code)}`);
  }

  // Business Rule 23: filters ONLY on isActive = true, never on status —
  // this same lookup is what /api/forklifts/lookup uses.
  const forklift = await lookupForkliftByQrToken(code);

  if (!forklift) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Forklift not found</h1>
        <p className="text-sm text-slate-500">
          This code doesn&apos;t match an active forklift. It may have been deactivated, or the code may be
          incorrect.
        </p>
        <Link href="/scan" className="text-sm font-medium text-blue-800 underline">
          Back to scan
        </Link>
      </main>
    );
  }

  const openShift = await prisma.shift.findFirst({
    where: { forkliftId: forklift.id, status: 'ACTIVE', isDeleted: false },
    select: { id: true },
  });

  const canManageShifts = user.role === 'SUPERVISOR' || user.role === 'ADMIN';
  const canRecordFuel = (user.role === 'FUEL_SUPERVISOR' || user.role === 'ADMIN') && forklift.powerSource !== 'ELECTRIC';

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col gap-6 px-4 py-8">
      <div>
        <p className="text-sm text-slate-500">{forklift.displayId}</p>
        <h1 className="text-2xl font-semibold text-slate-900">{forklift.name}</h1>
        <p className="text-sm text-slate-500">
          {forklift.manufacturer} {forklift.model}
        </p>
        <StatusBadge status={forklift.status} />
      </div>

      <div className="flex flex-col gap-3">
        {canManageShifts && (
          <ActionLink
            href={openShift ? `/forklift/${code}/end-shift` : `/forklift/${code}/start-shift`}
            label={openShift ? 'End shift' : 'Start shift'}
            disabled={!openShift && forklift.status !== 'ACTIVE'}
            disabledReason={
              !openShift && forklift.status !== 'ACTIVE'
                ? `Unavailable — this forklift is ${forklift.status.replace('_', ' ').toLowerCase()}.`
                : undefined
            }
          />
        )}
        {canRecordFuel && <ActionLink href={`/forklift/${code}/fuel`} label="Record fuel" />}

        {!canManageShifts && !canRecordFuel && forklift.powerSource !== 'ELECTRIC' && (
          <p className="text-sm text-slate-500">
            Your role ({user.role.replace('_', ' ').toLowerCase()}) has no actions available for this
            forklift.
          </p>
        )}

        {forklift.powerSource === 'ELECTRIC' && (
          <div className="rounded-md bg-slate-50 p-4 border border-slate-200">
            <p className="text-sm font-medium text-slate-900">Electric Forklift</p>
            <p className="text-sm text-slate-500 mt-1">Fuel tracking is not applicable.</p>
          </div>
        )}
      </div>

      <Link href="/scan" className="text-sm text-slate-500 underline">
        Scan a different forklift
      </Link>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'ACTIVE';
  return (
    <span
      className={
        isActive
          ? 'mt-2 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-800'
          : 'mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800'
      }
    >
      {/* Section 25: status is never conveyed by color alone — the text
          label itself always carries the meaning. */}
      {status.replace('_', ' ')}
    </span>
  );
}

function ActionLink({
  href,
  label,
  disabled,
  disabledReason,
}: {
  href: string;
  label: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  if (disabled) {
    return (
      <div>
        <span className="flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-md bg-slate-200 px-4 py-2 text-sm font-medium text-slate-400">
          {label}
        </span>
        {disabledReason && <p className="mt-1 text-xs text-slate-500">{disabledReason}</p>}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="flex min-h-11 w-full items-center justify-center rounded-md bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
    >
      {label}
    </Link>
  );
}
