/**
 * @file page.tsx
 * @description Bookings page with tabs: All Bookings, Conflicts, Availability & Holds
 * @module app/admin/(routes)/bookings
 */

'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { BookingsListTab } from './_components/bookings-list-tab'

const BookingConflictsPage = dynamic(
  () => import('./conflicts/page').then((m) => ({ default: m.default })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full" />,
  }
)

const HoldsPage = dynamic(
  () => import('../holds/page').then((m) => ({ default: m.default })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full" />,
  }
)

const TAB_VALUES = ['all', 'conflicts', 'holds'] as const

export default function BookingsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams?.get('tab') ?? 'all'
  const [activeTab, setActiveTab] = useState<string>(
    TAB_VALUES.includes(tabParam as (typeof TAB_VALUES)[number]) ? tabParam : 'all'
  )

  useEffect(() => {
    const t = searchParams?.get('tab') ?? 'all'
    if (TAB_VALUES.includes(t as (typeof TAB_VALUES)[number])) setActiveTab(t)
  }, [searchParams])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (value === 'all') {
      params.delete('tab')
    } else {
      params.set('tab', value)
    }
    const query = params.toString()
    router.replace(`/admin/bookings${query ? `?${query}` : ''}`, { scroll: false })
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">الحجوزات</h1>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">جميع الحجوزات</TabsTrigger>
          <TabsTrigger value="conflicts">التعارضات</TabsTrigger>
          <TabsTrigger value="holds">التوفر والحجوزات المؤقتة</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          <BookingsListTab />
        </TabsContent>
        <TabsContent value="conflicts" className="mt-0">
          <BookingConflictsPage />
        </TabsContent>
        <TabsContent value="holds" className="mt-0">
          <HoldsPage />
        </TabsContent>
      </Tabs>
    </div>
  )
}
