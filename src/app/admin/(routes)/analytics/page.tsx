/**
 * @file page.tsx
 * @description Executive BI dashboard – KPIs, revenue trends, utilization, customer insights
 * @module app/admin/(routes)/analytics
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Calendar,
  Users,
  Package,
  Building2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils/format.utils'

interface ExecutiveStats {
  revenue: { today: number; thisWeek: number; thisMonth: number; thisYear: number; growth: number }
  bookings: { today: number; thisWeek: number; thisMonth: number; pending: number; active: number; growth: number }
  equipment: { total: number; available: number; rented: number; maintenance: number; utilization: number }
  customers: { total: number; active: number; newThisMonth: number; growth: number }
}

interface TrendsData {
  period: string
  days: number
  revenueByPeriod: Array<{ period: string; revenue: number; bookings: number }>
}

interface UtilizationData {
  periodDays: number
  equipment: {
    totalUnits: number
    utilizationRate: number
    byEquipment: Array<{ equipmentId: string; equipmentName: string; utilizationRate: number; rentedDays: number }>
  }
  studio: {
    byStudio: Array<{ studioName: string; utilizationRate: number; bookedHours: number; revenue: number }>
  }
}

export default function AnalyticsPage() {
  const { toast } = useToast()
  const [executive, setExecutive] = useState<ExecutiveStats | null>(null)
  const [trends, setTrends] = useState<TrendsData | null>(null)
  const [utilization, setUtilization] = useState<UtilizationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [trendsDays, setTrendsDays] = useState('30')
  const [utilDays, setUtilDays] = useState('30')

  const loadExecutive = async () => {
    try {
      const res = await fetch('/api/analytics/executive')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setExecutive(data)
    } catch {
      toast({ title: 'Error', description: 'Failed to load executive stats', variant: 'destructive' })
    }
  }

  const loadTrends = async () => {
    try {
      const res = await fetch(`/api/analytics/trends?days=${trendsDays}&period=daily`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setTrends(data)
    } catch {
      toast({ title: 'Error', description: 'Failed to load trends', variant: 'destructive' })
    }
  }

  const loadUtilization = async () => {
    try {
      const res = await fetch(`/api/analytics/utilization?days=${utilDays}`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setUtilization(data)
    } catch {
      toast({ title: 'Error', description: 'Failed to load utilization', variant: 'destructive' })
    }
  }

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      await Promise.all([loadExecutive(), loadTrends(), loadUtilization()])
      setLoading(false)
    }
    run()
  }, [])

  useEffect(() => {
    if (!loading) loadTrends()
  }, [trendsDays])

  useEffect(() => {
    if (!loading) loadUtilization()
  }, [utilDays])

  const handleRefresh = () => {
    setLoading(true)
    Promise.all([loadExecutive(), loadTrends(), loadUtilization()]).finally(() => setLoading(false))
  }

  if (loading && !executive) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BarChart3 className="h-8 w-8" />
            التحليلات والإشغال
          </h1>
          <p className="text-muted-foreground mt-1">لوحة BI ونسب إشغال المعدات والاستوديوهات</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/finance/reports">
              <ExternalLink className="h-4 w-4 mr-2" />
              التقارير المالية
            </Link>
          </Button>
        </div>
      </div>

      {executive && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">الإيرادات (هذا الشهر)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(executive.revenue.thisMonth)}</p>
              <p className="text-xs text-muted-foreground">
                {executive.revenue.growth >= 0 ? '+' : ''}{executive.revenue.growth.toFixed(1)}% عن الشهر الماضي
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">الحجوزات (هذا الشهر)</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{executive.bookings.thisMonth}</p>
              <p className="text-xs text-muted-foreground">
                نشط: {executive.bookings.active} · في الانتظار: {executive.bookings.pending}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">نسبة إشغال المعدات</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{executive.equipment.utilization.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">
                {executive.equipment.rented} مستأجر من {executive.equipment.total}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">العملاء</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{executive.customers.total}</p>
              <p className="text-xs text-muted-foreground">
                نشط هذا الشهر: {executive.customers.active} · جديد: {executive.customers.newThisMonth}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">الاتجاهات والإيرادات</TabsTrigger>
          <TabsTrigger value="utilization">الإشغال</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    الإيرادات والحجوزات حسب الفترة
                  </CardTitle>
                  <CardDescription>إيرادات وعدد الحجوزات حسب اليوم</CardDescription>
                </div>
                <Select value={trendsDays} onValueChange={setTrendsDays}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 أيام</SelectItem>
                    <SelectItem value="30">30 يوم</SelectItem>
                    <SelectItem value="90">90 يوم</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {trends && trends.revenueByPeriod.length > 0 ? (
                <ResponsiveContainer width="100%" height={340}>
                  <LineChart data={trends.revenueByPeriod}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => v.toString()} />
                    <Tooltip
                      formatter={(value, name) => [
                        name === 'revenue' ? formatCurrency(Number(value ?? 0)) : Number(value ?? 0),
                        name === 'revenue' ? 'الإيرادات' : 'الحجوزات',
                      ]}
                      labelFormatter={(label) => label}
                    />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#1F87E8" name="الإيرادات" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="bookings" stroke="#10B981" name="الحجوزات" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-80 items-center justify-center text-muted-foreground">لا توجد بيانات للفترة المحددة</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="utilization" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    إشغال المعدات
                  </CardTitle>
                  <CardDescription>نسبة الاستخدام حسب القطعة (أيام مستأجرة / أيام متاحة)</CardDescription>
                </div>
                <Select value={utilDays} onValueChange={setUtilDays}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 أيام</SelectItem>
                    <SelectItem value="30">30 يوم</SelectItem>
                    <SelectItem value="90">90 يوم</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {utilization && utilization.equipment.byEquipment.length > 0 ? (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    إجمالي نسبة الإشغال: <strong>{utilization.equipment.utilizationRate}%</strong> ({utilization.periodDays} يوم)
                  </p>
                  <ResponsiveContainer width="100%" height={360}>
                    <BarChart
                      data={utilization.equipment.byEquipment.slice(0, 15)}
                      layout="vertical"
                      margin={{ left: 120 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} unit="%" tickFormatter={(v) => `${v}%`} />
                      <YAxis type="category" dataKey="equipmentName" width={110} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value) => [`${Number(value ?? 0)}%`, 'نسبة الإشغال']} />
                      <Bar dataKey="utilizationRate" fill="#1F87E8" name="نسبة الإشغال" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <div className="flex h-60 items-center justify-center text-muted-foreground">لا توجد بيانات إشغال للمعدات</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                إشغال الاستوديوهات
              </CardTitle>
              <CardDescription>نسبة الساعات المحجوزة من إجمالي الساعات المتاحة</CardDescription>
            </CardHeader>
            <CardContent>
              {utilization && utilization.studio.byStudio.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={utilization.studio.byStudio} margin={{ top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="studioName" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      formatter={(value, name) => [
                        name === 'utilizationRate' ? `${Number(value ?? 0)}%` : name === 'revenue' ? formatCurrency(Number(value ?? 0)) : Number(value ?? 0),
                        name === 'utilizationRate' ? 'نسبة الإشغال' : name === 'revenue' ? 'الإيرادات' : 'ساعات',
                      ]}
                    />
                    <Bar dataKey="utilizationRate" fill="#6366F1" name="نسبة الإشغال" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-40 items-center justify-center text-muted-foreground">لا توجد بيانات إشغال للاستوديوهات</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
