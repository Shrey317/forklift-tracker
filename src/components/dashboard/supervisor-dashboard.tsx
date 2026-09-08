import Link from 'next/link';
import type { User } from '@/generated/prisma/client';
import { formatDateTime } from '@/lib/format';

export function SupervisorDashboard({ data, user }: { data: any; user: User }) {
  const { stats, activeShift } = data;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Welcome, {user.displayName ?? user.username}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Link 
          href="/scan" 
          className="flex flex-col items-center justify-center rounded-xl border-2 border-blue-800 bg-blue-50/50 p-8 text-blue-800 shadow-sm hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-800/20 transition-all"
        >
          <span className="text-xl font-bold tracking-wide">SCAN / SEARCH FOR FORKLIFT</span>
          <span className="mt-2 text-sm text-blue-700/80">Start or end a shift</span>
        </Link>
        
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Overview</h2>
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between"><dt className="text-slate-600">In use</dt><dd className="font-medium text-slate-900">{stats.inUseForklifts}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">Available</dt><dd className="font-medium text-slate-900">{stats.availableForklifts}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">Total shifts today</dt><dd className="font-medium text-slate-900">{stats.totalShiftsToday}</dd></div>
          </dl>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-800">Current Active Shift</h2>
        </div>
        <div className="p-6">
          {activeShift ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-slate-900">{activeShift.forklift.name} ({activeShift.forklift.displayId})</p>
                <div className="mt-1 flex gap-4 text-sm text-slate-500">
                  <span>Started: {formatDateTime(activeShift.startTime)}</span>
                  <span>Reading: {activeShift.startingReading?.toString()}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <Link href={`/forklift/${activeShift.forklift.qrToken}`} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">VIEW SHIFT</Link>
                <Link href="/scan" className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">END SHIFT</Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6">
              <p className="text-slate-500 mb-4">No active shift</p>
              <Link href="/scan" className="rounded-md bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900">SCAN FORKLIFT</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
