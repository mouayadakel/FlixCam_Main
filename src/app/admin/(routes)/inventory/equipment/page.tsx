/**
 * @file page.tsx
 * @description Equipment page with tabs: All Equipment, Featured, Categories, Brands, Content Review
 * @module app/admin/(routes)/inventory/equipment
 */

'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'

const EquipmentListTab = dynamic(
  () => import('./_components/equipment-list-tab').then((m) => ({ default: m.default })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)
const FeaturedTab = dynamic(
  () => import('../featured/page').then((m) => ({ default: m.default })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)
const CategoriesTab = dynamic(
  () => import('../categories/page').then((m) => ({ default: m.default })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)
const BrandsTab = dynamic(
  () => import('../brands/page').then((m) => ({ default: m.default })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)
const ContentReviewTab = dynamic(
  () => import('../content-review/page').then((m) => ({ default: m.default })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)

const TAB_VALUES = ['all', 'featured', 'categories', 'brands', 'content-review'] as const

export default function EquipmentPage() {
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
    router.replace(`/admin/inventory/equipment${query ? `?${query}` : ''}`, { scroll: false })
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">المعدات</h1>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="all">جميع المعدات</TabsTrigger>
          <TabsTrigger value="featured">المميز</TabsTrigger>
          <TabsTrigger value="categories">الفئات</TabsTrigger>
          <TabsTrigger value="brands">العلامات</TabsTrigger>
          <TabsTrigger value="content-review">مراجعة المحتوى</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          <EquipmentListTab />
        </TabsContent>
        <TabsContent value="featured" className="mt-0">
          <FeaturedTab />
        </TabsContent>
        <TabsContent value="categories" className="mt-0">
          <CategoriesTab />
        </TabsContent>
        <TabsContent value="brands" className="mt-0">
          <BrandsTab />
        </TabsContent>
        <TabsContent value="content-review" className="mt-0">
          <ContentReviewTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
