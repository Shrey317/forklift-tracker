import Link from 'next/link';
import type { User } from '@/generated/prisma/client';

export function AdminDashboard({ data, user }: { data: any; user: User }) {
  const { stats } = data;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Good morning, {user.displayName ?? user.username}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Fleet Stats */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Fleet</h2>
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between"><dt className="text-slate-600">Total forklifts</dt><dd className="font-medium text-foreground">{stats.totalForklifts}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">Active</dt><dd className="font-medium text-foreground">{stats.activeForklifts}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">In use</dt><dd className="font-medium text-blue-600">{stats.inUseForklifts}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">Maintenance</dt><dd className="font-medium text-amber-600">{stats.maintenanceForklifts ?? 0}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">Out of service</dt><dd className="font-medium text-red-600">{stats.outOfServiceForklifts}</dd></div>
          </dl>
        </div>

        {/* Operations Stats */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Operations</h2>
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between"><dt className="text-slate-600">Total hours worked</dt><dd className="font-medium text-foreground">{stats.totalHoursWorked}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">Total shifts completed</dt><dd className="font-medium text-foreground">{stats.totalShiftsCompleted}</dd></div>
          </dl>
        </div>

        {/* Fuel Stats */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Fuel</h2>
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between"><dt className="text-slate-600">Total fuel used</dt><dd className="font-medium text-foreground">{stats.totalFuelUsedLiters} L</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">Total fuel cost</dt><dd className="font-medium text-foreground">R {stats.totalFuelCostZar}</dd></div>
          </dl>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border bg-slate-50 dark:bg-slate-800 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 divide-x divide-border divide-y border-t border-border sm:grid-cols-3 md:grid-cols-6">
          <Link href="/admin/forklifts/new" className="flex flex-col items-center justify-center gap-2 p-6 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary">Add Forklift</Link>
          <Link href="/admin/forklifts" className="flex flex-col items-center justify-center gap-2 p-6 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary">Manage Forklifts</Link>
          <Link href="/admin/shifts" className="flex flex-col items-center justify-center gap-2 p-6 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary">View Shifts</Link>
          <Link href="/admin/fuel-logs" className="flex flex-col items-center justify-center gap-2 p-6 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary">View Fuel Logs</Link>
          <Link href="/admin/maintenance" className="flex flex-col items-center justify-center gap-2 p-6 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary">Manage Maintenance</Link>
          <Link href="/admin/report" className="flex flex-col items-center justify-center gap-2 p-6 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary">Generate Report</Link>
        </div>
      </div>
    </div>
  );
}
