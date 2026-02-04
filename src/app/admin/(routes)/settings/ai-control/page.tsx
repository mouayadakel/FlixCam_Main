/**
 * @file page.tsx
 * @description AI Control Dashboard - Manage AI settings, monitor jobs, view analytics
 * @module app/admin/(routes)/settings/ai-control
 */

'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Loader2, Settings, BarChart3, History, Sparkles } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { ProviderSettingsCard } from '@/components/features/import/provider-settings-card'

interface AISettings {
  id: string
  provider: 'openai' | 'gemini'
  apiKey: string
  batchSize: number
  timeout: number
  fallbackStrategy: string
  enabled: boolean
}

interface AIAnalytics {
  summary: {
    totalJobs: number
    completedJobs: number
    failedJobs: number
    successRate: number
    totalItems: number
    processedItems: number
    totalCost: number
  }
  byProvider: Record<string, { jobs: number; items: number; cost: number }>
  dailyStats: Array<{ date: string; jobs: number; items: number; cost: number }>
}

export default function AIControlPage() {
  const [settings, setSettings] = useState<AISettings[]>([])
  const [analytics, setAnalytics] = useState<AIAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('settings')
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true)
      loadSettings()
      loadAnalytics()
    }
  }, [])

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings/ai')
      if (!res.ok) throw new Error('Failed to load settings')
      const data = await res.json()
      setSettings(data.settings || [])
    } catch (error: any) {
      toast({ title: 'Failed to load AI settings', description: error.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const loadAnalytics = async () => {
    try {
      const res = await fetch('/api/admin/ai/analytics?days=30')
      if (!res.ok) throw new Error('Failed to load analytics')
      const data = await res.json()
      setAnalytics(data)
    } catch (error: any) {
      console.error('Failed to load analytics:', error)
    }
  }

  const saveSettings = async (provider: 'openai' | 'gemini', updates: Partial<AISettings>) => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, ...updates }),
      })

      if (!res.ok) throw new Error('Failed to save settings')
      const data = await res.json()
      toast({ title: 'Settings saved successfully' })
      await loadSettings()
    } catch (error: any) {
      toast({ title: 'Failed to save settings', description: error.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const getOrCreateSetting = (provider: 'openai' | 'gemini'): AISettings => {
    let setting = settings.find((s) => s.provider === provider)
    if (!setting) {
      setting = {
        id: '',
        provider,
        apiKey: '',
        batchSize: 50,
        timeout: 30000,
        fallbackStrategy: 'mark_for_review',
        enabled: false,
      }
    }
    return setting
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Control Dashboard</h1>
          </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            Job History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          {(['openai', 'gemini'] as const).map((provider) => {
            const setting = getOrCreateSetting(provider)
            return (
              <ProviderSettingsCard
                key={provider}
                provider={provider}
                setting={setting}
                onSave={saveSettings}
                saving={saving}
              />
            )
          })}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {analytics ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.summary.totalJobs}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.summary.successRate}%</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.summary.processedItems}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${analytics.summary.totalCost.toFixed(2)}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>By Provider</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(analytics.byProvider).map(([provider, stats]) => (
                      <div key={provider} className="flex items-center justify-between p-2 border rounded">
                        <Badge variant="outline">{provider}</Badge>
                        <div className="flex gap-4 text-sm">
                          <span>{stats.jobs} jobs</span>
                          <span>{stats.items} items</span>
                          <span>${stats.cost.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">No analytics data available</div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Recent AI Processing Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-8">
                Job history will be displayed here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
