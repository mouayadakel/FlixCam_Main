/**
 * @file page.tsx
 * @description AI Settings - provider, features, costs, job history
 * @module app/admin/(routes)/settings/ai
 */

'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Loader2,
  Settings,
  BarChart3,
  History,
  DollarSign,
  ToggleLeft,
  CheckCircle,
  ExternalLink,
  Save,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import Link from 'next/link'
import { ProviderSettingsCard } from '@/components/features/import/provider-settings-card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, AlertTriangle } from 'lucide-react'

interface AISettings {
  id: string
  provider: 'openai' | 'gemini'
  apiKey: string
  batchSize: number
  timeout: number
  fallbackStrategy: string
  enabled: boolean
}

interface JobRow {
  id: string
  type: string
  status: string
  triggeredBy: string
  triggeredAt: string
  totalItems: number
  processed: number
  succeeded: number
  failed: number
  costUsd: number
  startedAt: string | null
  completedAt: string | null
}

const TYPE_LABELS: Record<string, string> = {
  FULL_BACKFILL: 'ملء كامل',
  TEXT_BACKFILL: 'نص',
  PHOTO_BACKFILL: 'صور',
  SPEC_BACKFILL: 'مواصفات',
  EMBEDDING_BACKFILL: 'تضمينات',
}

export default function AISettingsPage() {
  const [settings, setSettings] = useState<AISettings[]>([])
  const [jobs, setJobs] = useState<JobRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingProvider, setTestingProvider] = useState<'openai' | 'gemini' | null>(null)
  const [activeTab, setActiveTab] = useState('provider')
  const [monthlyBudget, setMonthlyBudget] = useState('')
  const [dailyBudget, setDailyBudget] = useState('')
  const [alertThreshold, setAlertThreshold] = useState('80')
  const [savingBudget, setSavingBudget] = useState(false)
  const [spendSummary, setSpendSummary] = useState<{
    daily: { spent: number; budget: number | null; remaining: number | null }
    monthly: { spent: number; budget: number | null; remaining: number | null }
  } | null>(null)

  // AI Feature toggles state
  const AI_FEATURES = [
    {
      id: 'ai_backfill',
      flag: 'ai_backfill',
      label: 'ملء المحتوى التلقائي',
      desc: 'نص، SEO، ترجمات',
    },
    { id: 'ai_kit', flag: 'ai_kit_builder', label: 'اقتراح الأطقم', desc: 'منشئ الأطقم' },
    { id: 'ai_pricing', flag: 'ai_pricing', label: 'اقتراح التسعير', desc: 'تحليل الأسعار' },
    { id: 'ai_demand', flag: 'ai_demand_forecast', label: 'توقع الطلب', desc: 'التوقعات' },
    { id: 'ai_risk', flag: 'ai_risk_assessment', label: 'تقييم المخاطر', desc: 'مخاطر الحجز' },
    { id: 'ai_chatbot', flag: 'ai_chatbot', label: 'الدردشة', desc: 'الروبوت المساعد' },
  ] as const
  const [featureStates, setFeatureStates] = useState<Record<string, boolean>>({})
  const [featureFlagIds, setFeatureFlagIds] = useState<Record<string, string>>({})
  const [featuresLoaded, setFeaturesLoaded] = useState(false)
  const [togglingFeature, setTogglingFeature] = useState<string | null>(null)

  useEffect(() => {
    loadSettings()
    loadFeatureFlags()
  }, [])

  useEffect(() => {
    if (activeTab === 'history') loadJobs()
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'costs') loadSpendSummary()
  }, [activeTab])

  const loadFeatureFlags = async () => {
    try {
      const res = await fetch('/api/feature-flags')
      if (!res.ok) return
      const data = await res.json()
      const flags = data.flags ?? []
      const states: Record<string, boolean> = {}
      const ids: Record<string, string> = {}
      for (const f of AI_FEATURES) {
        const match = flags.find((fl: { name: string }) => fl.name === f.flag)
        if (match) {
          states[f.flag] = match.enabled
          ids[f.flag] = match.id
        } else {
          states[f.flag] = true // default enabled if flag doesn't exist
        }
      }
      setFeatureStates(states)
      setFeatureFlagIds(ids)
    } catch {
      /* non-critical */
    }
    setFeaturesLoaded(true)
  }

  const toggleFeature = async (flagName: string, enabled: boolean) => {
    setTogglingFeature(flagName)
    setFeatureStates((prev) => ({ ...prev, [flagName]: enabled }))
    try {
      const flagId = featureFlagIds[flagName]
      if (flagId) {
        const res = await fetch(`/api/feature-flags/${flagId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled }),
        })
        if (!res.ok) throw new Error('فشل التحديث')
      } else {
        // Create new flag
        const res = await fetch('/api/feature-flags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: flagName, enabled, scope: 'ADMIN' }),
        })
        if (!res.ok) throw new Error('فشل الإنشاء')
        const data = await res.json()
        if (data.flag?.id) setFeatureFlagIds((prev) => ({ ...prev, [flagName]: data.flag.id }))
      }
      toast({ title: 'تم', description: enabled ? 'تم تفعيل الميزة' : 'تم إيقاف الميزة' })
    } catch {
      // Revert on error
      setFeatureStates((prev) => ({ ...prev, [flagName]: !enabled }))
      toast({ title: 'خطأ', description: 'فشل تحديث الميزة', variant: 'destructive' })
    } finally {
      setTogglingFeature(null)
    }
  }

  const saveBudget = async () => {
    setSavingBudget(true)
    try {
      // Save to the primary (first) provider — budget is shared
      const provider = settings[0]?.provider ?? 'openai'
      const res = await fetch('/api/admin/settings/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          dailyBudgetUsd: dailyBudget ? parseFloat(dailyBudget) : null,
          monthlyBudgetUsd: monthlyBudget ? parseFloat(monthlyBudget) : null,
        }),
      })
      if (!res.ok) throw new Error('فشل الحفظ')
      toast({ title: 'تم', description: 'تم حفظ حدود الميزانية' })
      loadSpendSummary()
    } catch {
      toast({ title: 'خطأ', description: 'فشل حفظ الميزانية', variant: 'destructive' })
    } finally {
      setSavingBudget(false)
    }
  }

  const loadSpendSummary = async () => {
    try {
      const res = await fetch('/api/admin/ai/spend-summary')
      if (res.ok) {
        const data = await res.json()
        setSpendSummary(data)
      }
    } catch {
      setSpendSummary(null)
    }
  }

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings/ai')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setSettings(data.settings || [])
    } catch (e) {
      toast({ title: 'فشل تحميل الإعدادات', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const loadJobs = async () => {
    try {
      const res = await fetch('/api/admin/ai/jobs?limit=30')
      if (!res.ok) return
      const data = await res.json()
      setJobs(data.jobs ?? [])
    } catch {
      setJobs([])
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
      if (!res.ok) throw new Error('Failed to save')
      toast({ title: 'تم الحفظ' })
      await loadSettings()
    } catch {
      toast({ title: 'فشل الحفظ', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async (provider: 'openai' | 'gemini') => {
    setTestingProvider(provider)
    try {
      const res = await fetch('/api/admin/ai/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })
      const data = await res.json()
      if (data.ok) {
        toast({ title: data.message ?? 'تم الاتصال بنجاح' })
      } else {
        toast({ title: data.error ?? 'فشل الاتصال', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ في الاتصال', variant: 'destructive' })
    } finally {
      setTestingProvider(null)
    }
  }

  const getOrCreateSetting = (provider: 'openai' | 'gemini'): AISettings => {
    const s = settings.find((x) => x.provider === provider)
    return (
      s ?? {
        id: '',
        provider,
        apiKey: '',
        batchSize: 50,
        timeout: 30000,
        fallbackStrategy: 'mark_for_review',
        enabled: false,
      }
    )
  }

  const chartData = (() => {
    const byDate: Record<string, number> = {}
    jobs.forEach((j) => {
      if (j.costUsd > 0) {
        const d = new Date(j.triggeredAt).toISOString().slice(0, 10)
        byDate[d] = (byDate[d] ?? 0) + j.costUsd
      }
    })
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, cost]) => ({ date, cost, تكلفة: cost }))
  })()

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold">إعدادات الذكاء الاصطناعي</h1>
        <p className="mt-1 text-muted-foreground">المزود، الميزات، التكاليف، وسجل المهام</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="provider">
            <Settings className="ms-2 h-4 w-4" />
            المزود
          </TabsTrigger>
          <TabsTrigger value="features">
            <ToggleLeft className="ms-2 h-4 w-4" />
            الميزات
          </TabsTrigger>
          <TabsTrigger value="costs">
            <DollarSign className="ms-2 h-4 w-4" />
            التكاليف
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="ms-2 h-4 w-4" />
            السجل
          </TabsTrigger>
        </TabsList>

        <TabsContent value="provider" className="space-y-4">
          {(['openai', 'gemini'] as const).map((provider) => (
            <div key={provider} className="flex flex-col gap-2">
              <div className="flex items-center justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testConnection(provider)}
                  disabled={testingProvider !== null}
                >
                  {testingProvider === provider ? (
                    <Loader2 className="ms-1 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="ms-1 h-4 w-4" />
                  )}
                  اختبار الاتصال
                </Button>
              </div>
              <ProviderSettingsCard
                provider={provider}
                setting={getOrCreateSetting(provider)}
                onSave={saveSettings}
                saving={saving}
              />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>تفعيل الميزات</CardTitle>
              <CardDescription>
                تشغيل أو إيقاف ميزات الذكاء الاصطناعي. التغييرات تُحفظ فوراً.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {AI_FEATURES.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div>
                      <p className="font-medium">{f.label}</p>
                      <p className="text-sm text-muted-foreground">{f.desc}</p>
                    </div>
                    <Switch
                      checked={featureStates[f.flag] ?? true}
                      onCheckedChange={(v) => toggleFeature(f.flag, v)}
                      disabled={!featuresLoaded || togglingFeature === f.flag}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          {spendSummary &&
            (() => {
              const thresh = Number(alertThreshold) || 80
              const dailyOver =
                spendSummary.daily.remaining != null && spendSummary.daily.remaining <= 0
              const monthlyOver =
                spendSummary.monthly.remaining != null && spendSummary.monthly.remaining <= 0
              const dailyNear =
                spendSummary.daily.budget != null &&
                spendSummary.daily.remaining != null &&
                spendSummary.daily.remaining <=
                  (spendSummary.daily.budget * (100 - thresh)) / 100 &&
                !dailyOver
              const monthlyNear =
                spendSummary.monthly.budget != null &&
                spendSummary.monthly.remaining != null &&
                spendSummary.monthly.remaining <=
                  (spendSummary.monthly.budget * (100 - thresh)) / 100 &&
                !monthlyOver
              return dailyOver || monthlyOver || dailyNear || monthlyNear ? (
                <Alert variant={dailyOver || monthlyOver ? 'destructive' : 'default'}>
                  {dailyOver || monthlyOver ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <AlertTitle>
                    {dailyOver || monthlyOver ? 'تجاوز حد الإنفاق' : 'اقتراب من حد الإنفاق'}
                  </AlertTitle>
                  <AlertDescription>
                    {dailyOver &&
                      `إنفاقك اليومي ($${spendSummary.daily.spent.toFixed(2)}) تجاوز الحد.`}
                    {monthlyOver &&
                      ` إنفاقك الشهري ($${spendSummary.monthly.spent.toFixed(2)}) تجاوز الحد.`}
                    {!dailyOver &&
                      !monthlyOver &&
                      `أنت عند ${thresh}% أو أكثر من حد الإنفاق اليومي أو الشهري.`}
                  </AlertDescription>
                </Alert>
              ) : null
            })()}
          <Card>
            <CardHeader>
              <CardTitle>التكاليف والحدود</CardTitle>
              <CardDescription>حد الإنفاق الشهري وتنبيه عند تجاوز نسبة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {spendSummary && (
                <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">إنفاق يومي</p>
                    <p className="text-2xl font-bold">${spendSummary.daily.spent.toFixed(2)}</p>
                    {spendSummary.daily.budget != null && (
                      <p className="text-xs text-muted-foreground">
                        الحد: ${spendSummary.daily.budget} — المتبقي: $
                        {(spendSummary.daily.remaining ?? 0).toFixed(2)}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">إنفاق شهري</p>
                    <p className="text-2xl font-bold">${spendSummary.monthly.spent.toFixed(2)}</p>
                    {spendSummary.monthly.budget != null && (
                      <p className="text-xs text-muted-foreground">
                        الحد: ${spendSummary.monthly.budget} — المتبقي: $
                        {(spendSummary.monthly.remaining ?? 0).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>الحد اليومي ($)</Label>
                  <Input
                    type="number"
                    placeholder="مثال: 20"
                    value={dailyBudget}
                    onChange={(e) => setDailyBudget(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>الحد الشهري ($)</Label>
                  <Input
                    type="number"
                    placeholder="مثال: 500"
                    value={monthlyBudget}
                    onChange={(e) => setMonthlyBudget(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>تنبيه عند % من الحد</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={alertThreshold}
                    onChange={(e) => setAlertThreshold(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={saveBudget} disabled={savingBudget} className="w-full">
                    {savingBudget ? (
                      <Loader2 className="ms-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="ms-2 h-4 w-4" />
                    )}
                    حفظ الحدود
                  </Button>
                </div>
              </div>
              {chartData.length > 0 && (
                <div className="h-64">
                  <p className="mb-2 text-sm font-medium">إنفاق يومي (من سجل المهام)</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="تكلفة"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>سجل المهام</CardTitle>
              <CardDescription>
                عرض تفصيلي لسجل المهام والتحليلات متاح في لوحة الذكاء الاصطناعي
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/admin/ai-dashboard">
                <Button variant="outline" className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  فتح لوحة الذكاء الاصطناعي (التحليلات)
                </Button>
              </Link>
              {jobs.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">لا توجد مهام بعد</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>النوع</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>المعالجة</TableHead>
                      <TableHead>التكلفة $</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((j) => (
                      <TableRow key={j.id}>
                        <TableCell>{TYPE_LABELS[j.type] ?? j.type}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              j.status === 'COMPLETED'
                                ? 'default'
                                : j.status === 'FAILED'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {j.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(j.triggeredAt).toLocaleString('ar-SA')}</TableCell>
                        <TableCell>
                          {j.processed} / {j.totalItems}
                          {j.succeeded != null || j.failed != null
                            ? ` (✓${j.succeeded ?? 0} ✗${j.failed ?? 0})`
                            : ''}
                        </TableCell>
                        <TableCell>{(j.costUsd ?? 0).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
