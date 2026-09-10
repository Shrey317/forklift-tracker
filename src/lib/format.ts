/**
 * Shared formatting utilities — single source of truth for how numbers,
 * currency, dates, and status labels are displayed across the entire app.
 * Used by dashboard, reports, PDF, Excel, and all table/card components.
 */

const TIMEZONE = 'Africa/Johannesburg';

// ── Numbers ──────────────────────────────────────────────────────────────────

/** Format mileage/reading: "1,234.5 km" */
export function formatKm(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  return `${num.toLocaleString('en-ZA', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

export function formatReading(value: string | number | null | undefined, trackingMode: string): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  const formatted = num.toLocaleString('en-ZA', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return trackingMode === 'ENGINE_HOURS' ? `${formatted} hrs` : `${formatted} km`;
}

export function getTrackingLabel(trackingMode: string): string {
  return trackingMode === 'ENGINE_HOURS' ? 'Engine Hours' : 'Mileage (km)';
}

export function getTrackingUnit(trackingMode: string): string {
  return trackingMode === 'ENGINE_HOURS' ? 'hrs' : 'km';
}

/** Format hours: "12.50 h" */
export function formatHours(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  return `${num.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} h`;
}

/** Format litres: "45.50 L" */
export function formatLitres(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  return `${num.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;
}

/** Format ZAR currency: "R 1,250.00" */
export function formatZar(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  return `R ${num.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Format a plain number with commas */
export function formatNumber(value: string | number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  return num.toLocaleString('en-ZA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ── Dates ────────────────────────────────────────────────────────────────────

/** Format date: "08 Sep 2026" */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: TIMEZONE,
  });
}

/** Format datetime: "08 Sep 2026, 14:30" */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIMEZONE,
  });
}

/** Format time only: "14:30" */
export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIMEZONE,
  });
}

// ── Status ───────────────────────────────────────────────────────────────────

/** Human-readable status text, never conveyed by color alone */
export function formatStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

/** CSS classes for status badges — always includes text label, not color alone */
export function getStatusBadgeClasses(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'COMPLETED':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'MAINTENANCE':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'SCHEDULED':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'OUT_OF_SERVICE':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

/** Status icon prefix — supplements color with a visual symbol */
export function getStatusIcon(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return '●';
    case 'COMPLETED':
      return '✓';
    case 'MAINTENANCE':
      return '⚠';
    case 'SCHEDULED':
      return '◷';
    case 'OUT_OF_SERVICE':
      return '✕';
    default:
      return '○';
  }
}
