'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { Role } from '@/generated/prisma/client';

const ALL_NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', roles: ['ADMIN', 'SUPERVISOR', 'FUEL_SUPERVISOR'] },
  { href: '/admin/forklifts', label: 'Forklifts', roles: ['ADMIN', 'SUPERVISOR', 'FUEL_SUPERVISOR'] },
  { href: '/admin/shifts', label: 'Shifts', roles: ['ADMIN', 'SUPERVISOR'] },
  { href: '/admin/fuel-logs', label: 'Fuel Logs', roles: ['ADMIN', 'SUPERVISOR', 'FUEL_SUPERVISOR'] },
  { href: '/admin/maintenance', label: 'Maintenance', roles: ['ADMIN', 'SUPERVISOR'] },
  { href: '/admin/audit-log', label: 'Audit Log', roles: ['ADMIN'] },
  { href: '/admin/report', label: 'Reports', roles: ['ADMIN'] },
];

export function AdminSidebar({ role }: { role: string }) {
  const pathname = usePathname();

  const navItems = ALL_NAV_ITEMS.filter(item => item.roles.includes(role));

  return (
    <nav
      aria-label="Admin navigation"
      className="flex w-56 flex-col gap-1 border-r border-slate-200 bg-white p-4"
    >
      <p className="mb-3 px-2 text-sm font-semibold text-slate-900">Forklift Tracker</p>
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'min-h-11 rounded-md px-3 py-2 text-sm font-medium',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              active ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-100',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

