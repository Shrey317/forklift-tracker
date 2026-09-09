import 'dotenv/config';
import { prisma } from './src/lib/prisma';
import { getDashboardData } from './src/server/services/dashboard/dashboard.service';

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    console.log('No admin found');
    return;
  }
  try {
    const data = await getDashboardData(admin);
    console.log('Success, data length:', JSON.stringify(data).length);
  } catch (err: any) {
    console.error('Error in getDashboardData:', err);
    console.error(err.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();
