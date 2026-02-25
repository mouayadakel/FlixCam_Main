/**
 * @file page.tsx
 * @description Admin CMS overview – tabs: FAQ, Policies, Featured, Checkout Form
 */

'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Layout } from 'lucide-react'

const FaqTab = dynamic(
  () => import('./faq/page').then((m) => ({ default: m.default })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)
const PoliciesTab = dynamic(
  () => import('./policies/page').then((m) => ({ default: m.default })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)
const FeaturedTab = dynamic(
  () => import('./featured/page').then((m) => ({ default: m.default })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)
const CheckoutFormTab = dynamic(
  () => import('./checkout-form/page').then((m) => ({ default: m.default })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
)

const TAB_VALUES = ['faq', 'policies', 'featured', 'checkout-form'] as const

export default function CmsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams?.get('tab') ?? 'faq'
  const [activeTab, setActiveTab] = useState<string>(
    TAB_VALUES.includes(tabParam as (typeof TAB_VALUES)[number]) ? tabParam : 'faq'
  )

  useEffect(() => {
    const t = searchParams?.get('tab') ?? 'faq'
    if (TAB_VALUES.includes(t as (typeof TAB_VALUES)[number])) setActiveTab(t)
  }, [searchParams])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (value === 'faq') {
      params.delete('tab')
    } else {
      params.set('tab', value)
    }
    const query = params.toString()
    router.replace(`/admin/cms${query ? `?${query}` : ''}`, { scroll: false })
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Layout className="h-8 w-8" />
          إدارة المحتوى (CMS)
        </h1>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="faq">الأسئلة الشائعة</TabsTrigger>
          <TabsTrigger value="policies">السياسات</TabsTrigger>
          <TabsTrigger value="featured">المحتوى المميز</TabsTrigger>
          <TabsTrigger value="checkout-form">نموذج التسجيل</TabsTrigger>
        </TabsList>

        <TabsContent value="faq" className="mt-0">
          <FaqTab />
        </TabsContent>
        <TabsContent value="policies" className="mt-0">
          <PoliciesTab />
        </TabsContent>
        <TabsContent value="featured" className="mt-0">
          <FeaturedTab />
        </TabsContent>
        <TabsContent value="checkout-form" className="mt-0">
          <CheckoutFormTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
