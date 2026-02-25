/**
 * @file page.tsx
 * @description Finance reports page with tabs: Financial Reports, Analytics & Utilization
 * @module app/admin/(routes)/finance/reports
 */

'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'

const FinancialReportsTab = dynamic(
  () => import('./_components/financial-reports-tab').then((m) => ({ default: m.default })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)
const AnalyticsTab = dynamic(
  () => import('../../analytics/page').then((m) => ({ default: m.default })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)

const TAB_VALUES = ['reports', 'analytics'] as const

export default function FinanceReportsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams?.get('tab') ?? 'reports'
  const [activeTab, setActiveTab] = useState<string>(
    TAB_VALUES.includes(tabParam as (typeof TAB_VALUES)[number]) ? tabParam : 'reports'
  )

  useEffect(() => {
    const t = searchParams?.get('tab') ?? 'reports'
    if (TAB_VALUES.includes(t as (typeof TAB_VALUES)[number])) setActiveTab(t)
  }, [searchParams])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (value === 'reports') {
      params.delete('tab')
    } else {
      params.set('tab', value)
    }
    const query = params.toString()
    router.replace(`/admin/finance/reports${query ? `?${query}` : ''}`, { scroll: false })
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">التقارير والتحليلات</h1>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="reports">التقارير المالية</TabsTrigger>
          <TabsTrigger value="analytics">التحليلات والإشغال</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-0">
          <FinancialReportsTab />
        </TabsContent>
        <TabsContent value="analytics" className="mt-0">
          <AnalyticsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
