/**
 * @file page.tsx
 * @description Warehouse page with tabs: Inventory, Check-in, Check-out
 * @module app/admin/(routes)/ops/warehouse
 */

'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'

const InventoryTab = dynamic(
  () => import('./inventory/page').then((m) => ({ default: m.default })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)
const CheckInTab = dynamic(
  () => import('./check-in/page').then((m) => ({ default: m.default })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)
const CheckOutTab = dynamic(
  () => import('./check-out/page').then((m) => ({ default: m.default })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)

const TAB_VALUES = ['inventory', 'check-in', 'check-out'] as const

export default function WarehousePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams?.get('tab') ?? 'inventory'
  const [activeTab, setActiveTab] = useState<string>(
    TAB_VALUES.includes(tabParam as (typeof TAB_VALUES)[number]) ? tabParam : 'inventory'
  )

  useEffect(() => {
    const t = searchParams?.get('tab') ?? 'inventory'
    if (TAB_VALUES.includes(t as (typeof TAB_VALUES)[number])) setActiveTab(t)
  }, [searchParams])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (value === 'inventory') {
      params.delete('tab')
    } else {
      params.set('tab', value)
    }
    const query = params.toString()
    router.replace(`/admin/ops/warehouse${query ? `?${query}` : ''}`, { scroll: false })
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">المستودع</h1>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="inventory">المخزون</TabsTrigger>
          <TabsTrigger value="check-in">الإرجاع</TabsTrigger>
          <TabsTrigger value="check-out">الإخراج</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="mt-0">
          <InventoryTab />
        </TabsContent>
        <TabsContent value="check-in" className="mt-0">
          <CheckInTab />
        </TabsContent>
        <TabsContent value="check-out" className="mt-0">
          <CheckOutTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
