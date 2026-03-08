/**
 * @file booking-state-chart.tsx
 * @description Booking state distribution pie chart
 * @module components/dashboard
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface BookingStateData {
  state: string
  count: number
  color: string
}

interface BookingStateChartProps {
  data?: BookingStateData[]
}

const STATE_COLORS: Record<string, string> = {
  draft: '#9CA3AF',
  risk_check: '#F59E0B',
  payment_pending: '#F59E0B',
  confirmed: '#10B981',
  active: '#1F87E8',
  returned: '#6366F1',
  closed: '#6B7280',
  cancelled: '#EF4444',
}

const STATE_LABELS: Record<string, string> = {
  draft: 'مسودة',
  risk_check: 'فحص المخاطر',
  payment_pending: 'انتظار الدفع',
  confirmed: 'مؤكد',
  active: 'نشط',
  returned: 'مرتجع',
  closed: 'مغلق',
  cancelled: 'ملغي',
}

export function BookingStateChart({ data = [] }: BookingStateChartProps) {
  const chartData = data.map((item) => ({
    name: STATE_LABELS[item.state] || item.state,
    value: item.count,
    color: item.color || STATE_COLORS[item.state] || '#6B7280',
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>توزيع حالات الحجوزات</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-80 items-center justify-center text-neutral-500">
            لا توجد بيانات
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
