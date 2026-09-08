'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AdminLogoutButton } from '@/components/admin/logout-button';
import { formatStatus } from '@/lib/format';
import type { User } from '@/generated/prisma/client';

const ALL_NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', roles: ['ADMIN', 'SUPERVISOR', 'FUEL_SUPERVISOR'] },
  { href: '/admin/forklifts', label: 'Forklifts', roles: ['ADMIN', 'SUPERVISOR', 'FUEL_SUPERVISOR'] },
  { href: '/admin/shifts', label: 'Shifts', roles: ['ADMIN', 'SUPERVISOR'] },
  { href: '/admin/fuel-logs', label: 'Fuel Logs', roles: ['ADMIN', 'SUPERVISOR', 'FUEL_SUPERVISOR'] },
  { href: '/admin/maintenance', label: 'Maintenance', roles: ['ADMIN', 'SUPERVISOR'] },
  { href: '/admin/audit-log', label: 'Audit Log', roles: ['ADMIN'] },
  { href: '/admin/report', label: 'Reports', roles: ['ADMIN'] },
];

export function DashboardShell({ user, children }: { user: User; children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const navItems = ALL_NAV_ITEMS.filter(item => item.roles.includes(user.role));

  const SidebarContent = () => (
    <>
      <div className="flex h-14 items-center justify-between px-4 border-b border-slate-200 lg:border-none lg:h-auto lg:px-2 lg:mb-3 lg:justify-start">
        <p className="text-sm font-semibold text-slate-900">Forklift Tracker</p>
        <button 
          className="lg:hidden p-2 -mr-2 text-slate-500 hover:bg-slate-100 rounded-md"
          onClick={() => setMobileMenuOpen(false)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-4 lg:px-0 lg:py-0">
        <div className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'min-h-11 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800',
                  active ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-100',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav
        aria-label="Admin navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white border-r border-slate-200 transition-transform duration-200 ease-in-out lg:static lg:w-56 lg:translate-x-0 lg:p-4",
          mobileMenuOpen ? "translate-x-0 shadow-xl lg:shadow-none" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </nav>

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button 
              className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
              onClick={() => setMobileMenuOpen(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700 hidden sm:inline-block">{user.displayName ?? user.username}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{formatStatus(user.role)}</span>
            </div>
          </div>
          <AdminLogoutButton />
        </header>
        <main className="flex-1 bg-slate-50 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
