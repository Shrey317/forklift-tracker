'use client';

import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { formatZar } from '@/lib/format';

interface TrendData {
  date: string;
  displayDate: string;
  shifts: number;
  hoursWorked: number;
  fuelLiters: number;
  fuelCostZar: number;
}

export function DashboardCharts({ data }: { data: TrendData[] }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Utilization Chart */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-slate-500">
          7-Day Fleet Utilization
        </h2>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="displayDate"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#64748b' }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#64748b' }}
              />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: '#f8fafc' }}
              />
              <Bar
                name="Hours Worked"
                dataKey="hoursWorked"
                fill="#1e40af"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                name="Shifts Completed"
                dataKey="shifts"
                fill="#93c5fd"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fuel Usage Chart */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-slate-500">
          7-Day Fuel Costs (ZAR)
        </h2>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="displayDate"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#64748b' }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#64748b' }}
                tickFormatter={(value) => `R ${value}`}
              />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: any) => [formatZar(Number(value)), 'Cost']}
              />
              <Line
                type="monotone"
                dataKey="fuelCostZar"
                name="Cost"
                stroke="#b91c1c"
                strokeWidth={3}
                dot={{ r: 4, fill: '#b91c1c', strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
