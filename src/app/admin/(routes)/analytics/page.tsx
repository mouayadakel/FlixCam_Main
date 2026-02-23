/**
 * @file page.tsx
 * @description Executive BI dashboard – KPIs, revenue trends, utilization, customer insights
 * @module app/admin/(routes)/analytics
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
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
  Download,
  Repeat,
  UserPlus,
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
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils/format.utils'

interface ExecutiveStats {
  revenue: { today: number; thisWeek: number; thisMonth: number; thisYear: number; growth: number }
  bookings: {
    today: number
    thisWeek: number
    thisMonth: number
    pending: number
    active: number
    growth: number
  }
  equipment: {
    total: number
    available: number
    rented: number
    maintenance: number
    utilization: number
  }
  customers: { total: number; active: number; newThisMonth: number; growth: number }
}

interface TrendsData {
  period: string
  days: number
  revenueByPeriod: Array<{ period: string; revenue: number; bookings: number }>
}

interface BookingAnalytics {
  days: number
  totalBookings: number
  totalRevenue: number
  avgBookingValue: number
  byStatus: Array<{ status: string; count: number }>
  byCategory: Array<{ category: string; count: number; revenue: number }>
  daily: Array<{ date: string; count: number; revenue: number }>
}

interface CustomerInsights {
  days: number
  totalRegistered: number
  activeInPeriod: number
  repeatCustomers: number
  repeatRate: number
  topCustomers: Array<{
    customerId: string
    name: string
    email: string
    totalSpend: number
    bookingCount: number
  }>
  acquisition: Array<{ month: string; count: number }>
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'معلق',
  CONFIRMED: 'مؤكد',
  ACTIVE: 'نشط',
  COMPLETED: 'مكتمل',
  CANCELLED: 'ملغي',
  OVERDUE: 'متأخر',
}

const PIE_COLORS = ['#1F87E8', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1']

interface UtilizationData {
  periodDays: number
  equipment: {
    totalUnits: number
    utilizationRate: number
    byEquipment: Array<{
      equipmentId: string
      equipmentName: string
      utilizationRate: number
      rentedDays: number
    }>
  }
  studio: {
    byStudio: Array<{
      studioName: string
      utilizationRate: number
      bookedHours: number
      revenue: number
    }>
  }
}

export default function AnalyticsPage() {
  const { toast } = useToast()
  const [executive, setExecutive] = useState<ExecutiveStats | null>(null)
  const [trends, setTrends] = useState<TrendsData | null>(null)
  const [utilization, setUtilization] = useState<UtilizationData | null>(null)
  const [bookingAnalytics, setBookingAnalytics] = useState<BookingAnalytics | null>(null)
  const [customerInsights, setCustomerInsights] = useState<CustomerInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [trendsDays, setTrendsDays] = useState('30')
  const [utilDays, setUtilDays] = useState('30')
  const [bookingDays, setBookingDays] = useState('30')
  const [customerDays, setCustomerDays] = useState('90')

  const loadExecutive = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics/executive')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setExecutive(data)
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load executive stats',
        variant: 'destructive',
      })
    }
  }, [toast])

  const loadTrends = useCallback(async () => {
    try {
      const res = await fetch(`/api/analytics/trends?days=${trendsDays}&period=daily`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setTrends(data)
    } catch {
      toast({ title: 'Error', description: 'Failed to load trends', variant: 'destructive' })
    }
  }, [trendsDays, toast])

  const loadUtilization = useCallback(async () => {
    try {
      const res = await fetch(`/api/analytics/utilization?days=${utilDays}`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setUtilization(data)
    } catch {
      toast({ title: 'Error', description: 'Failed to load utilization', variant: 'destructive' })
    }
  }, [utilDays, toast])

  const loadBookingAnalytics = useCallback(async () => {
    try {
      const res = await fetch(`/api/analytics/bookings?days=${bookingDays}`)
      if (res.ok) setBookingAnalytics(await res.json())
    } catch {
      /* non-critical */
    }
  }, [bookingDays])

  const loadCustomerInsights = useCallback(async () => {
    try {
      const res = await fetch(`/api/analytics/customers?days=${customerDays}`)
      if (res.ok) setCustomerInsights(await res.json())
    } catch {
      /* non-critical */
    }
  }, [customerDays])

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      await Promise.all([
        loadExecutive(),
        loadTrends(),
        loadUtilization(),
        loadBookingAnalytics(),
        loadCustomerInsights(),
      ])
      setLoading(false)
    }
    run()
  }, [loadExecutive, loadTrends, loadUtilization, loadBookingAnalytics, loadCustomerInsights])

  useEffect(() => {
    if (!loading) loadTrends()
  }, [trendsDays, loading, loadTrends])

  useEffect(() => {
    if (!loading) loadUtilization()
  }, [utilDays, loading, loadUtilization])

  useEffect(() => {
    if (!loading) loadBookingAnalytics()
  }, [bookingDays, loading, loadBookingAnalytics])

  useEffect(() => {
    if (!loading) loadCustomerInsights()
  }, [customerDays, loading, loadCustomerInsights])

  const handleRefresh = () => {
    setLoading(true)
    Promise.all([
      loadExecutive(),
      loadTrends(),
      loadUtilization(),
      loadBookingAnalytics(),
      loadCustomerInsights(),
    ]).finally(() => setLoading(false))
  }

  const exportCsv = (filename: string, headers: string[], rows: string[][]) => {
    const bom = '\uFEFF'
    const csv = bom + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading && !executive) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
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
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <BarChart3 className="h-8 w-8" />
            التحليلات والإشغال
          </h1>
          <p className="mt-1 text-muted-foreground">لوحة BI ونسب إشغال المعدات والاستوديوهات</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/finance/reports">
              <ExternalLink className="mr-2 h-4 w-4" />
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
                {executive.revenue.growth >= 0 ? '+' : ''}
                {executive.revenue.growth.toFixed(1)}% عن الشهر الماضي
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
                نشط هذا الشهر: {executive.customers.active} · جديد:{' '}
                {executive.customers.newThisMonth}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">الاتجاهات والإيرادات</TabsTrigger>
          <TabsTrigger value="bookings">تحليل الحجوزات</TabsTrigger>
          <TabsTrigger value="customers">رؤى العملاء</TabsTrigger>
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
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tickFormatter={(v) => v.toString()}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        name === 'revenue'
                          ? formatCurrency(Number(value ?? 0))
                          : Number(value ?? 0),
                        name === 'revenue' ? 'الإيرادات' : 'الحجوزات',
                      ]}
                      labelFormatter={(label) => label}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#1F87E8"
                      name="الإيرادات"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="bookings"
                      stroke="#10B981"
                      name="الحجوزات"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-80 items-center justify-center text-muted-foreground">
                  لا توجد بيانات للفترة المحددة
                </div>
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
                  <CardDescription>
                    نسبة الاستخدام حسب القطعة (أيام مستأجرة / أيام متاحة)
                  </CardDescription>
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
                  <p className="mb-4 text-sm text-muted-foreground">
                    إجمالي نسبة الإشغال: <strong>{utilization.equipment.utilizationRate}%</strong> (
                    {utilization.periodDays} يوم)
                  </p>
                  <ResponsiveContainer width="100%" height={360}>
                    <BarChart
                      data={utilization.equipment.byEquipment.slice(0, 15)}
                      layout="vertical"
                      margin={{ left: 120 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        unit="%"
                        tickFormatter={(v) => `${v}%`}
                      />
                      <YAxis
                        type="category"
                        dataKey="equipmentName"
                        width={110}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip formatter={(value) => [`${Number(value ?? 0)}%`, 'نسبة الإشغال']} />
                      <Bar
                        dataKey="utilizationRate"
                        fill="#1F87E8"
                        name="نسبة الإشغال"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <div className="flex h-60 items-center justify-center text-muted-foreground">
                  لا توجد بيانات إشغال للمعدات
                </div>
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
                        name === 'utilizationRate'
                          ? `${Number(value ?? 0)}%`
                          : name === 'revenue'
                            ? formatCurrency(Number(value ?? 0))
                            : Number(value ?? 0),
                        name === 'utilizationRate'
                          ? 'نسبة الإشغال'
                          : name === 'revenue'
                            ? 'الإيرادات'
                            : 'ساعات',
                      ]}
                    />
                    <Bar
                      dataKey="utilizationRate"
                      fill="#6366F1"
                      name="نسبة الإشغال"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-40 items-center justify-center text-muted-foreground">
                  لا توجد بيانات إشغال للاستوديوهات
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bookings Analytics Tab */}
        <TabsContent value="bookings" className="space-y-4">
          <div className="flex items-center justify-between">
            <Select value={bookingDays} onValueChange={setBookingDays}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 أيام</SelectItem>
                <SelectItem value="30">30 يوم</SelectItem>
                <SelectItem value="90">90 يوم</SelectItem>
              </SelectContent>
            </Select>
            {bookingAnalytics && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const ba = bookingAnalytics
                  exportCsv(
                    `bookings-analytics-${bookingDays}d.csv`,
                    ['التاريخ', 'عدد الحجوزات', 'الإيرادات'],
                    ba.daily.map((d) => [d.date, String(d.count), String(d.revenue)])
                  )
                }}
              >
                <Download className="ml-2 h-4 w-4" />
                تصدير CSV
              </Button>
            )}
          </div>

          {bookingAnalytics && (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">إجمالي الحجوزات</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{bookingAnalytics.totalBookings}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {formatCurrency(bookingAnalytics.totalRevenue)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">متوسط قيمة الحجز</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {formatCurrency(bookingAnalytics.avgBookingValue)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Status Pie */}
                <Card>
                  <CardHeader>
                    <CardTitle>توزيع حسب الحالة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {bookingAnalytics.byStatus.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={bookingAnalytics.byStatus.map((s) => ({
                              ...s,
                              label: STATUS_LABELS[s.status] ?? s.status,
                            }))}
                            dataKey="count"
                            nameKey="label"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {bookingAnalytics.byStatus.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v, name) => [v, name]} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="py-8 text-center text-muted-foreground">لا توجد بيانات</p>
                    )}
                  </CardContent>
                </Card>

                {/* Category Bar */}
                <Card>
                  <CardHeader>
                    <CardTitle>توزيع حسب الفئة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {bookingAnalytics.byCategory.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={bookingAnalytics.byCategory.slice(0, 8)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                          <YAxis />
                          <Tooltip
                            formatter={(v, name) => [
                              name === 'revenue' ? formatCurrency(Number(v)) : v,
                              name === 'revenue' ? 'الإيرادات' : 'عدد الحجوزات',
                            ]}
                          />
                          <Legend />
                          <Bar
                            dataKey="count"
                            fill="#1F87E8"
                            name="الحجوزات"
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey="revenue"
                            fill="#10B981"
                            name="الإيرادات"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="py-8 text-center text-muted-foreground">لا توجد بيانات</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Customer Insights Tab */}
        <TabsContent value="customers" className="space-y-4">
          <div className="flex items-center justify-between">
            <Select value={customerDays} onValueChange={setCustomerDays}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 يوم</SelectItem>
                <SelectItem value="90">90 يوم</SelectItem>
                <SelectItem value="180">180 يوم</SelectItem>
              </SelectContent>
            </Select>
            {customerInsights && customerInsights.topCustomers.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const ci = customerInsights
                  exportCsv(
                    `top-customers-${customerDays}d.csv`,
                    ['الاسم', 'البريد', 'عدد الحجوزات', 'إجمالي الإنفاق'],
                    ci.topCustomers.map((c) => [
                      c.name,
                      c.email,
                      String(c.bookingCount),
                      String(c.totalSpend),
                    ])
                  )
                }}
              >
                <Download className="ml-2 h-4 w-4" />
                تصدير CSV
              </Button>
            )}
          </div>

          {customerInsights && (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">إجمالي المسجلين</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{customerInsights.totalRegistered}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">نشط في الفترة</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{customerInsights.activeInPeriod}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">عملاء متكررون</CardTitle>
                    <Repeat className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{customerInsights.repeatCustomers}</p>
                    <p className="text-xs text-muted-foreground">
                      نسبة التكرار: {customerInsights.repeatRate}%
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">معدل الاكتساب</CardTitle>
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {customerInsights.acquisition.length > 0
                        ? customerInsights.acquisition[customerInsights.acquisition.length - 1]
                            .count
                        : 0}
                    </p>
                    <p className="text-xs text-muted-foreground">مستخدم جديد هذا الشهر</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Top Customers Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>أفضل العملاء حسب الإنفاق</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {customerInsights.topCustomers.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>الاسم</TableHead>
                            <TableHead>الحجوزات</TableHead>
                            <TableHead>إجمالي الإنفاق</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customerInsights.topCustomers.slice(0, 10).map((c, i) => (
                            <TableRow key={c.customerId}>
                              <TableCell className="font-medium">{i + 1}</TableCell>
                              <TableCell>
                                <div>{c.name}</div>
                                <div className="text-xs text-muted-foreground" dir="ltr">
                                  {c.email}
                                </div>
                              </TableCell>
                              <TableCell>{c.bookingCount}</TableCell>
                              <TableCell className="font-medium">
                                {formatCurrency(c.totalSpend)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="py-8 text-center text-muted-foreground">لا توجد بيانات</p>
                    )}
                  </CardContent>
                </Card>

                {/* Acquisition Trend */}
                <Card>
                  <CardHeader>
                    <CardTitle>اتجاه اكتساب العملاء</CardTitle>
                    <CardDescription>عدد المستخدمين الجدد شهرياً</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {customerInsights.acquisition.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={customerInsights.acquisition}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis />
                          <Tooltip formatter={(v) => [v, 'مستخدم جديد']} />
                          <Bar
                            dataKey="count"
                            fill="#8B5CF6"
                            name="مستخدمين جدد"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="py-8 text-center text-muted-foreground">لا توجد بيانات</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
