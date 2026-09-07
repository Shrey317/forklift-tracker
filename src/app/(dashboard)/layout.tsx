import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { AdminSidebar } from '@/components/admin/sidebar';
import { AdminLogoutButton } from '@/components/admin/logout-button';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?redirectTo=/dashboard');

  return (
    <div className="flex min-h-screen">
      <AdminSidebar role={user.role} />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
          <span className="text-sm text-slate-500">Signed in as {user.displayName ?? user.username}</span>
          <AdminLogoutButton />
        </header>
        <main className="flex-1 bg-background p-6">{children}</main>
      </div>
    </div>
  );
}
