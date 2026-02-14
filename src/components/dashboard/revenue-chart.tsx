/**
 * @file revenue-chart.tsx
 * @description Revenue chart component (last 30 days)
 * @module components/dashboard
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { arSA } from 'date-fns/locale'

interface RevenueData {
  date: string
  revenue: number
}

interface RevenueChartProps {
  data?: RevenueData[]
  title?: string
}

export function RevenueChart({ data = [], title = 'الإيرادات (آخر 30 يوم)' }: RevenueChartProps) {
  // Format data for chart
  const chartData = data.map((item) => ({
    date: format(new Date(item.date), 'dd/MM', { locale: arSA }),
    revenue: item.revenue,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-80 items-center justify-center text-neutral-500">
            لا توجد بيانات
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                formatter={(value: number | undefined) => [`${(value ?? 0).toLocaleString('ar-SA')} ر.س`, 'الإيرادات']}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#1F87E8"
                strokeWidth={2}
                name="الإيرادات"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
