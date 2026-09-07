import { prisma } from '@/lib/prisma';
import Decimal from 'decimal.js';
import { getDashboardStats as getLegacyAdminStats } from './stats';
import type { User } from '@/generated/prisma/client';

export async function getDashboardData(user: User) {
  if (user.role === 'ADMIN') {
    return getAdminDashboardData();
  } else if (user.role === 'SUPERVISOR') {
    return getSupervisorDashboardData(user.id);
  } else if (user.role === 'FUEL_SUPERVISOR') {
    return getFuelSupervisorDashboardData();
  }
  throw new Error('Invalid role');
}

async function getAdminDashboardData() {
  const legacyStats = await getLegacyAdminStats();
  
  // Additional stats required by new spec
  const [inUseForklifts, outOfServiceForklifts, totalShiftsCompleted, fuelCostAgg] = await Promise.all([
    prisma.shift.count({ where: { status: 'ACTIVE', isDeleted: false } }),
    prisma.forklift.count({ where: { status: 'OUT_OF_SERVICE', isActive: true } }),
    prisma.shift.count({ where: { status: 'COMPLETED', isDeleted: false } }),
    prisma.fuelLog.aggregate({ where: { isDeleted: false }, _sum: { fuelCostZar: true } })
  ]);

  const recentShifts = await prisma.shift.findMany({
    where: { isDeleted: false },
    orderBy: { startTime: 'desc' },
    take: 5,
    include: { forklift: { select: { displayId: true, name: true } }, createdBy: { select: { displayName: true, username: true } } }
  });

  const recentFuel = await prisma.fuelLog.findMany({
    where: { isDeleted: false },
    orderBy: { refuelDateTime: 'desc' },
    take: 5,
    include: { forklift: { select: { displayId: true, name: true } }, createdBy: { select: { displayName: true, username: true } } }
  });

  const [underMaintenance, scheduledMaintenance, recentCompletedMaintenance] = await Promise.all([
    prisma.forklift.findMany({ where: { status: 'MAINTENANCE', isActive: true }, select: { displayId: true, name: true } }),
    prisma.maintenanceLog.findMany({ where: { status: 'SCHEDULED', isDeleted: false }, take: 5, orderBy: { date: 'asc' }, include: { forklift: true } }),
    prisma.maintenanceLog.findMany({ where: { status: 'COMPLETED', isDeleted: false }, take: 5, orderBy: { date: 'desc' }, include: { forklift: true } })
  ]);

  return {
    role: 'ADMIN',
    stats: {
      ...legacyStats,
      inUseForklifts,
      outOfServiceForklifts,
      totalShiftsCompleted,
      totalFuelCostZar: (fuelCostAgg._sum.fuelCostZar ?? new Decimal(0)).toString(),
    },
    recentShifts,
    fuelSummary: {
      recentLogs: recentFuel
    },
    maintenanceSummary: {
      underMaintenance,
      scheduled: scheduledMaintenance,
      recentlyCompleted: recentCompletedMaintenance
    }
  };
}

async function getSupervisorDashboardData(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [inUseForklifts, totalForklifts, totalShiftsToday, activeShift, recentShifts] = await Promise.all([
    prisma.shift.count({ where: { status: 'ACTIVE', isDeleted: false } }),
    prisma.forklift.count({ where: { isActive: true, status: 'ACTIVE' } }),
    prisma.shift.count({ where: { isDeleted: false, startTime: { gte: today } } }),
    prisma.shift.findFirst({
      where: { status: 'ACTIVE', isDeleted: false, createdById: userId },
      include: { forklift: { select: { displayId: true, name: true } } }
    }),
    prisma.shift.findMany({
      where: { isDeleted: false, createdById: userId },
      orderBy: { startTime: 'desc' },
      take: 5,
      include: { forklift: { select: { displayId: true, name: true } } }
    })
  ]);

  return {
    role: 'SUPERVISOR',
    stats: {
      inUseForklifts,
      availableForklifts: totalForklifts - inUseForklifts, // approximation of available
      totalShiftsToday
    },
    activeShift,
    recentShifts
  };
}

async function getFuelSupervisorDashboardData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thisWeek = new Date(today);
  thisWeek.setDate(today.getDate() - today.getDay()); // Start of week

  const [todayAgg, weekAgg, refuelsToday, recentFuel] = await Promise.all([
    prisma.fuelLog.aggregate({
      where: { isDeleted: false, refuelDateTime: { gte: today } },
      _sum: { fuelAmountLiters: true, fuelCostZar: true }
    }),
    prisma.fuelLog.aggregate({
      where: { isDeleted: false, refuelDateTime: { gte: thisWeek } },
      _sum: { fuelAmountLiters: true, fuelCostZar: true }
    }),
    prisma.fuelLog.count({
      where: { isDeleted: false, refuelDateTime: { gte: today } }
    }),
    prisma.fuelLog.findMany({
      where: { isDeleted: false },
      orderBy: { refuelDateTime: 'desc' },
      take: 10,
      include: { forklift: { select: { displayId: true, name: true } } }
    })
  ]);

  return {
    role: 'FUEL_SUPERVISOR',
    stats: {
      fuelAddedToday: (todayAgg._sum.fuelAmountLiters ?? new Decimal(0)).toString(),
      fuelAddedThisWeek: (weekAgg._sum.fuelAmountLiters ?? new Decimal(0)).toString(),
      fuelCostToday: (todayAgg._sum.fuelCostZar ?? new Decimal(0)).toString(),
      fuelCostThisWeek: (weekAgg._sum.fuelCostZar ?? new Decimal(0)).toString(),
      refuelsToday
    },
    recentFuel
  };
}
