/**
 * @file ai/page.tsx
 * @description AI features admin page
 * @module app/admin/(routes)/ai
 */

'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RiskAssessmentTab } from './_components/risk-assessment-tab'
import { KitBuilderTab } from './_components/kit-builder-tab'
import { PricingTab } from './_components/pricing-tab'
import { DemandForecastTab } from './_components/demand-forecast-tab'
import { ChatbotTab } from './_components/chatbot-tab'

export default function AIPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Features</h1>
        <p className="text-muted-foreground mt-2">
          Leverage AI for risk assessment, kit building, pricing optimization, demand forecasting, and customer support
        </p>
      </div>

      <Tabs defaultValue="risk-assessment" className="space-y-4">
        <TabsList>
          <TabsTrigger value="risk-assessment">Risk Assessment</TabsTrigger>
          <TabsTrigger value="kit-builder">Kit Builder</TabsTrigger>
          <TabsTrigger value="pricing">Pricing Assistant</TabsTrigger>
          <TabsTrigger value="demand-forecast">Demand Forecast</TabsTrigger>
          <TabsTrigger value="chatbot">Chatbot</TabsTrigger>
        </TabsList>

        <TabsContent value="risk-assessment">
          <RiskAssessmentTab />
        </TabsContent>

        <TabsContent value="kit-builder">
          <KitBuilderTab />
        </TabsContent>

        <TabsContent value="pricing">
          <PricingTab />
        </TabsContent>

        <TabsContent value="demand-forecast">
          <DemandForecastTab />
        </TabsContent>

        <TabsContent value="chatbot">
          <ChatbotTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
