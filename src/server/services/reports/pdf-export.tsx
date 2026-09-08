import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToStream } from '@react-pdf/renderer';
import { formatHours, formatLitres, formatZar, formatDateTime } from '@/lib/format';

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: 'Helvetica' },
  header: { marginBottom: 20, borderBottom: '1px solid #e2e8f0', paddingBottom: 10 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 12, color: '#64748b' },
  section: { marginBottom: 15 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, backgroundColor: '#f8fafc', padding: 4 },
  row: { flexDirection: 'row', borderBottom: '1px solid #f1f5f9', paddingVertical: 4 },
  col1: { width: '25%' },
  col2: { width: '25%' },
  col3: { width: '25%' },
  col4: { width: '25%' },
  bold: { fontWeight: 'bold' },
});

function ReportDocument({ reportData, from, to }: { reportData: any; from: string; to: string }) {
  const { summary, forklifts } = reportData;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Forklift Tracker Report</Text>
          <Text style={styles.subtitle}>Period: {from} to {to}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>
          <View style={styles.row}>
            <Text style={styles.col1}>Active Forklifts</Text>
            <Text style={[styles.col1, styles.bold]}>{summary.activeForklifts}</Text>
            <Text style={styles.col1}>Total Shifts</Text>
            <Text style={[styles.col1, styles.bold]}>{summary.totalShifts}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.col1}>Total Hours Worked</Text>
            <Text style={[styles.col1, styles.bold]}>{formatHours(summary.totalHoursWorked)}</Text>
            <Text style={styles.col1}>Total Fuel Used</Text>
            <Text style={[styles.col1, styles.bold]}>{formatLitres(summary.totalFuelLiters)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.col1}>Total Fuel Cost</Text>
            <Text style={[styles.col1, styles.bold]}>{formatZar(summary.totalFuelCostZar)}</Text>
            <Text style={styles.col1}>Total Maintenance</Text>
            <Text style={[styles.col1, styles.bold]}>{summary.totalMaintenanceCount}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Forklift Utilization</Text>
          <View style={[styles.row, { backgroundColor: '#f1f5f9', fontWeight: 'bold' }]}>
            <Text style={styles.col1}>Forklift</Text>
            <Text style={styles.col2}>Shifts</Text>
            <Text style={styles.col3}>Hours</Text>
            <Text style={styles.col4}>Fuel Cost</Text>
          </View>
          {forklifts.map((f: any) => (
            <View key={f.id} style={styles.row}>
              <Text style={styles.col1}>{f.displayId}</Text>
              <Text style={styles.col2}>{f.stats.shiftsCount}</Text>
              <Text style={styles.col3}>{formatHours(f.stats.hoursWorked)}</Text>
              <Text style={styles.col4}>{formatZar(f.stats.fuelCostZar)}</Text>
            </View>
          ))}
        </View>

      </Page>
    </Document>
  );
}

export async function generatePdfBuffer(reportData: any, from: string, to: string): Promise<Uint8Array> {
  const stream = await renderToStream(<ReportDocument reportData={reportData} from={from} to={to} />);
  
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(new Uint8Array(Buffer.concat(chunks))));
  });
}
