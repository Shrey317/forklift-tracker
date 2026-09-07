import 'dotenv/config';
import { PrismaClient, Role } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const adminUser = await prisma.user.findUnique({ where: { username: 'admin' } });
    const supervisorUser = await prisma.user.findUnique({ where: { username: 'supervisor' } });
    const fuelUser = await prisma.user.findUnique({ where: { username: 'fuel_supervisor' } });

    if (!adminUser || !supervisorUser || !fuelUser) {
      console.error('Seed users not found. Run pnpm db:seed first.');
      return;
    }

    console.log('Creating dummy forklifts...');
    
    // Create Forklifts
    const forkliftsData = [
      { displayId: 'FL-001', name: 'Alpha Hyster', manufacturer: 'Hyster', model: 'H50XT', trackingMode: 'MILEAGE', status: 'ACTIVE' },
      { displayId: 'FL-002', name: 'Beta Toyota', manufacturer: 'Toyota', model: 'Core IC', trackingMode: 'MILEAGE', status: 'ACTIVE' },
      { displayId: 'FL-003', name: 'Gamma Crown', manufacturer: 'Crown', model: 'C-5', trackingMode: 'MILEAGE', status: 'ACTIVE' },
      { displayId: 'FL-004', name: 'Delta CAT', manufacturer: 'CAT', model: 'DP25N', trackingMode: 'MILEAGE', status: 'MAINTENANCE' },
      { displayId: 'FL-005', name: 'Epsilon Komatsu', manufacturer: 'Komatsu', model: 'BX50', trackingMode: 'MILEAGE', status: 'OUT_OF_SERVICE' }
    ];

    const createdForklifts = [];
    for (const fl of forkliftsData) {
      const existing = await prisma.forklift.findUnique({ where: { displayId: fl.displayId } });
      if (existing) {
        createdForklifts.push(existing);
      } else {
        const created = await prisma.forklift.create({
          data: {
            ...fl,
            trackingMode: fl.trackingMode as any,
            status: fl.status as any,
            qrToken: `DUMMY-TOKEN-${fl.displayId}`,
            createdById: adminUser.id,
          }
        });
        createdForklifts.push(created);
      }
    }

    console.log('Creating dummy shifts...');
    
    // Create some past shifts for FL-001 and FL-002
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    const pastDate2 = new Date();
    pastDate2.setDate(pastDate2.getDate() - 2);

    await prisma.shift.create({
      data: {
        forkliftId: createdForklifts[0].id,
        createdById: supervisorUser.id,
        endedById: supervisorUser.id,
        endType: 'NORMAL',
        startTime: pastDate2,
        endTime: new Date(pastDate2.getTime() + 8 * 60 * 60 * 1000), // 8 hours
        status: 'COMPLETED',
        startingReading: 12000,
        endingReading: 12080,
        totalHoursWorked: 8.0,
        totalReadingDelta: 80,
        notes: 'Normal shift',
      }
    });

    await prisma.shift.create({
      data: {
        forkliftId: createdForklifts[1].id,
        createdById: adminUser.id,
        endedById: adminUser.id,
        endType: 'NORMAL',
        startTime: pastDate,
        endTime: new Date(pastDate.getTime() + 6 * 60 * 60 * 1000), // 6 hours
        status: 'COMPLETED',
        startingReading: 5000,
        endingReading: 5065,
        totalHoursWorked: 6.0,
        totalReadingDelta: 65,
      }
    });

    // Create one active shift for FL-003
    await prisma.shift.create({
      data: {
        forkliftId: createdForklifts[2].id,
        createdById: supervisorUser.id,
        startTime: new Date(new Date().getTime() - 2 * 60 * 60 * 1000), // Started 2 hours ago
        status: 'ACTIVE',
        startingReading: 8000,
      }
    });

    console.log('Creating dummy fuel logs...');
    
    // Create fuel logs
    await prisma.fuelLog.create({
      data: {
        forkliftId: createdForklifts[0].id,
        createdById: fuelUser.id,
        fuelAmountLiters: 40.5,
        fuelCostZar: 950.25,
        readingAtRefuel: 12080,
        refuelDateTime: new Date(),
      }
    });

    await prisma.fuelLog.create({
      data: {
        forkliftId: createdForklifts[1].id,
        createdById: adminUser.id,
        fuelAmountLiters: 25.0,
        fuelCostZar: 580.00,
        readingAtRefuel: 5065,
        refuelDateTime: pastDate,
      }
    });

    console.log('Creating dummy maintenance logs...');
    
    // Create maintenance logs
    await prisma.maintenanceLog.create({
      data: {
        forkliftId: createdForklifts[3].id, // Maintenance
        date: new Date(),
        description: 'Scheduled engine check',
        createdById: adminUser.id,
        status: 'SCHEDULED'
      }
    });

    await prisma.maintenanceLog.create({
      data: {
        forkliftId: createdForklifts[4].id, // Out of service
        date: pastDate2,
        description: 'Major hydraulic failure repair',
        costZar: 4500.00,
        createdById: adminUser.id,
        status: 'COMPLETED'
      }
    });

    console.log('Dummy data seeded successfully!');

  } catch (error) {
    console.error('Failed to seed dummy data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
