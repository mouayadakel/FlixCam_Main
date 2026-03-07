/**
 * @file page.tsx
 * @description Admin reports page with 5 tabs: Revenue, Bookings, Equipment, Customers, Financial
 * @module app/admin/(routes)/reports
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign,
  Calendar,
  Package,
  Users,
  TrendingUp,
  Download,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils/format.utils'
import { DateRangePicker } from '@/components/ui/date-range-picker'

type ReportType = 'revenue' | 'bookings' | 'equipment' | 'customers' | 'financial'

interface RevenueData {
  totalRevenue: number
  revenueByCategory: Array<{ category: string; amount: number }>
  topItemsByRevenue: Array<{ name: string; revenue: number }>
  dailyRevenue: Array<{ date: string; amount: number }>
}

interface BookingsData {
  totalBookings: number
  confirmed: number
  completed: number
  cancelled: number
  cancellationRate: number
  averageBookingValue: number
  mostBookedItems: Array<{ name: string; count: number }>
  bookingsByStatus: Array<{ status: string; count: number }>
}

interface EquipmentData {
  equipment: Array<{
    id: string
    name: string
    totalRentalDays: number
    utilizationRate: number
    revenue: number
  }>
  idleEquipment: Array<{ id: string; name: string }>
}

interface CustomersData {
  newCustomers: number
  repeatVsFirstTime: { firstTime: number; repeat: number }
  topBySpend: Array<{
    customerId: string
    name: string
    email?: string
    totalSpend: number
  }>
  customersWithOverduePayments: number
}

interface FinancialData {
  totalInvoiced: number
  totalCollected: number
  outstandingBalance: number
  depositsHeld: number
  refundsIssued: number
  taxCollected: number
}

function getDefaultDateRange(): { start: string; end: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

export default function AdminReportsPage() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange())
  const [activeTab, setActiveTab] = useState<ReportType>('revenue')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<
    RevenueData | BookingsData | EquipmentData | CustomersData | FinancialData | null
  >(null)
  const { toast } = useToast()

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        type: activeTab,
        startDate: dateRange.start,
        endDate: dateRange.end,
      })
      const res = await fetch(`/api/admin/reports?${params}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to fetch report')
      }
      const json = await res.json()
      setData(json.data)
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to load report',
        variant: 'destructive',
      })
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [activeTab, dateRange.start, dateRange.end, toast])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const handleExportExcel = () => {
    toast({
      title: 'Export',
      description: 'Excel export will be available. Use the export API endpoint for this report type.',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">التقارير</h1>
          <p className="text-muted-foreground">تقارير الإيرادات والحجوزات والمعدات والعملاء والمالية</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DateRangePicker
            startDate={dateRange.start}
            endDate={dateRange.end}
            onStartDateChange={(v) => setDateRange((prev) => ({ ...prev, start: v }))}
            onEndDateChange={(v) => setDateRange((prev) => ({ ...prev, end: v }))}
            startLabel="من"
            endLabel="إلى"
          />
          <Button variant="outline" size="icon" onClick={fetchReport} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReportType)}>
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="revenue" className="gap-1">
            <DollarSign className="h-4 w-4" />
            الإيرادات
          </TabsTrigger>
          <TabsTrigger value="bookings" className="gap-1">
            <Calendar className="h-4 w-4" />
            الحجوزات
          </TabsTrigger>
          <TabsTrigger value="equipment" className="gap-1">
            <Package className="h-4 w-4" />
            المعدات
          </TabsTrigger>
          <TabsTrigger value="customers" className="gap-1">
            <Users className="h-4 w-4" />
            العملاء
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-1">
            <TrendingUp className="h-4 w-4" />
            المالية
          </TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="mt-6 space-y-6">
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : data ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      إجمالي الإيرادات
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {formatCurrency((data as RevenueData).totalRevenue)}
                    </p>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>الإيرادات اليومية</CardTitle>
                  <Button variant="outline" size="sm" onClick={handleExportExcel}>
                    <Download className="me-2 h-4 w-4" />
                    تصدير Excel
                  </Button>
                </CardHeader>
                <CardContent>
                  <div
                    className="h-64 rounded-lg border bg-muted/30 p-4"
                    aria-label="Revenue chart placeholder"
                  >
                    {(data as RevenueData).dailyRevenue?.length ? (
                      <div className="flex h-full items-end gap-1">
                        {(data as RevenueData).dailyRevenue.map((d, i) => (
                          <div
                            key={d.date}
                            className="flex-1 min-w-0 rounded bg-primary/60 transition-all hover:bg-primary"
                            style={{
                              height: `${Math.max((d.amount / Math.max(...(data as RevenueData).dailyRevenue.map((x) => x.amount), 1)) * 100, 2)}%`,
                            }}
                            title={`${d.date}: ${formatCurrency(d.amount)}`}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        لا توجد بيانات
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>أعلى المنتجات بالإيرادات</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>المنتج</TableHead>
                        <TableHead className="text-end">الإيراد</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {((data as RevenueData).topItemsByRevenue ?? []).map((item, i) => (
                        <TableRow key={i}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className="text-end">{formatCurrency(item.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="bookings" className="mt-6 space-y-6">
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : data ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      إجمالي الحجوزات
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{(data as BookingsData).totalBookings}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">مؤكد</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{(data as BookingsData).confirmed}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">مكتمل</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{(data as BookingsData).completed}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">ملغي</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{(data as BookingsData).cancelled}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      معدل الإلغاء
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {(data as BookingsData).cancellationRate.toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>الحجوزات حسب الحالة</CardTitle>
                  <Button variant="outline" size="sm" onClick={handleExportExcel}>
                    <Download className="me-2 h-4 w-4" />
                    تصدير Excel
                  </Button>
                </CardHeader>
                <CardContent>
                  <div
                    className="h-48 rounded-lg border bg-muted/30 p-4"
                    aria-label="Bookings by status chart placeholder"
                  >
                    {(data as BookingsData).bookingsByStatus?.length ? (
                      <div className="flex h-full flex-wrap gap-2">
                        {(data as BookingsData).bookingsByStatus.map((s) => (
                          <div
                            key={s.status}
                            className="flex items-center gap-2 rounded px-3 py-1 bg-muted"
                          >
                            <span>{s.status}</span>
                            <span className="font-medium">{s.count}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        لا توجد بيانات
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>أكثر المعدات حجزاً</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>المعدة</TableHead>
                        <TableHead className="text-end">عدد الحجوزات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {((data as BookingsData).mostBookedItems ?? []).map((item, i) => (
                        <TableRow key={i}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className="text-end">{item.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="equipment" className="mt-6 space-y-6">
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : data ? (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>استخدام المعدات</CardTitle>
                  <Button variant="outline" size="sm" onClick={handleExportExcel}>
                    <Download className="me-2 h-4 w-4" />
                    تصدير Excel
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>المعدة</TableHead>
                        <TableHead className="text-end">أيام الإيجار</TableHead>
                        <TableHead className="text-end">نسبة الاستخدام %</TableHead>
                        <TableHead className="text-end">الإيراد</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {((data as EquipmentData).equipment ?? []).slice(0, 20).map((eq) => (
                        <TableRow key={eq.id}>
                          <TableCell>{eq.name}</TableCell>
                          <TableCell className="text-end">{eq.totalRentalDays}</TableCell>
                          <TableCell className="text-end">{eq.utilizationRate.toFixed(1)}%</TableCell>
                          <TableCell className="text-end">{formatCurrency(eq.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              {(data as EquipmentData).idleEquipment?.length ? (
                <Card>
                  <CardHeader>
                    <CardTitle>معدات غير مستخدمة (آخر 30 يوم)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {(data as EquipmentData).idleEquipment.slice(0, 20).map((eq) => (
                        <span
                          key={eq.id}
                          className="rounded-full bg-muted px-3 py-1 text-sm"
                        >
                          {eq.name}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="customers" className="mt-6 space-y-6">
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : data ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      عملاء جدد
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{(data as CustomersData).newCustomers}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      أول مرة
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {(data as CustomersData).repeatVsFirstTime?.firstTime ?? 0}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      متكرر
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {(data as CustomersData).repeatVsFirstTime?.repeat ?? 0}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      متأخرون في السداد
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {(data as CustomersData).customersWithOverduePayments}
                    </p>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>أعلى العملاء إنفاقاً</CardTitle>
                  <Button variant="outline" size="sm" onClick={handleExportExcel}>
                    <Download className="me-2 h-4 w-4" />
                    تصدير Excel
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>العميل</TableHead>
                        <TableHead>البريد</TableHead>
                        <TableHead className="text-end">إجمالي الإنفاق</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {((data as CustomersData).topBySpend ?? []).map((c) => (
                        <TableRow key={c.customerId}>
                          <TableCell>{c.name}</TableCell>
                          <TableCell>{c.email ?? '—'}</TableCell>
                          <TableCell className="text-end">{formatCurrency(c.totalSpend)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="financial" className="mt-6 space-y-6">
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : data ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      إجمالي الفواتير
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {formatCurrency((data as FinancialData).totalInvoiced)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      إجمالي المحصل
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {formatCurrency((data as FinancialData).totalCollected)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      الرصيد المستحق
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {formatCurrency((data as FinancialData).outstandingBalance)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      الودائع المحجوزة
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {formatCurrency((data as FinancialData).depositsHeld)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      المبالغ المستردة
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {formatCurrency((data as FinancialData).refundsIssued)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      ضريبة القيمة المضافة
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {formatCurrency((data as FinancialData).taxCollected)}
                    </p>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>ملخص مالي</CardTitle>
                  <Button variant="outline" size="sm" onClick={handleExportExcel}>
                    <Download className="me-2 h-4 w-4" />
                    تصدير Excel
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-muted-foreground">
                      إجمالي الفواتير: {formatCurrency((data as FinancialData).totalInvoiced)} | المحصل:{' '}
                      {formatCurrency((data as FinancialData).totalCollected)} | المستحق:{' '}
                      {formatCurrency((data as FinancialData).outstandingBalance)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  )
}
