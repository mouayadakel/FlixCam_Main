/**
 * @file overview page
 * @description Dashboard overview with KPIs and mini revenue chart
 * @module app/admin/(routes)/dashboard/overview
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { KPICard } from '@/components/dashboard/kpi-card'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useAdminLive } from '@/lib/hooks/use-admin-live'
import type { DashboardPeriod } from '@/lib/services/dashboard.service'
import {
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Calendar,
  TrendingUp,
  Users,
  Package,
  Boxes,
} from 'lucide-react'

interface KPIs {
  period: DashboardPeriod
  revenue: number
  revenueToday: number
  bookingCount: number
  paidOrderCount: number
  utilization: number
  clientCount: number
  equipmentOut: number
  overdueReturns: number
  lowStockCount: number
  revenueByDay: { date: string; revenue: number }[]
}

const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  today: 'اليوم',
  week: 'هذا الأسبوع',
  month: 'هذا الشهر',
}

function fetchKpis(period: DashboardPeriod): Promise<KPIs> {
  return fetch(`/api/dashboard/kpis?period=${period}`).then((res) => {
    if (!res.ok) throw new Error('Failed to load KPIs')
    return res.json()
  })
}

export default function DashboardOverviewPage() {
  const [period, setPeriod] = useState<DashboardPeriod>('month')
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    try {
      const data = await fetchKpis(period)
      setKpis(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load KPIs')
    }
  }, [period])

  useEffect(() => {
    setLoading(true)
    refetch().finally(() => setLoading(false))

    const timer = window.setInterval(refetch, 30000)
    return () => window.clearInterval(timer)
  }, [refetch])

  useAdminLive((event) => {
    if (event.startsWith('booking.') || event.startsWith('payment.')) refetch()
  })

  if (loading) {
    return (
      <div className="space-y-6" dir="rtl">
        <div>
          <h1 className="text-3xl font-bold">لوحة التحكم · نظرة عامة</h1>
          <p className="mt-1 text-muted-foreground">مؤشرات الأداء والإيرادات</p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (error || !kpis) {
    return (
      <div className="space-y-6" dir="rtl">
        <div>
          <h1 className="text-3xl font-bold">لوحة التحكم · نظرة عامة</h1>
        </div>
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            {error || 'فشل تحميل البيانات'}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">لوحة التحكم · نظرة عامة</h1>
          <p className="mt-1 text-muted-foreground">
            مؤشرات الأداء والإيرادات · {PERIOD_LABELS[kpis.period]}
          </p>
        </div>
        <div className="flex gap-2">
          {(['today', 'week', 'month'] as DashboardPeriod[]).map((p) => (
            <Button
              key={p}
              variant={period === p ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(p)}
            >
              {PERIOD_LABELS[p]}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <KPICard
          title="أرباح اليوم"
          value={`${kpis.revenueToday.toLocaleString('ar-SA')} ر.س`}
          icon={DollarSign}
          description="المدفوعات الناجحة اليوم"
        />
        <KPICard
          title={`الإيرادات (${PERIOD_LABELS[kpis.period]})`}
          value={`${kpis.revenue.toLocaleString('ar-SA')} ر.س`}
          icon={TrendingUp}
          description="إجمالي المدفوعات الناجحة"
        />
        <KPICard
          title="الطلبات المدفوعة"
          value={kpis.paidOrderCount.toString()}
          icon={CheckCircle2}
          description="طلبات مؤكدة/نشطة بدفع ناجح"
        />
        <KPICard
          title="الطلبات الجديدة"
          value={kpis.bookingCount.toString()}
          icon={Calendar}
          description={`حجوزات منشأة · ${PERIOD_LABELS[kpis.period]}`}
        />
        <KPICard
          title="معدات خارج المستودع"
          value={kpis.equipmentOut.toString()}
          icon={Package}
          description="وحدات على حجوزات نشطة"
        />
        <KPICard
          title="إرجاعات متأخرة"
          value={kpis.overdueReturns.toString()}
          icon={AlertTriangle}
          description="حجوزات نشطة تجاوزت تاريخ الإرجاع"
        />
        <KPICard
          title="مخزون منخفض"
          value={kpis.lowStockCount.toString()}
          icon={Boxes}
          description="معدات متاحة ≤ 1 وحدة"
        />
        <KPICard
          title="نسبة الإشغال"
          value={`${kpis.utilization.toFixed(1)}%`}
          icon={TrendingUp}
          description="نسبة المعدات المستأجرة"
        />
        <KPICard
          title={`عملاء جدد (${PERIOD_LABELS[kpis.period]})`}
          value={kpis.clientCount.toString()}
          icon={Users}
          description="عملاء بحجوزات جديدة"
        />
      </div>

      <RevenueChart
        data={kpis.revenueByDay}
        title={`الإيرادات (${kpis.revenueByDay.length} يوم)`}
      />
    </div>
  )
}
