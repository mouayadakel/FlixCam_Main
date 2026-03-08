/**
 * @file page.tsx
 * @description AI Dashboard — Overview, AI Recommendations, Content Health, Analytics
 * @module app/admin/(routes)/ai-dashboard
 */

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { OverviewTab } from './_components/overview-tab'
import { ContentHealthTab } from './_components/content-health-tab'
import { ContentReviewTab } from './_components/content-review-tab'
import { AnalyticsTab } from './_components/analytics-tab'
import { ImageReviewTab } from './_components/image-review-tab'

const AIRecommendationsTab = dynamic(
  () => import('../ai-recommendations/page').then((m) => ({ default: m.default })),
  { ssr: false, loading: () => <div className="flex h-64 items-center justify-center">جاري التحميل...</div> }
)

const TAB_VALUES = ['overview', 'ai-recommendations', 'content-health', 'content-review', 'image-review', 'analytics'] as const

const TabFallback = () => (
  <div className="space-y-4">
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-64 w-full" />
  </div>
)

export default function AIDashboardPage() {
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
    router.replace(`/admin/ai-dashboard${query ? `?${query}` : ''}`, { scroll: false })
  }

  return (
    <div className="space-y-6" dir="rtl" data-testid="ai-dashboard-page">
      <div>
        <h1 className="text-3xl font-bold" data-testid="ai-dashboard-title">
          لوحة الذكاء الاصطناعي
        </h1>
        <p className="mt-2 text-muted-foreground">
          نظرة عامة على صحة المحتوى، والمسح، والملء التلقائي، وسجل المهام
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-4"
        data-testid="ai-dashboard-tabs"
      >
        <TabsList className="mb-4 flex-wrap" data-testid="ai-dashboard-tablist">
          <TabsTrigger value="overview" data-testid="ai-tab-overview">
            نظرة عامة
          </TabsTrigger>
          <TabsTrigger value="ai-recommendations" data-testid="ai-tab-recommendations">
            توصيات الذكاء الاصطناعي
          </TabsTrigger>
          <TabsTrigger value="content-health" data-testid="ai-tab-content-health">
            صحة المحتوى
          </TabsTrigger>
          <TabsTrigger value="content-review" data-testid="ai-tab-content-review">
            مراجعة المحتوى
          </TabsTrigger>
          <TabsTrigger value="image-review" data-testid="ai-tab-image-review">
            مراجعة الصور
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="ai-tab-analytics">
            التحليلات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" data-testid="ai-tabpanel-overview">
          <Suspense fallback={<TabFallback />}>
            <OverviewTab onSwitchTab={handleTabChange} />
          </Suspense>
        </TabsContent>

        <TabsContent value="ai-recommendations" data-testid="ai-tabpanel-recommendations">
          <AIRecommendationsTab />
        </TabsContent>

        <TabsContent value="content-health" data-testid="ai-tabpanel-content-health">
          <Suspense fallback={<TabFallback />}>
            <ContentHealthTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="content-review" data-testid="ai-tabpanel-content-review">
          <Suspense fallback={<TabFallback />}>
            <ContentReviewTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="image-review" data-testid="ai-tabpanel-image-review">
          <Suspense fallback={<TabFallback />}>
            <ImageReviewTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="analytics" data-testid="ai-tabpanel-analytics">
          <Suspense fallback={<TabFallback />}>
            <AnalyticsTab />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}
