import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { DashboardShell } from '@/components/admin/dashboard-shell';
import { AdminProvider } from '@/components/admin/admin-provider';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?redirectTo=/dashboard');

  const { passwordHash, ...safeUser } = user;

  return (
    <AdminProvider user={safeUser}>
      <DashboardShell user={user}>
        {children}
      </DashboardShell>
    </AdminProvider>
  );
}
