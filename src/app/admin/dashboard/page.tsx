/**
 * @file page.tsx
 * @description Admin dashboard with tabs: Overview, Revenue, Recent Bookings, Activity, Quick Actions
 * @module app/admin/dashboard
 */

'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'

const OverviewTab = dynamic(
  () =>
    import('../(routes)/dashboard/overview/page').then((m) => ({ default: m.default })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)
const RevenueTab = dynamic(
  () =>
    import('../(routes)/dashboard/revenue/page').then((m) => ({ default: m.default })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)
const RecentBookingsTab = dynamic(
  () =>
    import('../(routes)/dashboard/recent-bookings/page').then((m) => ({ default: m.default })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)
const ActivityTab = dynamic(
  () =>
    import('../(routes)/dashboard/activity/page').then((m) => ({ default: m.default })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)
const QuickActionsTab = dynamic(
  () =>
    import('../(routes)/dashboard/quick-actions/page').then((m) => ({ default: m.default })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)

const TAB_VALUES = ['overview', 'revenue', 'recent-bookings', 'activity', 'quick-actions'] as const

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams?.get('tab') ?? 'overview'
  const [activeTab, setActiveTab] = useState<string>(
    TAB_VALUES.includes(tabParam as (typeof TAB_VALUES)[number]) ? tabParam : 'overview'
  )

  useEffect(() => {
    const t = searchParams?.get('tab') ?? 'overview'
    if (TAB_VALUES.includes(t as (typeof TAB_VALUES)[number])) setActiveTab(t)
  }, [searchParams])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (value === 'overview') {
      params.delete('tab')
    } else {
      params.set('tab', value)
    }
    const query = params.toString()
    router.replace(`/admin/dashboard${query ? `?${query}` : ''}`, { scroll: false })
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">لوحة التحكم</h1>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="revenue">الإيرادات</TabsTrigger>
          <TabsTrigger value="recent-bookings">الحجوزات الأخيرة</TabsTrigger>
          <TabsTrigger value="activity">النشاط</TabsTrigger>
          <TabsTrigger value="quick-actions">إجراءات سريعة</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="revenue" className="mt-0">
          <RevenueTab />
        </TabsContent>
        <TabsContent value="recent-bookings" className="mt-0">
          <RecentBookingsTab />
        </TabsContent>
        <TabsContent value="activity" className="mt-0">
          <ActivityTab />
        </TabsContent>
        <TabsContent value="quick-actions" className="mt-0">
          <QuickActionsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
