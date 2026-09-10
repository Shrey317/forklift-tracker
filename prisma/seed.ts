import 'dotenv/config';
import { PrismaClient, Role } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from '../src/server/services/auth/password.js';
import pg from 'pg';
import crypto from 'crypto';
import Decimal from 'decimal.js';

const { Pool } = pg;
const MIN_PASSWORD_LENGTH = 16;

const ACCOUNTS: { username: string; role: Role; displayName: string; envVar: string }[] = [
  { username: 'admin', role: Role.ADMIN, displayName: 'Master Administrator', envVar: 'ADMIN_PASSWORD' },
  { username: 'supervisor', role: Role.SUPERVISOR, displayName: 'Supervisor', envVar: 'SUPERVISOR_PASSWORD' },
  {
    username: 'fuel_supervisor',
    role: Role.FUEL_SUPERVISOR,
    displayName: 'Fuel Supervisor',
    envVar: 'FUEL_SUPERVISOR_PASSWORD',
  },
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    for (const account of ACCOUNTS) {
      const password = process.env[account.envVar];

      if (!password) {
        throw new Error(`Missing required environment variable: ${account.envVar}`);
      }
      if (password.length < MIN_PASSWORD_LENGTH) {
        throw new Error(`${account.envVar} does not meet the minimum length of ${MIN_PASSWORD_LENGTH} characters.`);
      }

      const existing = await prisma.user.findUnique({ where: { username: account.username } });
      if (existing) {
        console.log(`[seed] ${account.username} already exists — skipping (not overwritten).`);
        continue;
      }

      const passwordHash = await hashPassword(password);
      await prisma.user.create({
        data: {
          username: account.username,
          displayName: account.displayName,
          passwordHash,
          role: account.role,
        },
      });
      console.log(`[seed] Created ${account.username} (${account.role}).`);
    }

    // Add dummy data for sections
    console.log('[seed] Seeding dummy data for Forklifts, Shifts, Fuel Logs, and Maintenance...');
    
    const adminUser = await prisma.user.findUnique({ where: { username: 'admin' } });
    const supervisorUser = await prisma.user.findUnique({ where: { username: 'supervisor' } });
    const fuelUser = await prisma.user.findUnique({ where: { username: 'fuel_supervisor' } });

    if (!adminUser || !supervisorUser || !fuelUser) {
      throw new Error('Could not find created users to assign dummy data.');
    }

    const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();

    // 1. Create Forklifts
    const forkliftsData = [
      { displayId: `FL-001-${randomSuffix}`, name: 'Alpha Heavy', manufacturer: 'Toyota', model: '8FDU30', status: 'ACTIVE' },
      { displayId: `FL-002-${randomSuffix}`, name: 'Beta Mover', manufacturer: 'Caterpillar', model: 'DP25N', status: 'ACTIVE' },
      { displayId: `FL-003-${randomSuffix}`, name: 'Gamma Lift', manufacturer: 'Hyster', model: 'H50XT', status: 'MAINTENANCE' },
      { displayId: `FL-004-${randomSuffix}`, name: 'Delta Reach', manufacturer: 'Toyota', model: '8FGCU25', status: 'ACTIVE' },
      { displayId: `FL-005-${randomSuffix}`, name: 'Epsilon Strider', manufacturer: 'Nissan', model: 'Platinum II', status: 'OUT_OF_SERVICE' },
    ];

      const createdForklifts = [];
      for (const fl of forkliftsData) {
        const forklift = await prisma.forklift.create({
          data: {
            displayId: fl.displayId,
            name: fl.name,
            manufacturer: fl.manufacturer,
            model: fl.model,
            qrToken: crypto.randomBytes(32).toString('hex'),
            trackingMode: 'MILEAGE',
            status: fl.status as any,
            isActive: true,
            createdById: adminUser.id,
          }
        });
        createdForklifts.push(forklift);
      }
      
      const now = new Date();

      // 2. Create Shifts
      for (let i = 0; i < 15; i++) {
        const fl = createdForklifts[i % createdForklifts.length];
        if (!fl) continue;
        const isCompleted = i < 12; // Last 3 are active
        
        const startTime = new Date(now);
        startTime.setDate(now.getDate() - (i % 7)); // Spread over last 7 days
        startTime.setHours(8 + (i % 4), 0, 0, 0);
        
        const endTime = new Date(startTime);
        endTime.setHours(startTime.getHours() + 8); // 8 hour shifts

        const startingReading = new Decimal(1000 + i * 50);
        const endingReading = isCompleted ? startingReading.plus(40) : null;
        
        await prisma.shift.create({
          data: {
            forkliftId: fl.id,
            createdById: supervisorUser.id,
            endedById: isCompleted ? supervisorUser.id : null,
            status: isCompleted ? 'COMPLETED' : 'ACTIVE',
            startTime,
            endTime: isCompleted ? endTime : null,
            startingReading,
            endingReading,
            totalHoursWorked: isCompleted ? new Decimal(8) : null,
            totalReadingDelta: isCompleted ? new Decimal(40) : null,
            notes: isCompleted ? 'Routine operations.' : 'Shift currently active.',
            endType: isCompleted ? 'NORMAL' : null
          }
        });
      }

      // 3. Create Fuel Logs
      for (let i = 0; i < 10; i++) {
        const fl = createdForklifts[i % createdForklifts.length];
        if (!fl) continue;
        const refuelTime = new Date(now);
        refuelTime.setDate(now.getDate() - (i % 5));
        
        await prisma.fuelLog.create({
          data: {
            forkliftId: fl.id,
            createdById: fuelUser.id,
            fuelAmountLiters: new Decimal(20 + i),
            fuelCostZar: new Decimal(450 + i * 15),
            readingAtRefuel: new Decimal(1020 + i * 30),
            refuelDateTime: refuelTime,
            notes: 'Regular top-up.'
          }
        });
      }

      // 4. Create Maintenance Logs
      for (let i = 0; i < 5; i++) {
        const fl = createdForklifts[i % createdForklifts.length];
        if (!fl) continue;
        const logDate = new Date(now);
        logDate.setDate(now.getDate() - i * 3);
        const isCompleted = i % 2 === 0;

        await prisma.maintenanceLog.create({
          data: {
            forkliftId: fl.id,
            createdById: adminUser.id,
            date: logDate,
            description: `Scheduled maintenance check point ${i + 1}`,
            costZar: isCompleted ? new Decimal(1200 + i * 100) : null,
            status: isCompleted ? 'COMPLETED' : 'SCHEDULED'
          }
        });
      }

      // 5. Create Audit Logs
      for (let i = 0; i < 15; i++) {
        const fl = createdForklifts[i % createdForklifts.length];
        if (!fl) continue;
        const logDate = new Date(now);
        logDate.setDate(now.getDate() - (15 - i));
        
        await prisma.auditLogEntry.create({
          data: {
            actorUserId: adminUser.id,
            actorRole: 'ADMIN',
            action: 'FORKLIFT_CREATED',
            targetType: 'FORKLIFT',
            targetId: fl.id,
            afterValue: { displayId: fl.displayId, name: fl.name, status: fl.status },
            reason: 'Initial setup of forklift in system',
            createdAt: logDate
          }
        });
      }

      console.log('[seed] Dummy data generation complete.');

  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('[seed] Failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
