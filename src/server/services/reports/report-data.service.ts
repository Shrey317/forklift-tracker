import { prisma } from '@/lib/prisma';
import Decimal from 'decimal.js';
import { johannesburgDateRangeToUtc } from '@/lib/date-range';
import { rankByUsage, type RankableForklift } from '../dashboard/ranking';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ReportDateRange {
  from: string; // ISO date string e.g. "2026-09-01"
  to: string;   // ISO date string e.g. "2026-09-08"
}

export interface ForkliftUsageRow {
  forkliftId: string;
  displayId: string;
  name: string;
  manufacturer: string;
  model: string;
  status: string;
  shiftCount: number;
  hoursWorked: string;     // Decimal as string
  readingDelta: string;    // Decimal as string
  fuelConsumed: string;    // Decimal as string
  fuelCost: string;        // Decimal as string
}

export interface ShiftReportRow {
  id: string;
  forkliftDisplayId: string;
  forkliftName: string;
  startTime: string;       // ISO datetime
  endTime: string | null;
  durationHours: string | null;
  startingReading: string;
  endingReading: string | null;
  readingDelta: string | null;
  status: string;
  endType: string | null;
  notes: string | null;
  createdByName: string;
}

export interface FuelReportRow {
  id: string;
  forkliftDisplayId: string;
  forkliftName: string;
  refuelDateTime: string;
  fuelAmountLiters: string;
  fuelCostZar: string | null;
  readingAtRefuel: string;
  shiftId: string | null;
  notes: string | null;
  createdByName: string;
}

export interface MaintenanceReportRow {
  id: string;
  forkliftDisplayId: string;
  forkliftName: string;
  date: string;
  description: string;
  costZar: string | null;
  status: string;
  createdByName: string;
}

export interface ExecutiveSummary {
  totalForklifts: number;
  activeForklifts: number;
  maintenanceForklifts: number;
  outOfServiceForklifts: number;
  totalShifts: number;
  completedShifts: number;
  totalHoursWorked: string;
  totalReadingDelta: string;
  totalFuelUsed: string;
  totalFuelCost: string;
}

export interface ReportData {
  dateRange: ReportDateRange;
  summary: ExecutiveSummary;
  forkliftUsage: ForkliftUsageRow[];
  mostUsed: ForkliftUsageRow[];
  leastUsed: ForkliftUsageRow[];
  shifts: ShiftReportRow[];
  fuelLogs: FuelReportRow[];
  maintenanceLogs: MaintenanceReportRow[];
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * Single source of truth for all report data. Used by:
 * - /admin/report page
 * - PDF export
 * - Excel export
 * - Dashboard (via summary subset)
 *
 * All date filtering uses the centralized johannesburgDateRangeToUtc
 * for consistent timezone-aware boundaries. All decimal arithmetic uses
 * decimal.js — never raw JavaScript floats.
 */
export async function getReportData(dateRange: ReportDateRange): Promise<ReportData> {
  const utcRange = johannesburgDateRangeToUtc(dateRange.from, dateRange.to);
  const shiftDateFilter = {
    ...(utcRange.gte ? { startTime: { gte: utcRange.gte } } : {}),
    ...(utcRange.lt ? { startTime: { ...(utcRange.gte ? { gte: utcRange.gte } : {}), lt: utcRange.lt } } : {}),
  };
  // For shifts, we filter by startTime falling in range
  const shiftWhere = {
    isDeleted: false,
    ...shiftDateFilter,
  };
  // For fuel logs, filter by refuelDateTime
  const fuelDateFilter = {
    ...(utcRange.gte ? { refuelDateTime: { gte: utcRange.gte } } : {}),
    ...(utcRange.lt ? { refuelDateTime: { ...(utcRange.gte ? { gte: utcRange.gte } : {}), lt: utcRange.lt } } : {}),
  };
  const fuelWhere = {
    isDeleted: false,
    ...fuelDateFilter,
  };
  // For maintenance, filter by date
  const maintenanceDateFilter = {
    ...(utcRange.gte ? { date: { gte: utcRange.gte } } : {}),
    ...(utcRange.lt ? { date: { ...(utcRange.gte ? { gte: utcRange.gte } : {}), lt: utcRange.lt } } : {}),
  };
  const maintenanceWhere = {
    isDeleted: false,
    ...maintenanceDateFilter,
  };

  // Execute all queries in parallel for performance
  const [
    allForklifts,
    shifts,
    fuelLogs,
    maintenanceLogs,
    shiftAgg,
    fuelAgg,
  ] = await Promise.all([
    // Current fleet status (snapshot, not date-filtered)
    prisma.forklift.findMany({
      where: { isActive: true },
      select: {
        id: true,
        displayId: true,
        name: true,
        manufacturer: true,
        model: true,
        status: true,
      },
      orderBy: { displayId: 'asc' },
    }),

    // Shifts within date range
    prisma.shift.findMany({
      where: shiftWhere,
      select: {
        id: true,
        forkliftId: true,
        forklift: { select: { displayId: true, name: true } },
        startTime: true,
        endTime: true,
        status: true,
        endType: true,
        startingReading: true,
        endingReading: true,
        totalHoursWorked: true,
        totalReadingDelta: true,
        notes: true,
        createdBy: { select: { displayName: true, username: true } },
      },
      orderBy: { startTime: 'desc' },
    }),

    // Fuel logs within date range
    prisma.fuelLog.findMany({
      where: fuelWhere,
      select: {
        id: true,
        forkliftId: true,
        forklift: { select: { displayId: true, name: true } },
        refuelDateTime: true,
        fuelAmountLiters: true,
        fuelCostZar: true,
        readingAtRefuel: true,
        shiftId: true,
        notes: true,
        createdBy: { select: { displayName: true, username: true } },
      },
      orderBy: { refuelDateTime: 'desc' },
    }),

    // Maintenance logs within date range
    prisma.maintenanceLog.findMany({
      where: maintenanceWhere,
      select: {
        id: true,
        forkliftId: true,
        forklift: { select: { displayId: true, name: true } },
        date: true,
        description: true,
        costZar: true,
        status: true,
        createdBy: { select: { displayName: true, username: true } },
      },
      orderBy: { date: 'desc' },
    }),

    // Aggregate shift stats for the period
    prisma.shift.aggregate({
      where: { ...shiftWhere, status: 'COMPLETED' },
      _sum: { totalHoursWorked: true, totalReadingDelta: true },
      _count: { id: true },
    }),

    // Aggregate fuel stats for the period
    prisma.fuelLog.aggregate({
      where: fuelWhere,
      _sum: { fuelAmountLiters: true, fuelCostZar: true },
    }),
  ]);

  // ── Executive Summary ──
  const summary: ExecutiveSummary = {
    totalForklifts: allForklifts.length,
    activeForklifts: allForklifts.filter((f) => f.status === 'ACTIVE').length,
    maintenanceForklifts: allForklifts.filter((f) => f.status === 'MAINTENANCE').length,
    outOfServiceForklifts: allForklifts.filter((f) => f.status === 'OUT_OF_SERVICE').length,
    totalShifts: shifts.length,
    completedShifts: shiftAgg._count.id,
    totalHoursWorked: (shiftAgg._sum.totalHoursWorked ?? new Decimal(0)).toString(),
    totalReadingDelta: (shiftAgg._sum.totalReadingDelta ?? new Decimal(0)).toString(),
    totalFuelUsed: (fuelAgg._sum.fuelAmountLiters ?? new Decimal(0)).toString(),
    totalFuelCost: (fuelAgg._sum.fuelCostZar ?? new Decimal(0)).toString(),
  };

  // ── Per-forklift usage breakdown ──
  // Build maps for shift and fuel data per forklift
  const shiftsByForklift = new Map<string, typeof shifts>();
  for (const s of shifts) {
    const arr = shiftsByForklift.get(s.forkliftId) ?? [];
    arr.push(s);
    shiftsByForklift.set(s.forkliftId, arr);
  }

  const fuelByForklift = new Map<string, typeof fuelLogs>();
  for (const f of fuelLogs) {
    const arr = fuelByForklift.get(f.forkliftId) ?? [];
    arr.push(f);
    fuelByForklift.set(f.forkliftId, arr);
  }

  const forkliftUsage: ForkliftUsageRow[] = allForklifts.map((fl) => {
    const flShifts = shiftsByForklift.get(fl.id) ?? [];
    const flFuel = fuelByForklift.get(fl.id) ?? [];

    const completedShifts = flShifts.filter((s) => s.status === 'COMPLETED');
    const hoursWorked = completedShifts.reduce(
      (acc, s) => acc.plus(s.totalHoursWorked ?? 0),
      new Decimal(0),
    );
    const readingDelta = completedShifts.reduce(
      (acc, s) => acc.plus(s.totalReadingDelta ?? 0),
      new Decimal(0),
    );
    const fuelConsumed = flFuel.reduce(
      (acc, f) => acc.plus(f.fuelAmountLiters),
      new Decimal(0),
    );
    const fuelCost = flFuel.reduce(
      (acc, f) => acc.plus(f.fuelCostZar ?? 0),
      new Decimal(0),
    );

    return {
      forkliftId: fl.id,
      displayId: fl.displayId,
      name: fl.name,
      manufacturer: fl.manufacturer,
      model: fl.model,
      status: fl.status,
      shiftCount: flShifts.length,
      hoursWorked: hoursWorked.toFixed(2),
      readingDelta: readingDelta.toFixed(1),
      fuelConsumed: fuelConsumed.toFixed(2),
      fuelCost: fuelCost.toFixed(2),
    };
  });

  // ── Rankings using existing ranking utility ──
  const rankableForklifts: RankableForklift[] = forkliftUsage
    .filter((fl) => new Decimal(fl.readingDelta).greaterThan(0))
    .map((fl) => ({
      displayId: fl.displayId,
      name: fl.name,
      totalReadingDelta: new Decimal(fl.readingDelta),
    }));

  const rankings = rankByUsage(rankableForklifts);
  // Sort for most/least-used lists (top 5 each)
  const sortedByUsageDesc = [...forkliftUsage]
    .filter((fl) => fl.shiftCount > 0)
    .sort((a, b) => new Decimal(b.readingDelta).comparedTo(new Decimal(a.readingDelta)));
  const mostUsed = sortedByUsageDesc.slice(0, 5);
  const leastUsed = [...sortedByUsageDesc].reverse().slice(0, 5);

  // ── Transform shifts to report rows ──
  const shiftRows: ShiftReportRow[] = shifts.map((s) => ({
    id: s.id,
    forkliftDisplayId: s.forklift.displayId,
    forkliftName: s.forklift.name,
    startTime: s.startTime.toISOString(),
    endTime: s.endTime?.toISOString() ?? null,
    durationHours: s.totalHoursWorked?.toString() ?? null,
    startingReading: s.startingReading.toString(),
    endingReading: s.endingReading?.toString() ?? null,
    readingDelta: s.totalReadingDelta?.toString() ?? null,
    status: s.status,
    endType: s.endType,
    notes: s.notes,
    createdByName: s.createdBy.displayName ?? s.createdBy.username,
  }));

  // ── Transform fuel logs to report rows ──
  const fuelRows: FuelReportRow[] = fuelLogs.map((f) => ({
    id: f.id,
    forkliftDisplayId: f.forklift.displayId,
    forkliftName: f.forklift.name,
    refuelDateTime: f.refuelDateTime.toISOString(),
    fuelAmountLiters: f.fuelAmountLiters.toString(),
    fuelCostZar: f.fuelCostZar?.toString() ?? null,
    readingAtRefuel: f.readingAtRefuel.toString(),
    shiftId: f.shiftId,
    notes: f.notes,
    createdByName: f.createdBy.displayName ?? f.createdBy.username,
  }));

  // ── Transform maintenance logs to report rows ──
  const maintenanceRows: MaintenanceReportRow[] = maintenanceLogs.map((m) => ({
    id: m.id,
    forkliftDisplayId: m.forklift.displayId,
    forkliftName: m.forklift.name,
    date: m.date.toISOString(),
    description: m.description,
    costZar: m.costZar?.toString() ?? null,
    status: m.status,
    createdByName: m.createdBy.displayName ?? m.createdBy.username,
  }));

  return {
    dateRange,
    summary,
    forkliftUsage,
    mostUsed,
    leastUsed,
    shifts: shiftRows,
    fuelLogs: fuelRows,
    maintenanceLogs: maintenanceRows,
  };
}
