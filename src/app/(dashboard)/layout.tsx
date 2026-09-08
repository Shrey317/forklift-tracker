import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { DashboardShell } from '@/components/admin/dashboard-shell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?redirectTo=/dashboard');

  return (
    <DashboardShell user={user}>
      {children}
    </DashboardShell>
  );
}

