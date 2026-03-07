/**
 * @file revenue dashboard subpage
 * @description Revenue over time with period selector and KPI summary
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { DollarSign, TrendingUp, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils/format.utils'
import { useToast } from '@/hooks/use-toast'

interface TrendsRow {
  period: string
  revenue: number
  bookings: number
}

export default function DashboardRevenuePage() {
  const { toast } = useToast()
  const [period, setPeriod] = useState('30')
  const [data, setData] = useState<{ revenueByPeriod: TrendsRow[] } | null>(null)
  const [revenueStats, setRevenueStats] = useState<{
    totalRevenue: number
    growthPercentage: number
    averageOrderValue: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [trendsRes, revenueRes] = await Promise.all([
        fetch(`/api/analytics/trends?days=${period}&period=daily`),
        fetch('/api/dashboard/revenue?period=month'),
      ])
      if (trendsRes.ok) {
        const trendsJson = await trendsRes.json()
        setData(trendsJson)
      }
      if (revenueRes.ok) {
        const revenueJson = await revenueRes.json()
        setRevenueStats({
          totalRevenue: revenueJson.thisMonthRevenue ?? revenueJson.totalRevenue ?? 0,
          growthPercentage: revenueJson.growthPercentage ?? 0,
          averageOrderValue: revenueJson.averageOrderValue ?? 0,
        })
      }
    } catch {
      toast({
        title: 'خطأ',
        description: 'فشل تحميل بيانات الإيرادات',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [period, toast])

  useEffect(() => {
    load()
  }, [load])

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const chartData = data?.revenueByPeriod ?? []

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-3 text-3xl font-bold">
          <DollarSign className="h-8 w-8" />
          لوحة التحكم · الإيرادات
        </h1>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">آخر 7 أيام</SelectItem>
              <SelectItem value="30">آخر 30 يوم</SelectItem>
              <SelectItem value="90">آخر 90 يوم</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {revenueStats && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                الإيرادات (هذا الشهر)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(revenueStats.totalRevenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                النمو مقارنة بالشهر السابق
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="flex items-center gap-1 text-2xl font-bold">
                {revenueStats.growthPercentage >= 0 ? '+' : ''}
                {revenueStats.growthPercentage.toFixed(1)}%
                <TrendingUp className="h-5 w-5 text-green-600" />
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                متوسط قيمة الطلب
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(revenueStats.averageOrderValue)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>الإيرادات بمرور الوقت</CardTitle>
          <p className="text-sm text-muted-foreground">
            الإيرادات اليومية وعدد الحجوزات للفترة المحددة
          </p>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="flex h-80 items-center justify-center text-muted-foreground">
              لا توجد بيانات لهذه الفترة
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value, name) => [
                    name === 'revenue' ? formatCurrency(Number(value ?? 0)) : Number(value ?? 0),
                    name === 'revenue' ? 'الإيرادات' : 'الحجوزات',
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#1F87E8"
                  name="الإيرادات"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="bookings"
                  stroke="#10B981"
                  name="الحجوزات"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
