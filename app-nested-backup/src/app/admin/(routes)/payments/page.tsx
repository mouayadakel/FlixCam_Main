/**
 * @file page.tsx
 * @description Payments page with tabs: Payments, Deposits, Refunds
 * @module app/admin/(routes)/payments
 */

'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'

const PaymentsListTab = dynamic(
  () => import('./_components/payments-list-tab').then((m) => ({ default: m.default })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)
const DepositsTab = dynamic(
  () => import('../finance/deposits/page').then((m) => ({ default: m.default })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)
const RefundsTab = dynamic(
  () => import('../finance/refunds/page').then((m) => ({ default: m.default })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)

const TAB_VALUES = ['payments', 'deposits', 'refunds'] as const

export default function PaymentsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams?.get('tab') ?? 'payments'
  const [activeTab, setActiveTab] = useState<string>(
    TAB_VALUES.includes(tabParam as (typeof TAB_VALUES)[number]) ? tabParam : 'payments'
  )

  useEffect(() => {
    const t = searchParams?.get('tab') ?? 'payments'
    if (TAB_VALUES.includes(t as (typeof TAB_VALUES)[number])) setActiveTab(t)
  }, [searchParams])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (value === 'payments') {
      params.delete('tab')
    } else {
      params.set('tab', value)
    }
    const query = params.toString()
    router.replace(`/admin/payments${query ? `?${query}` : ''}`, { scroll: false })
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">المدفوعات</h1>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="payments">المدفوعات</TabsTrigger>
          <TabsTrigger value="deposits">العهد</TabsTrigger>
          <TabsTrigger value="refunds">المستردات</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-0">
          <PaymentsListTab />
        </TabsContent>
        <TabsContent value="deposits" className="mt-0">
          <DepositsTab />
        </TabsContent>
        <TabsContent value="refunds" className="mt-0">
          <RefundsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
