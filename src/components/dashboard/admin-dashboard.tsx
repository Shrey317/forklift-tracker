import Link from 'next/link';
import type { User } from '@/generated/prisma/client';
import { formatHours, formatLitres, formatZar, formatDateTime, formatStatus, getStatusBadgeClasses, getStatusIcon } from '@/lib/format';
import { DashboardCharts } from './dashboard-charts';

export function AdminDashboard({ data, user }: { data: any; user: User }) {
  const { stats, trends, recentShifts, fuelSummary } = data;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Welcome, {user.displayName ?? user.username}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Fleet Stats */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Fleet</h2>
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between"><dt className="text-slate-600">Total forklifts</dt><dd className="font-medium text-slate-900">{stats.totalForklifts}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">● Active</dt><dd className="font-medium text-green-700">{stats.activeForklifts}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">In use</dt><dd className="font-medium text-blue-700">{stats.inUseForklifts}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">⚠ Maintenance</dt><dd className="font-medium text-amber-700">{stats.maintenanceForklifts ?? 0}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">✕ Out of service</dt><dd className="font-medium text-red-700">{stats.outOfServiceForklifts}</dd></div>
          </dl>
        </div>

        {/* Operations Stats */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Operations</h2>
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between"><dt className="text-slate-600">Total hours worked</dt><dd className="font-medium text-slate-900">{formatHours(stats.totalHoursWorked)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">Total shifts completed</dt><dd className="font-medium text-slate-900">{stats.totalShiftsCompleted}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">Most used forklift</dt><dd className="font-medium text-slate-900">{stats.mostUsedForklift?.displayId ?? '—'}</dd></div>
          </dl>
        </div>

        {/* Fuel Stats */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Fuel</h2>
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between"><dt className="text-slate-600">Total fuel used</dt><dd className="font-medium text-slate-900">{formatLitres(stats.totalFuelUsedLiters)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">Total fuel cost</dt><dd className="font-medium text-slate-900">{formatZar(stats.totalFuelCostZar)}</dd></div>
          </dl>
        </div>
      </div>

      <DashboardCharts data={trends} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Shifts */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-slate-800">Recent Shifts</h2>
            <Link href="/admin/shifts" className="text-xs font-medium text-blue-800 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentShifts.map((shift: any) => (
              <div key={shift.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-900">{shift.forklift.displayId}</p>
                  <p className="text-xs text-slate-500 mt-1">{formatDateTime(shift.startTime)}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusBadgeClasses(shift.status)}`}>
                    {getStatusIcon(shift.status)} {formatStatus(shift.status)}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">by {shift.createdBy.displayName ?? shift.createdBy.username}</p>
                </div>
              </div>
            ))}
            {recentShifts.length === 0 && <p className="p-4 text-sm text-slate-500 text-center">No recent shifts.</p>}
          </div>
        </div>

        {/* Recent Fuel Logs */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-slate-800">Recent Fuel Logs</h2>
            <Link href="/admin/fuel-logs" className="text-xs font-medium text-blue-800 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {fuelSummary.recentLogs.map((log: any) => (
              <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-900">{log.forklift.displayId}</p>
                  <p className="text-xs text-slate-500 mt-1">{formatDateTime(log.refuelDateTime)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900">{formatLitres(log.fuelAmountLiters)}</p>
                  <p className="text-xs text-slate-500 mt-1">{log.fuelCostZar ? formatZar(log.fuelCostZar) : '—'}</p>
                </div>
              </div>
            ))}
            {fuelSummary.recentLogs.length === 0 && <p className="p-4 text-sm text-slate-500 text-center">No recent fuel logs.</p>}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-800">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 divide-x divide-slate-200 divide-y border-t border-slate-200 sm:grid-cols-3 md:grid-cols-6">
          <Link href="/admin/forklifts/new" className="flex flex-col items-center justify-center gap-2 p-6 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-800">Add Forklift</Link>
          <Link href="/admin/forklifts" className="flex flex-col items-center justify-center gap-2 p-6 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-800">Manage Forklifts</Link>
          <Link href="/admin/shifts" className="flex flex-col items-center justify-center gap-2 p-6 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-800">View Shifts</Link>
          <Link href="/admin/fuel-logs" className="flex flex-col items-center justify-center gap-2 p-6 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-800">View Fuel Logs</Link>
          <Link href="/admin/maintenance" className="flex flex-col items-center justify-center gap-2 p-6 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-800">Maintenance</Link>
          <Link href="/admin/report" className="flex flex-col items-center justify-center gap-2 p-6 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-800">Generate Report</Link>
        </div>
      </div>
    </div>
  );
}
