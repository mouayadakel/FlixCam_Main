/**
 * @file page.tsx
 * @description Maintenance page with tabs: Maintenance, Damage Claims
 * @module app/admin/(routes)/maintenance
 */

'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'

const MaintenanceListTab = dynamic(
  () => import('./_components/maintenance-list-tab').then((m) => ({ default: m.default })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)
const DamageClaimsTab = dynamic(
  () => import('../damage-claims/page').then((m) => ({ default: m.default })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)

const TAB_VALUES = ['maintenance', 'damage-claims'] as const

export default function MaintenancePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams?.get('tab') ?? 'maintenance'
  const [activeTab, setActiveTab] = useState<string>(
    TAB_VALUES.includes(tabParam as (typeof TAB_VALUES)[number]) ? tabParam : 'maintenance'
  )

  useEffect(() => {
    const t = searchParams?.get('tab') ?? 'maintenance'
    if (TAB_VALUES.includes(t as (typeof TAB_VALUES)[number])) setActiveTab(t)
  }, [searchParams])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (value === 'maintenance') {
      params.delete('tab')
    } else {
      params.set('tab', value)
    }
    const query = params.toString()
    router.replace(`/admin/maintenance${query ? `?${query}` : ''}`, { scroll: false })
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">الصيانة والأضرار</h1>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="maintenance">الصيانة</TabsTrigger>
          <TabsTrigger value="damage-claims">مطالبات الأضرار</TabsTrigger>
        </TabsList>

        <TabsContent value="maintenance" className="mt-0">
          <MaintenanceListTab />
        </TabsContent>
        <TabsContent value="damage-claims" className="mt-0">
          <DamageClaimsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
