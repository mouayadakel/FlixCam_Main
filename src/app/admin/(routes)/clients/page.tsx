/**
 * @file page.tsx
 * @description Clients page with tabs: Clients, Reviews, Customer Segments
 * @module app/admin/(routes)/clients
 */

'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'

const ClientsListTab = dynamic(
  () => import('./_components/clients-list-tab').then((m) => ({ default: m.default })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)
const ReviewsTab = dynamic(
  () => import('../reviews/page').then((m) => ({ default: m.default })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)
const CustomerSegmentsTab = dynamic(
  () => import('../settings/customer-segments/page').then((m) => ({ default: m.default })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)

const TAB_VALUES = ['clients', 'reviews', 'segments'] as const

export default function ClientsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams?.get('tab') ?? 'clients'
  const [activeTab, setActiveTab] = useState<string>(
    TAB_VALUES.includes(tabParam as (typeof TAB_VALUES)[number]) ? tabParam : 'clients'
  )

  useEffect(() => {
    const t = searchParams?.get('tab') ?? 'clients'
    if (TAB_VALUES.includes(t as (typeof TAB_VALUES)[number])) setActiveTab(t)
  }, [searchParams])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (value === 'clients') {
      params.delete('tab')
    } else {
      params.set('tab', value)
    }
    const query = params.toString()
    router.replace(`/admin/clients${query ? `?${query}` : ''}`, { scroll: false })
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">العملاء</h1>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="clients">العملاء</TabsTrigger>
          <TabsTrigger value="reviews">المراجعات</TabsTrigger>
          <TabsTrigger value="segments">شرائح العملاء</TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="mt-0">
          <ClientsListTab />
        </TabsContent>
        <TabsContent value="reviews" className="mt-0">
          <ReviewsTab />
        </TabsContent>
        <TabsContent value="segments" className="mt-0">
          <CustomerSegmentsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
