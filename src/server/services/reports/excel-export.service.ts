import ExcelJS from 'exceljs';
import type { ReportData } from './report-data.service';

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1E3A5F' }, // Navy
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFFFFFFF' },
  size: 11,
};

const SUBHEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  size: 11,
};

const CURRENCY_FORMAT = '#,##0.00';
const NUMBER_FORMAT = '#,##0.00';
const READING_FORMAT = '#,##0.0';

function styleHeaderRow(sheet: ExcelJS.Worksheet): void {
  const row = sheet.getRow(1);
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF3B5998' } },
    };
  });
  row.height = 24;
}

function autoFitColumns(sheet: ExcelJS.Worksheet, minWidth = 12): void {
  sheet.columns.forEach((col) => {
    if (!col.eachCell) return;
    let maxLen = minWidth;
    col.eachCell({ includeEmpty: true }, (cell) => {
      const val = cell.value?.toString() ?? '';
      if (val.length > maxLen) maxLen = Math.min(val.length + 2, 50);
    });
    col.width = maxLen;
  });
}

function formatDateForExcel(isoString: string): Date {
  return new Date(isoString);
}

/**
 * Generates a professional multi-sheet Excel workbook from report data.
 * Uses the exact same ReportData that the report page and PDF use —
 * single source of truth, no separate calculations.
 */
export async function generateExcelReport(data: ReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Forklift Tracker';
  workbook.created = new Date();

  // ── Sheet 1: Summary ──
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 },
  ];
  styleHeaderRow(summarySheet);

  const s = data.summary;
  const summaryRows = [
    { metric: 'Report Period', value: `${data.dateRange.from} to ${data.dateRange.to}` },
    { metric: 'Generated', value: new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' }) },
    { metric: '', value: '' },
    { metric: 'FLEET STATUS', value: '' },
    { metric: 'Total Forklifts', value: s.totalForklifts },
    { metric: 'Active', value: s.activeForklifts },
    { metric: 'In Maintenance', value: s.maintenanceForklifts },
    { metric: 'Out of Service', value: s.outOfServiceForklifts },
    { metric: '', value: '' },
    { metric: 'OPERATIONS', value: '' },
    { metric: 'Total Shifts', value: s.totalShifts },
    { metric: 'Completed Shifts', value: s.completedShifts },
    { metric: 'Total Hours Worked', value: Number(s.totalHoursWorked) },
    { metric: 'Total Reading Delta', value: Number(s.totalReadingDelta) },
    { metric: '', value: '' },
    { metric: 'FUEL', value: '' },
    { metric: 'Total Fuel Used (L)', value: Number(s.totalFuelUsed) },
    { metric: 'Total Fuel Cost (ZAR)', value: Number(s.totalFuelCost) },
  ];
  summaryRows.forEach((row) => {
    const excelRow = summarySheet.addRow(row);
    if (row.metric === 'FLEET STATUS' || row.metric === 'OPERATIONS' || row.metric === 'FUEL') {
      excelRow.getCell('metric').font = SUBHEADER_FONT;
    }
  });

  // Format currency/number cells
  summarySheet.getColumn('value').numFmt = '#,##0.00';

  // ── Sheet 2: Forklift Usage ──
  const usageSheet = workbook.addWorksheet('Forklift Usage');
  usageSheet.columns = [
    { header: 'Forklift ID', key: 'displayId', width: 14 },
    { header: 'Name', key: 'name', width: 20 },
    { header: 'Manufacturer', key: 'manufacturer', width: 16 },
    { header: 'Model', key: 'model', width: 14 },
    { header: 'Status', key: 'status', width: 16 },
    { header: 'Shifts', key: 'shiftCount', width: 10 },
    { header: 'Hours Worked', key: 'hoursWorked', width: 14 },
    { header: 'Reading Delta', key: 'readingDelta', width: 14 },
    { header: 'Fuel Used (L)', key: 'fuelConsumed', width: 14 },
    { header: 'Fuel Cost (ZAR)', key: 'fuelCost', width: 16 },
  ];
  styleHeaderRow(usageSheet);

  data.forkliftUsage.forEach((fl) => {
    usageSheet.addRow({
      displayId: fl.displayId,
      name: fl.name,
      manufacturer: fl.manufacturer,
      model: fl.model,
      status: fl.status.replace('_', ' '),
      shiftCount: fl.shiftCount,
      hoursWorked: Number(fl.hoursWorked),
      readingDelta: Number(fl.readingDelta),
      fuelConsumed: Number(fl.fuelConsumed),
      fuelCost: Number(fl.fuelCost),
    });
  });

  // Number formats
  usageSheet.getColumn('hoursWorked').numFmt = NUMBER_FORMAT;
  usageSheet.getColumn('readingDelta').numFmt = READING_FORMAT;
  usageSheet.getColumn('fuelConsumed').numFmt = NUMBER_FORMAT;
  usageSheet.getColumn('fuelCost').numFmt = CURRENCY_FORMAT;

  // Add totals row
  if (data.forkliftUsage.length > 0) {
    const totalsRow = usageSheet.addRow({
      displayId: '',
      name: 'TOTALS',
      manufacturer: '',
      model: '',
      status: '',
      shiftCount: data.forkliftUsage.reduce((sum, fl) => sum + fl.shiftCount, 0),
      hoursWorked: Number(data.summary.totalHoursWorked),
      readingDelta: Number(data.summary.totalReadingDelta),
      fuelConsumed: Number(data.summary.totalFuelUsed),
      fuelCost: Number(data.summary.totalFuelCost),
    });
    totalsRow.font = { bold: true };
  }

  // Freeze header + auto-filter
  usageSheet.views = [{ state: 'frozen', ySplit: 1 }];
  usageSheet.autoFilter = { from: 'A1', to: 'J1' };

  // ── Sheet 3: Shifts ──
  const shiftsSheet = workbook.addWorksheet('Shifts');
  shiftsSheet.columns = [
    { header: 'Forklift', key: 'forklift', width: 14 },
    { header: 'Start Time', key: 'startTime', width: 20 },
    { header: 'End Time', key: 'endTime', width: 20 },
    { header: 'Duration (h)', key: 'duration', width: 14 },
    { header: 'Start Reading', key: 'startReading', width: 14 },
    { header: 'End Reading', key: 'endReading', width: 14 },
    { header: 'Delta', key: 'delta', width: 12 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'End Type', key: 'endType', width: 14 },
    { header: 'Notes', key: 'notes', width: 30 },
  ];
  styleHeaderRow(shiftsSheet);

  data.shifts.forEach((s) => {
    shiftsSheet.addRow({
      forklift: s.forkliftDisplayId,
      startTime: formatDateForExcel(s.startTime),
      endTime: s.endTime ? formatDateForExcel(s.endTime) : '',
      duration: s.durationHours ? Number(s.durationHours) : '',
      startReading: Number(s.startingReading),
      endReading: s.endingReading ? Number(s.endingReading) : '',
      delta: s.readingDelta ? Number(s.readingDelta) : '',
      status: s.status,
      endType: s.endType ?? '',
      notes: s.notes ?? '',
    });
  });

  shiftsSheet.getColumn('startTime').numFmt = 'yyyy-mm-dd hh:mm';
  shiftsSheet.getColumn('endTime').numFmt = 'yyyy-mm-dd hh:mm';
  shiftsSheet.getColumn('duration').numFmt = NUMBER_FORMAT;
  shiftsSheet.getColumn('startReading').numFmt = READING_FORMAT;
  shiftsSheet.getColumn('endReading').numFmt = READING_FORMAT;
  shiftsSheet.getColumn('delta').numFmt = READING_FORMAT;
  shiftsSheet.views = [{ state: 'frozen', ySplit: 1 }];
  shiftsSheet.autoFilter = { from: 'A1', to: 'J1' };

  // ── Sheet 4: Fuel Logs ──
  const fuelSheet = workbook.addWorksheet('Fuel Logs');
  fuelSheet.columns = [
    { header: 'Forklift', key: 'forklift', width: 14 },
    { header: 'Date/Time', key: 'dateTime', width: 20 },
    { header: 'Litres', key: 'litres', width: 12 },
    { header: 'Cost (ZAR)', key: 'cost', width: 14 },
    { header: 'Reading', key: 'reading', width: 14 },
    { header: 'Notes', key: 'notes', width: 30 },
    { header: 'Recorded By', key: 'recordedBy', width: 18 },
  ];
  styleHeaderRow(fuelSheet);

  data.fuelLogs.forEach((f) => {
    fuelSheet.addRow({
      forklift: f.forkliftDisplayId,
      dateTime: formatDateForExcel(f.refuelDateTime),
      litres: Number(f.fuelAmountLiters),
      cost: f.fuelCostZar ? Number(f.fuelCostZar) : '',
      reading: Number(f.readingAtRefuel),
      notes: f.notes ?? '',
      recordedBy: f.createdByName,
    });
  });

  // Add totals row
  if (data.fuelLogs.length > 0) {
    const fuelTotals = fuelSheet.addRow({
      forklift: '',
      dateTime: 'TOTALS',
      litres: Number(data.summary.totalFuelUsed),
      cost: Number(data.summary.totalFuelCost),
      reading: '',
      notes: '',
      recordedBy: '',
    });
    fuelTotals.font = { bold: true };
  }

  fuelSheet.getColumn('dateTime').numFmt = 'yyyy-mm-dd hh:mm';
  fuelSheet.getColumn('litres').numFmt = NUMBER_FORMAT;
  fuelSheet.getColumn('cost').numFmt = CURRENCY_FORMAT;
  fuelSheet.getColumn('reading').numFmt = READING_FORMAT;
  fuelSheet.views = [{ state: 'frozen', ySplit: 1 }];
  fuelSheet.autoFilter = { from: 'A1', to: 'G1' };

  // ── Sheet 5: Maintenance ──
  const maintenanceSheet = workbook.addWorksheet('Maintenance');
  maintenanceSheet.columns = [
    { header: 'Forklift', key: 'forklift', width: 14 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Cost (ZAR)', key: 'cost', width: 14 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Recorded By', key: 'recordedBy', width: 18 },
  ];
  styleHeaderRow(maintenanceSheet);

  data.maintenanceLogs.forEach((m) => {
    maintenanceSheet.addRow({
      forklift: m.forkliftDisplayId,
      date: formatDateForExcel(m.date),
      description: m.description,
      cost: m.costZar ? Number(m.costZar) : '',
      status: m.status,
      recordedBy: m.createdByName,
    });
  });

  maintenanceSheet.getColumn('date').numFmt = 'yyyy-mm-dd';
  maintenanceSheet.getColumn('cost').numFmt = CURRENCY_FORMAT;
  maintenanceSheet.views = [{ state: 'frozen', ySplit: 1 }];
  maintenanceSheet.autoFilter = { from: 'A1', to: 'F1' };

  // Generate buffer
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
