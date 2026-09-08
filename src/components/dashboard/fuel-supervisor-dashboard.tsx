import Link from 'next/link';
import type { User } from '@/generated/prisma/client';
import { formatZar } from '@/lib/format';

export function FuelSupervisorDashboard({ data, user }: { data: any; user: User }) {
  const { stats } = data;

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
          <span className="text-xl font-bold tracking-wide">RECORD FUEL</span>
          <span className="mt-2 text-sm text-blue-700/80">Scan forklift to record fuel</span>
        </Link>
        
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Fuel Statistics</h2>
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between"><dt className="text-slate-600">Fuel added today</dt><dd className="font-medium text-slate-900">{stats.fuelAddedToday} L</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">Fuel added this week</dt><dd className="font-medium text-slate-900">{stats.fuelAddedThisWeek} L</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">Fuel cost today</dt><dd className="font-medium text-slate-900">{formatZar(stats.fuelCostToday)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">Fuel cost this week</dt><dd className="font-medium text-slate-900">{formatZar(stats.fuelCostThisWeek)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">Refuels today</dt><dd className="font-medium text-slate-900">{stats.refuelsToday}</dd></div>
          </dl>
        </div>
      </div>
    </div>
  );
}
