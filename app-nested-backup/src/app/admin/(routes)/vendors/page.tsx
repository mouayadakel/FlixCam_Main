/**
 * @file page.tsx
 * @description Vendors page with tabs: Vendors List, Payouts
 * @module app/admin/(routes)/vendors
 */

'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'

const VendorsListTab = dynamic(
  () => import('./_components/vendors-list-tab').then((m) => ({ default: m.default })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)
const PayoutsTab = dynamic(
  () => import('./payouts/page').then((m) => ({ default: m.default })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)

const TAB_VALUES = ['list', 'payouts'] as const

export default function VendorsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams?.get('tab') ?? 'list'
  const [activeTab, setActiveTab] = useState<string>(
    TAB_VALUES.includes(tabParam as (typeof TAB_VALUES)[number]) ? tabParam : 'list'
  )

  useEffect(() => {
    const t = searchParams?.get('tab') ?? 'list'
    if (TAB_VALUES.includes(t as (typeof TAB_VALUES)[number])) setActiveTab(t)
  }, [searchParams])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (value === 'list') {
      params.delete('tab')
    } else {
      params.set('tab', value)
    }
    const query = params.toString()
    router.replace(`/admin/vendors${query ? `?${query}` : ''}`, { scroll: false })
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">الموردون</h1>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="list">قائمة الموردين</TabsTrigger>
          <TabsTrigger value="payouts">المدفوعات</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-0">
          <VendorsListTab />
        </TabsContent>
        <TabsContent value="payouts" className="mt-0">
          <PayoutsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
