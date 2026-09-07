import Link from 'next/link';
import type { User } from '@/generated/prisma/client';

export function FuelSupervisorDashboard({ data, user }: { data: any; user: User }) {
  const { stats } = data;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Good morning, {user.displayName ?? user.username}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Link 
          href="/scan" 
          className="flex flex-col items-center justify-center rounded-xl border-2 border-primary bg-blue-50/50 dark:bg-blue-950/20 p-8 text-primary shadow-sm hover:bg-blue-50 dark:hover:bg-blue-950/40 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all"
        >
          <span className="text-xl font-bold tracking-wide">RECORD FUEL</span>
          <span className="mt-2 text-sm text-blue-700/80">Scan forklift to record fuel</span>
        </Link>
        
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Fuel Statistics</h2>
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between"><dt className="text-slate-600">Fuel added today</dt><dd className="font-medium text-foreground">{stats.fuelAddedToday} L</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">Fuel added this week</dt><dd className="font-medium text-foreground">{stats.fuelAddedThisWeek} L</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">Fuel cost today</dt><dd className="font-medium text-foreground">R {stats.fuelCostToday}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">Fuel cost this week</dt><dd className="font-medium text-foreground">R {stats.fuelCostThisWeek}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">Refuels today</dt><dd className="font-medium text-foreground">{stats.refuelsToday}</dd></div>
          </dl>
        </div>
      </div>
    </div>
  );
}
