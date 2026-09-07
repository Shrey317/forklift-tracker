import { AdminLogoutButton } from '@/components/admin/logout-button';
import { getCurrentUser } from '@/lib/auth';
import Link from 'next/link';

export default async function FieldLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-foreground">Forklift Tracker</span>
          {user && (user.role === 'ADMIN' || user.role === 'SUPERVISOR') && (
            <Link href="/admin/dashboard" className="text-sm font-medium text-primary hover:underline">
              Dashboard
            </Link>
          )}
        </div>
        <AdminLogoutButton />
      </header>
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
