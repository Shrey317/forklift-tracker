import { getCurrentUser } from '@/lib/auth';
import { getDashboardData } from '@/server/services/dashboard/dashboard.service';
import { AdminDashboard } from '@/components/dashboard/admin-dashboard';
import { SupervisorDashboard } from '@/components/dashboard/supervisor-dashboard';
import { FuelSupervisorDashboard } from '@/components/dashboard/fuel-supervisor-dashboard';
import { redirect } from 'next/navigation';

export default async function UnifiedDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const data = await getDashboardData(user);

  if (user.role === 'ADMIN') {
    return <AdminDashboard data={data} user={user} />;
  }
  
  if (user.role === 'SUPERVISOR') {
    return <SupervisorDashboard data={data} user={user} />;
  }
  
  if (user.role === 'FUEL_SUPERVISOR') {
    return <FuelSupervisorDashboard data={data} user={user} />;
  }

  return <div>Unknown role</div>;
}
