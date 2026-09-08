'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import {
  formatZar,
  formatHours,
  formatKm,
  formatLitres,
  formatDateTime,
  formatDate,
  formatStatus,
  getStatusBadgeClasses,
  getStatusIcon,
} from '@/lib/format';
import type {
  ReportData,
  ForkliftUsageRow,
  ShiftReportRow,
  FuelReportRow,
  MaintenanceReportRow,
} from '@/server/services/reports/report-data.service';

// ── Date range presets ────────────────────────────────────────────────────────

type PresetKey = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'custom';

function getPresetRange(key: PresetKey): { from: string; to: string } | null {
  const now = new Date();
  // Use Johannesburg timezone for "today"
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Africa/Johannesburg' });
  const today = new Date(todayStr + 'T00:00:00');

  switch (key) {
    case 'today':
      return { from: todayStr, to: todayStr };
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const ys = yesterday.toISOString().slice(0, 10);
      return { from: ys, to: ys };
    }
    case 'thisWeek': {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
      return { from: startOfWeek.toISOString().slice(0, 10), to: todayStr };
    }
    case 'lastWeek': {
      const startOfThisWeek = new Date(today);
      startOfThisWeek.setDate(today.getDate() - today.getDay() + 1);
      const startOfLastWeek = new Date(startOfThisWeek);
      startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
      const endOfLastWeek = new Date(startOfThisWeek);
      endOfLastWeek.setDate(endOfLastWeek.getDate() - 1);
      return {
        from: startOfLastWeek.toISOString().slice(0, 10),
        to: endOfLastWeek.toISOString().slice(0, 10),
      };
    }
    case 'thisMonth': {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: startOfMonth.toISOString().slice(0, 10), to: todayStr };
    }
    case 'lastMonth': {
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        from: startOfLastMonth.toISOString().slice(0, 10),
        to: endOfLastMonth.toISOString().slice(0, 10),
      };
    }
    default:
      return null;
  }
}

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'thisWeek', label: 'This Week' },
  { key: 'lastWeek', label: 'Last Week' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'custom', label: 'Custom' },
];

// ── Page Component ────────────────────────────────────────────────────────────

export default function ReportPage() {
  const { toast } = useToast();
  const [preset, setPreset] = useState<PresetKey>('thisMonth');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  const getDateRange = useCallback(() => {
    if (preset === 'custom') {
      if (!customFrom || !customTo) return null;
      return { from: customFrom, to: customTo };
    }
    return getPresetRange(preset);
  }, [preset, customFrom, customTo]);

  async function fetchReport() {
    const range = getDateRange();
    if (!range) {
      toast('Please select a valid date range.', 'error');
      return;
    }
    if (range.from > range.to) {
      toast('Start date must not be after end date.', 'error');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams(range);
      const res = await fetch(`/api/reports?${params}`);
      const body = await res.json();
      if (!res.ok) {
        toast(body.error?.message ?? 'Failed to generate report.', 'error');
        return;
      }
      setData(body.data);
    } catch {
      toast('Unable to generate report. Check your connection and try again.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function exportExcel() {
    const range = getDateRange();
    if (!range || !data) return;

    setExportingExcel(true);
    try {
      const params = new URLSearchParams(range);
      const res = await fetch(`/api/reports/excel?${params}`);
      if (!res.ok) {
        toast('Failed to generate Excel export.', 'error');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `forklift-report-${range.from}-to-${range.to}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('Excel report downloaded.', 'success');
    } catch {
      toast('Unable to download Excel report.', 'error');
    } finally {
      setExportingExcel(false);
    }
  }

  const [exportingPdf, setExportingPdf] = useState(false);

  async function exportPdf() {
    const range = getDateRange();
    if (!range || !data) return;

    setExportingPdf(true);
    try {
      const params = new URLSearchParams(range);
      const res = await fetch(`/api/reports/pdf?${params}`);
      if (!res.ok) {
        toast('Failed to generate PDF export.', 'error');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `forklift-report-${range.from}-to-${range.to}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('PDF report downloaded.', 'success');
    } catch {
      toast('Unable to download PDF report.', 'error');
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
        <p className="mt-1 text-sm text-slate-500">Generate operational reports for the forklift fleet.</p>
      </div>

      {/* Date Range Controls */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Date Range</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPreset(p.key)}
              className={`min-h-9 rounded-md px-3 py-1.5 text-sm font-medium transition-colors
                ${preset === p.key
                  ? 'bg-blue-800 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="report-from" className="text-sm font-medium text-slate-700">From</label>
              <input
                id="report-from"
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="min-h-11 rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="report-to" className="text-sm font-medium text-slate-700">To</label>
              <input
                id="report-to"
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="min-h-11 rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button onClick={fetchReport} loading={loading}>
            Generate Report
          </Button>
          {data && (
            <>
              <Button variant="secondary" onClick={exportExcel} loading={exportingExcel}>
                Export Excel
              </Button>
              <Button variant="secondary" onClick={exportPdf} loading={exportingPdf}>
                Export PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {/* Report Content */}
      {data && !loading && (
        <>
          {/* Executive Summary */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Executive Summary</h2>
            <p className="mb-4 text-sm text-slate-500">
              {formatDate(data.dateRange.from)} — {formatDate(data.dateRange.to)}
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <SummaryCard label="Total Forklifts" value={String(data.summary.totalForklifts)} />
              <SummaryCard label="● Active" value={String(data.summary.activeForklifts)} className="text-green-700" />
              <SummaryCard label="⚠ Maintenance" value={String(data.summary.maintenanceForklifts)} className="text-amber-700" />
              <SummaryCard label="✕ Out of Service" value={String(data.summary.outOfServiceForklifts)} className="text-red-700" />
              <SummaryCard label="Total Shifts" value={String(data.summary.totalShifts)} />
              <SummaryCard label="Completed Shifts" value={String(data.summary.completedShifts)} />
              <SummaryCard label="Hours Worked" value={formatHours(data.summary.totalHoursWorked)} />
              <SummaryCard label="Total Mileage" value={formatKm(data.summary.totalReadingDelta)} />
              <SummaryCard label="Fuel Used" value={formatLitres(data.summary.totalFuelUsed)} />
              <SummaryCard label="Fuel Cost" value={formatZar(data.summary.totalFuelCost)} />
            </div>
          </section>

          {/* Forklift Usage */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
              <h2 className="text-sm font-semibold text-slate-800">Forklift Usage</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Forklift</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Shifts</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Hours</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Mileage</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Fuel</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Fuel Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {data.forkliftUsage.map((fl) => (
                    <tr key={fl.forkliftId} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{fl.displayId}</td>
                      <td className="px-4 py-3 text-slate-700">{fl.name}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={fl.status} />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{fl.shiftCount}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatHours(fl.hoursWorked)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatKm(fl.readingDelta)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatLitres(fl.fuelConsumed)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatZar(fl.fuelCost)}</td>
                    </tr>
                  ))}
                  {data.forkliftUsage.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        No forklifts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Shifts */}
          <ReportTable
            title="Shifts"
            emptyMessage="No shifts found for this period."
            headers={['Forklift', 'Start', 'End', 'Duration', 'Start Reading', 'End Reading', 'Delta', 'Status', 'Notes']}
            rows={data.shifts}
            renderRow={(s: ShiftReportRow) => (
              <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{s.forkliftDisplayId}</td>
                <td className="px-4 py-3 text-slate-700">{formatDateTime(s.startTime)}</td>
                <td className="px-4 py-3 text-slate-700">{formatDateTime(s.endTime)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatHours(s.durationHours)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatKm(s.startingReading)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatKm(s.endingReading)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatKm(s.readingDelta)}</td>
                <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">{s.notes ?? '—'}</td>
              </tr>
            )}
          />

          {/* Fuel Logs */}
          <ReportTable
            title="Fuel Logs"
            emptyMessage="No fuel records found for this period."
            headers={['Forklift', 'Date/Time', 'Litres', 'Cost', 'Reading', 'Recorded By', 'Notes']}
            rows={data.fuelLogs}
            renderRow={(f: FuelReportRow) => (
              <tr key={f.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{f.forkliftDisplayId}</td>
                <td className="px-4 py-3 text-slate-700">{formatDateTime(f.refuelDateTime)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatLitres(f.fuelAmountLiters)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatZar(f.fuelCostZar)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatKm(f.readingAtRefuel)}</td>
                <td className="px-4 py-3 text-slate-700">{f.createdByName}</td>
                <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">{f.notes ?? '—'}</td>
              </tr>
            )}
          />

          {/* Maintenance Logs */}
          <ReportTable
            title="Maintenance"
            emptyMessage="No maintenance records found for this period."
            headers={['Forklift', 'Date', 'Description', 'Cost', 'Status', 'Recorded By']}
            rows={data.maintenanceLogs}
            renderRow={(m: MaintenanceReportRow) => (
              <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{m.forkliftDisplayId}</td>
                <td className="px-4 py-3 text-slate-700">{formatDate(m.date)}</td>
                <td className="px-4 py-3 text-slate-700 max-w-[300px]">{m.description}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatZar(m.costZar)}</td>
                <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                <td className="px-4 py-3 text-slate-700">{m.createdByName}</td>
              </tr>
            )}
          />
        </>
      )}

      {/* Initial state — no report generated yet */}
      {!data && !loading && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 py-16 text-center">
          <p className="text-slate-500 mb-2">Select a date range and generate a report.</p>
          <p className="text-sm text-slate-400">Reports include fleet statistics, shifts, fuel logs, and maintenance records.</p>
        </div>
      )}
    </div>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-slate-100 bg-slate-50 p-3">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <span className={`text-lg font-semibold ${className ?? 'text-slate-900'}`}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusBadgeClasses(status)}`}>
      {getStatusIcon(status)} {formatStatus(status)}
    </span>
  );
}

function ReportTable<T>({
  title,
  emptyMessage,
  headers,
  rows,
  renderRow,
}: {
  title: string;
  emptyMessage: string;
  headers: string[];
  rows: T[];
  renderRow: (row: T) => React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
        <h2 className="text-sm font-semibold text-slate-800">
          {title} <span className="font-normal text-slate-500">({rows.length})</span>
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {headers.map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-slate-600 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-4 py-8 text-center text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map(renderRow)
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
