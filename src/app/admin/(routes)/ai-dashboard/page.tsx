/**
 * @file page.tsx
 * @description AI Dashboard — command center: Overview, Content Health Scanner, Analytics
 * @module app/admin/(routes)/ai-dashboard
 */

'use client'

import { useState, Suspense } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { OverviewTab } from './_components/overview-tab'
import { ContentHealthTab } from './_components/content-health-tab'
import { ContentReviewTab } from './_components/content-review-tab'
import { AnalyticsTab } from './_components/analytics-tab'
import { ImageReviewTab } from './_components/image-review-tab'

const TabFallback = () => (
  <div className="space-y-4">
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-64 w-full" />
  </div>
)

export default function AIDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview')

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
        onValueChange={setActiveTab}
        className="space-y-4"
        data-testid="ai-dashboard-tabs"
      >
        <TabsList className="grid w-full max-w-3xl grid-cols-5" data-testid="ai-dashboard-tablist">
          <TabsTrigger value="overview" data-testid="ai-tab-overview">
            نظرة عامة
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
            <OverviewTab onSwitchTab={setActiveTab} />
          </Suspense>
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
