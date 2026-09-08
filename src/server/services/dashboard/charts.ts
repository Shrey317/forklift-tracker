import { prisma } from '@/lib/prisma';
import Decimal from 'decimal.js';

/**
 * Returns the last 7 days of daily trends (utilization and fuel) for the dashboard charts.
 * Using Africa/Johannesburg timezone to group by day.
 */
export async function getDashboardChartsData() {
  // Get last 7 days boundary
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Africa/Johannesburg' });
  
  // Date array for the last 7 days (including today)
  const days: string[] = [];
  const startOfRange = new Date(todayStr + 'T00:00:00');
  startOfRange.setDate(startOfRange.getDate() - 6);

  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfRange);
    d.setDate(d.getDate() + i);
    days.push(d.toISOString().slice(0, 10)); // YYYY-MM-DD
  }

  const [shifts, fuelLogs] = await Promise.all([
    prisma.shift.findMany({
      where: {
        isDeleted: false,
        status: 'COMPLETED',
        startTime: { gte: startOfRange }
      },
      select: { startTime: true, totalHoursWorked: true }
    }),
    prisma.fuelLog.findMany({
      where: {
        isDeleted: false,
        refuelDateTime: { gte: startOfRange }
      },
      select: { refuelDateTime: true, fuelCostZar: true, fuelAmountLiters: true }
    })
  ]);

  // Aggregate by day
  const dailyData = days.map(date => {
    return {
      date, // e.g. "2026-09-02"
      shifts: 0,
      hoursWorked: 0,
      fuelLiters: 0,
      fuelCostZar: 0
    };
  });

  const getDayIndex = (d: Date) => {
    const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'Africa/Johannesburg' });
    return days.indexOf(dateStr);
  };

  shifts.forEach(shift => {
    const idx = getDayIndex(shift.startTime);
    if (idx !== -1) {
      const item = dailyData[idx];
      if (item) {
        item.shifts += 1;
        if (shift.totalHoursWorked) {
          item.hoursWorked += shift.totalHoursWorked.toNumber();
        }
      }
    }
  });

  fuelLogs.forEach(log => {
    const idx = getDayIndex(log.refuelDateTime);
    if (idx !== -1) {
      const item = dailyData[idx];
      if (item) {
        if (log.fuelAmountLiters) {
          item.fuelLiters += log.fuelAmountLiters.toNumber();
        }
        if (log.fuelCostZar) {
          item.fuelCostZar += log.fuelCostZar.toNumber();
        }
      }
    }
  });

  // Format date labels nicely for the X-axis (e.g. "Mon 04")
  return dailyData.map(d => {
    const dateObj = new Date(d.date + 'T00:00:00');
    return {
      ...d,
      displayDate: dateObj.toLocaleDateString('en-ZA', { weekday: 'short', day: '2-digit' }),
      hoursWorked: Number(d.hoursWorked.toFixed(2)),
      fuelCostZar: Number(d.fuelCostZar.toFixed(2)),
      fuelLiters: Number(d.fuelLiters.toFixed(2))
    };
  });
}
