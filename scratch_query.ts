import { PrismaClient } from './src/generated/prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const forklift = await prisma.forklift.findFirst();
  
  if (!admin || !forklift) throw new Error('Missing admin or forklift');

  console.log('Testing createMaintenanceLog logic...');
  try {
    await prisma.maintenanceLog.create({
      data: {
        forkliftId: forklift.id,
        date: new Date("2026-09-10"), // Testing Date object
        description: "Test log",
        createdById: admin.id,
      } as any // cast to any to bypass strict TS if needed, or leave as is
    });
    console.log('Success!');
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

main().finally(() => prisma.$disconnect());
