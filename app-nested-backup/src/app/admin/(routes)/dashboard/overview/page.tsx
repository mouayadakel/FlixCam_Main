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
import { useAdminLive } from '@/lib/hooks/use-admin-live'
import { DollarSign, Calendar, TrendingUp, Users } from 'lucide-react'

interface KPIs {
  revenue: number
  bookingCount: number
  utilization: number
  clientCount: number
  revenueByDay: { date: string; revenue: number }[]
}

function fetchKpis(): Promise<KPIs> {
  return fetch('/api/dashboard/kpis').then((res) => {
    if (!res.ok) throw new Error('Failed to load KPIs')
    return res.json()
  })
}

export default function DashboardOverviewPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(() => {
    fetchKpis()
      .then(setKpis)
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    fetchKpis()
      .then(setKpis)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

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
      <div>
        <h1 className="text-3xl font-bold">لوحة التحكم · نظرة عامة</h1>
        <p className="mt-1 text-muted-foreground">مؤشرات الأداء والإيرادات لهذا الشهر</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="الإيرادات (هذا الشهر)"
          value={`${kpis.revenue.toLocaleString('ar-SA')} ر.س`}
          icon={DollarSign}
          description="إجمالي المدفوعات الناجحة"
        />
        <KPICard
          title="الحجوزات (هذا الشهر)"
          value={kpis.bookingCount.toString()}
          icon={Calendar}
          description="عدد الحجوزات الجديدة"
        />
        <KPICard
          title="نسبة الإشغال"
          value={`${kpis.utilization.toFixed(1)}%`}
          icon={TrendingUp}
          description="نسبة المعدات المستأجرة"
        />
        <KPICard
          title="عملاء جدد (هذا الشهر)"
          value={kpis.clientCount.toString()}
          icon={Users}
          description="عملاء بحجوزات جديدة"
        />
      </div>

      <RevenueChart data={kpis.revenueByDay} title="الإيرادات (آخر 7 أيام)" />
    </div>
  )
}
