/**
 * @file dynamic-pricing/page.tsx
 * @description Dynamic Pricing - Manage pricing rules, seasonal rates, and discounts
 * @module app/admin/(routes)/dynamic-pricing
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Percent,
  TrendingUp,
  TrendingDown,
  Clock,
  Tag,
  ToggleLeft,
  ToggleRight,
  Save,
  X,
  AlertCircle,
  BarChart3,
  LineChart as LineChartIcon,
  Download,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils/format.utils'

type RuleType = 'seasonal' | 'duration' | 'early_bird' | 'last_minute' | 'bulk' | 'loyalty'
type AdjustmentType = 'percentage' | 'fixed'
type PricingTab = RuleType | 'all' | 'ai-analysis' | 'demand-forecast'

interface PricingAnalysisRow {
  equipmentId: string
  equipmentName: string
  sku: string
  currentPrice: number
  utilizationRate: number
  suggestedPrice: number
  variance: number
  rationale?: string
}

interface PricingRule {
  id: string
  name: string
  nameAr: string
  description: string
  type: RuleType
  adjustmentType: AdjustmentType
  adjustmentValue: number // positive = increase, negative = discount
  conditions: {
    startDate?: string
    endDate?: string
    minDays?: number
    maxDays?: number
    minItems?: number
    daysBeforeStart?: number
    customerTier?: string
  }
  priority: number
  isActive: boolean
  appliedCount: number
  totalImpact: number // total revenue impact
  createdAt: string
}

const RULE_TYPE_CONFIG: Record<
  RuleType,
  { label: string; icon: any; color: string; description: string }
> = {
  seasonal: {
    label: 'موسمي',
    icon: Calendar,
    color: 'text-orange-600',
    description: 'تعديل الأسعار حسب المواسم والعطلات',
  },
  duration: {
    label: 'مدة الإيجار',
    icon: Clock,
    color: 'text-blue-600',
    description: 'خصومات على الإيجارات الطويلة',
  },
  early_bird: {
    label: 'حجز مبكر',
    icon: TrendingDown,
    color: 'text-green-600',
    description: 'خصم للحجوزات المبكرة',
  },
  last_minute: {
    label: 'اللحظة الأخيرة',
    icon: AlertCircle,
    color: 'text-red-600',
    description: 'تعديل أسعار الحجوزات القريبة',
  },
  bulk: {
    label: 'كمية',
    icon: Tag,
    color: 'text-purple-600',
    description: 'خصومات على الكميات الكبيرة',
  },
  loyalty: {
    label: 'ولاء',
    icon: TrendingUp,
    color: 'text-yellow-600',
    description: 'مكافآت للعملاء المتكررين',
  },
}

export default function DynamicPricingPage() {
  const { toast } = useToast()
  const [rules, setRules] = useState<PricingRule[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<PricingTab>('all')

  // AI Analysis tab
  const [analysisRows, setAnalysisRows] = useState<PricingAnalysisRow[]>([])
  const [analysisLoading, setAnalysisLoading] = useState(false)

  // Demand Forecast tab
  const [equipmentList, setEquipmentList] = useState<{ id: string; model: string; sku: string }[]>(
    []
  )
  const [forecastEquipmentId, setForecastEquipmentId] = useState('')
  const [forecastPeriod, setForecastPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>(
    'month'
  )
  const [forecasts, setForecasts] = useState<
    {
      equipmentId: string
      equipmentName: string
      sku: string
      period: string
      predictedDemand: number
    }[]
  >([])
  const [forecastLoading, setForecastLoading] = useState(false)
  const [forecastChartData, setForecastChartData] = useState<
    { week: number; demand: number; label: string }[]
  >([])

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null)
  const [formData, setFormData] = useState<Partial<PricingRule>>({
    name: '',
    nameAr: '',
    description: '',
    type: 'seasonal',
    adjustmentType: 'percentage',
    adjustmentValue: -10,
    conditions: {},
    priority: 1,
    isActive: true,
  })
  const [saving, setSaving] = useState(false)

  const loadEquipmentForForecast = useCallback(async () => {
    try {
      const res = await fetch('/api/equipment?take=200')
      if (!res.ok) return
      const data = await res.json()
      const list = Array.isArray(data.items) ? data.items : (data.equipment ?? data.data ?? [])
      setEquipmentList(
        list.map((e: { id: string; model?: string; sku?: string }) => ({
          id: e.id,
          model: e.model ?? e.sku ?? e.id,
          sku: e.sku ?? '',
        }))
      )
    } catch {
      setEquipmentList([])
    }
  }, [])

  const apiTypeToPage = (t: string): RuleType => {
    const map: Record<string, RuleType> = {
      SEASONAL: 'seasonal',
      DURATION: 'duration',
      EARLY_BIRD: 'early_bird',
      DEMAND_BASED: 'last_minute',
      BUNDLE: 'bulk',
      CUSTOMER: 'loyalty',
    }
    return map[t] ?? 'seasonal'
  }
  const pageTypeToApi = (t: RuleType): string => {
    const map: Record<RuleType, string> = {
      seasonal: 'SEASONAL',
      duration: 'DURATION',
      early_bird: 'EARLY_BIRD',
      last_minute: 'DEMAND_BASED',
      bulk: 'BUNDLE',
      loyalty: 'CUSTOMER',
    }
    return map[t] ?? 'SEASONAL'
  }

  const loadRules = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/pricing-rules')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      const list = (data.rules ?? []).map((r: any) => {
        const cond = (r.conditions ?? {}) as Record<string, unknown>
        const conditions: PricingRule['conditions'] = {}
        if (cond.dateRange && typeof cond.dateRange === 'object') {
          const dr = cond.dateRange as { start?: string; end?: string }
          if (dr.start) conditions.startDate = dr.start.slice(0, 10)
          if (dr.end) conditions.endDate = dr.end.slice(0, 10)
        }
        if (typeof cond.minDuration === 'number') conditions.minDays = cond.minDuration
        if (typeof cond.maxDuration === 'number') conditions.maxDays = cond.maxDuration
        if (typeof cond.bookDaysAhead === 'number') conditions.daysBeforeStart = cond.bookDaysAhead
        return {
          id: r.id,
          name: r.name,
          nameAr: r.name,
          description: r.description ?? '',
          type: apiTypeToPage(r.ruleType),
          adjustmentType: (r.adjustmentType ?? 'PERCENTAGE').toLowerCase() as AdjustmentType,
          adjustmentValue: Number(r.adjustmentValue),
          conditions,
          priority: r.priority ?? 0,
          isActive: r.isActive ?? true,
          appliedCount: 0,
          totalImpact: 0,
          createdAt: r.createdAt ?? '',
        }
      })
      setRules(list)
    } catch (error) {
      console.error('Failed to load rules:', error)
      toast({
        title: 'خطأ',
        description: 'فشل تحميل قواعد التسعير',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadRules()
  }, [loadRules])

  useEffect(() => {
    if (activeTab === 'demand-forecast' && equipmentList.length === 0) {
      loadEquipmentForForecast()
    }
  }, [activeTab, equipmentList.length, loadEquipmentForForecast])

  const handleCreateRule = () => {
    setEditingRule(null)
    setFormData({
      name: '',
      nameAr: '',
      description: '',
      type: 'seasonal',
      adjustmentType: 'percentage',
      adjustmentValue: -10,
      conditions: {},
      priority: rules.length + 1,
      isActive: true,
    })
    setIsDialogOpen(true)
  }

  const handleEditRule = (rule: PricingRule) => {
    setEditingRule(rule)
    setFormData({
      name: rule.name,
      nameAr: rule.nameAr,
      description: rule.description,
      type: rule.type,
      adjustmentType: rule.adjustmentType,
      adjustmentValue: rule.adjustmentValue,
      conditions: { ...rule.conditions },
      priority: rule.priority,
      isActive: rule.isActive,
    })
    setIsDialogOpen(true)
  }

  const handleToggleRule = async (ruleId: string) => {
    const rule = rules.find((r) => r.id === ruleId)
    if (!rule) return
    try {
      const res = await fetch(`/api/pricing-rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !rule.isActive }),
      })
      if (!res.ok) throw new Error('Failed to update')
      await loadRules()
      toast({ title: 'تم التحديث', description: 'تم تحديث حالة القاعدة' })
    } catch {
      toast({ title: 'خطأ', description: 'فشل تحديث القاعدة', variant: 'destructive' })
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه القاعدة؟')) return
    try {
      const res = await fetch(`/api/pricing-rules/${ruleId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      await loadRules()
      toast({ title: 'تم الحذف', description: 'تم حذف القاعدة بنجاح' })
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل حذف القاعدة',
        variant: 'destructive',
      })
    }
  }

  const handleSaveRule = async () => {
    if (!formData.name) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال اسم القاعدة',
        variant: 'destructive',
      })
      return
    }
    const conditions = formData.conditions ?? {}
    const apiConditions: Record<string, unknown> = {}
    if (conditions.startDate && conditions.endDate) {
      apiConditions.dateRange = { start: conditions.startDate, end: conditions.endDate }
    }
    if (typeof conditions.minDays === 'number') apiConditions.minDuration = conditions.minDays
    if (typeof conditions.maxDays === 'number') apiConditions.maxDuration = conditions.maxDays
    if (typeof conditions.daysBeforeStart === 'number')
      apiConditions.bookDaysAhead = conditions.daysBeforeStart

    setSaving(true)
    try {
      const body = {
        name: formData.name,
        description: formData.description || null,
        ruleType: pageTypeToApi(formData.type ?? 'seasonal'),
        priority: formData.priority ?? 0,
        conditions: apiConditions,
        adjustmentType: (formData.adjustmentType ?? 'percentage').toUpperCase(),
        adjustmentValue: formData.adjustmentValue ?? 0,
        isActive: formData.isActive ?? true,
      }
      const url = editingRule ? `/api/pricing-rules/${editingRule.id}` : '/api/pricing-rules'
      const method = editingRule ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to save')
      }
      await loadRules()
      toast({
        title: 'تم الحفظ',
        description: editingRule ? 'تم تحديث القاعدة بنجاح' : 'تم إنشاء القاعدة بنجاح',
      })
      setIsDialogOpen(false)
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل حفظ القاعدة',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const filteredRules =
    activeTab === 'all'
      ? rules
      : activeTab === 'ai-analysis' || activeTab === 'demand-forecast'
        ? []
        : rules.filter((r) => r.type === activeTab)

  const runAnalysis = async () => {
    setAnalysisLoading(true)
    try {
      const res = await fetch('/api/ai/pricing/bulk-analyze', { method: 'POST' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'فشل التحليل')
      }
      const data = await res.json()
      setAnalysisRows(data.results ?? [])
      toast({ title: 'تم', description: `تم تحليل ${(data.results ?? []).length} معدات` })
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل تحليل التسعير',
        variant: 'destructive',
      })
      setAnalysisRows([])
    } finally {
      setAnalysisLoading(false)
    }
  }

  const runForecast = async () => {
    setForecastLoading(true)
    setForecasts([])
    setForecastChartData([])
    try {
      const res = await fetch('/api/ai/demand-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentId: forecastEquipmentId || undefined,
          period: forecastPeriod,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'فشل التوقع')
      }
      const data = await res.json()
      const list = data.forecasts ?? []
      setForecasts(list)
      // Build 12-week chart: use predictedDemand as total for period, spread across 12 weeks
      const weeks = 12
      const chartData: { week: number; demand: number; label: string }[] = []
      if (list.length > 0) {
        const perWeek =
          list.reduce((s: number, f: { predictedDemand: number }) => s + f.predictedDemand, 0) /
          list.length /
          (forecastPeriod === 'year'
            ? 52
            : forecastPeriod === 'quarter'
              ? 13
              : forecastPeriod === 'month'
                ? 4
                : 1)
        for (let w = 1; w <= weeks; w++) {
          chartData.push({ week: w, demand: Math.round(perWeek * 100) / 100, label: `أسبوع ${w}` })
        }
      }
      setForecastChartData(chartData)
      toast({ title: 'تم', description: `توقع الطلب لـ ${list.length} معدات` })
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل توقع الطلب',
        variant: 'destructive',
      })
    } finally {
      setForecastLoading(false)
    }
  }

  const exportForecastCsv = () => {
    if (forecasts.length === 0) {
      toast({ title: 'تنبيه', description: 'لا توجد بيانات للتصدير', variant: 'destructive' })
      return
    }
    const headers = ['معرف المعدات', 'الاسم', 'SKU', 'الفترة', 'الطلب المتوقع']
    const rows = forecasts.map((f) =>
      [f.equipmentId, f.equipmentName, f.sku, f.period, f.predictedDemand].join(',')
    )
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `demand-forecast-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'تم', description: 'تم تنزيل الملف' })
  }

  const stats = {
    total: rules.length,
    active: rules.filter((r) => r.isActive).length,
    totalApplied: rules.reduce((sum, r) => sum + r.appliedCount, 0),
    netImpact: rules.filter((r) => r.isActive).reduce((sum, r) => sum + r.totalImpact, 0),
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <DollarSign className="h-8 w-8 text-primary" />
            التسعير الديناميكي
          </h1>
          <p className="mt-1 text-muted-foreground">إدارة قواعد التسعير والخصومات التلقائية</p>
        </div>
        <Button onClick={handleCreateRule}>
          <Plus className="ml-2 h-4 w-4" />
          قاعدة جديدة
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">إجمالي القواعد</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              <p className="text-sm text-muted-foreground">قواعد نشطة</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.totalApplied}</p>
              <p className="text-sm text-muted-foreground">مرات التطبيق</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p
                className={`text-2xl font-bold ${stats.netImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {stats.netImpact >= 0 ? '+' : ''}
                {stats.netImpact.toLocaleString('ar-SA')} ر.س
              </p>
              <p className="text-sm text-muted-foreground">صافي التأثير</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules Table */}
      <Card>
        <CardHeader>
          <CardTitle>قواعد التسعير</CardTitle>
          <CardDescription>قم بإدارة قواعد التسعير الديناميكي</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PricingTab)}>
            <TabsList className="mb-4 flex-wrap">
              <TabsTrigger value="all">الكل ({rules.length})</TabsTrigger>
              {Object.entries(RULE_TYPE_CONFIG).map(([type, config]) => (
                <TabsTrigger key={type} value={type}>
                  {config.label} ({rules.filter((r) => r.type === type).length})
                </TabsTrigger>
              ))}
              <TabsTrigger value="ai-analysis">
                <BarChart3 className="ml-1 h-4 w-4" />
                تحليل AI
              </TabsTrigger>
              <TabsTrigger value="demand-forecast">
                <LineChartIcon className="ml-1 h-4 w-4" />
                توقع الطلب
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredRules.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <DollarSign className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p className="text-lg font-medium">لا توجد قواعد</p>
                  <Button className="mt-4" onClick={handleCreateRule}>
                    <Plus className="ml-2 h-4 w-4" />
                    إنشاء قاعدة
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الحالة</TableHead>
                      <TableHead>القاعدة</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>التعديل</TableHead>
                      <TableHead>الشروط</TableHead>
                      <TableHead>التطبيقات</TableHead>
                      <TableHead>التأثير</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRules.map((rule) => {
                      const typeConfig = RULE_TYPE_CONFIG[rule.type]
                      const TypeIcon = typeConfig.icon
                      const isDiscount = rule.adjustmentValue < 0

                      return (
                        <TableRow key={rule.id} className={!rule.isActive ? 'opacity-50' : ''}>
                          <TableCell>
                            <Switch
                              checked={rule.isActive}
                              onCheckedChange={() => handleToggleRule(rule.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{rule.nameAr}</p>
                              <p className="text-xs text-muted-foreground">{rule.name}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <TypeIcon className={`h-4 w-4 ${typeConfig.color}`} />
                              <span>{typeConfig.label}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={isDiscount ? 'default' : 'destructive'}>
                              {isDiscount ? (
                                <TrendingDown className="ml-1 h-3 w-3" />
                              ) : (
                                <TrendingUp className="ml-1 h-3 w-3" />
                              )}
                              {rule.adjustmentValue > 0 ? '+' : ''}
                              {rule.adjustmentValue}
                              {rule.adjustmentType === 'percentage' ? '%' : ' ر.س'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-xs">
                              {rule.conditions.startDate && (
                                <div>من: {formatDate(rule.conditions.startDate)}</div>
                              )}
                              {rule.conditions.endDate && (
                                <div>إلى: {formatDate(rule.conditions.endDate)}</div>
                              )}
                              {rule.conditions.minDays && (
                                <div>الحد الأدنى: {rule.conditions.minDays} يوم</div>
                              )}
                              {rule.conditions.daysBeforeStart && (
                                <div>قبل: {rule.conditions.daysBeforeStart} يوم</div>
                              )}
                              {rule.conditions.minItems && (
                                <div>الحد الأدنى: {rule.conditions.minItems} قطعة</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{rule.appliedCount}</span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={rule.totalImpact >= 0 ? 'text-green-600' : 'text-red-600'}
                            >
                              {rule.totalImpact >= 0 ? '+' : ''}
                              {rule.totalImpact.toLocaleString('ar-SA')} ر.س
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditRule(rule)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => handleDeleteRule(rule.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="ai-analysis" className="mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    تحليل أسعار المعدات بالذكاء الاصطناعي (السعر الحالي، الاستخدام، السعر المقترح)
                  </p>
                  <Button onClick={runAnalysis} disabled={analysisLoading}>
                    {analysisLoading ? 'جاري التحليل...' : 'تشغيل التحليل'}
                  </Button>
                </div>
                {analysisLoading ? (
                  <div className="flex gap-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 flex-1" />
                    ))}
                  </div>
                ) : analysisRows.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <BarChart3 className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p className="text-lg font-medium">لم يُجرَ التحليل بعد</p>
                    <p className="text-sm">
                      اضغط &quot;تشغيل التحليل&quot; لتحليل أسعار جميع المعدات النشطة
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>المعدات</TableHead>
                        <TableHead>السعر الحالي</TableHead>
                        <TableHead>الاستخدام %</TableHead>
                        <TableHead>السعر المقترح</TableHead>
                        <TableHead>الفرق</TableHead>
                        <TableHead>إجراء</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysisRows.map((row) => (
                        <TableRow key={row.equipmentId}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{row.equipmentName}</p>
                              <p className="text-xs text-muted-foreground">{row.sku}</p>
                            </div>
                          </TableCell>
                          <TableCell>{row.currentPrice.toLocaleString('ar-SA')} ر.س</TableCell>
                          <TableCell>{(row.utilizationRate * 100).toFixed(1)}%</TableCell>
                          <TableCell>{row.suggestedPrice.toLocaleString('ar-SA')} ر.س</TableCell>
                          <TableCell
                            className={row.variance >= 0 ? 'text-green-600' : 'text-red-600'}
                          >
                            {row.variance >= 0 ? '+' : ''}
                            {row.variance.toLocaleString('ar-SA')} ر.س
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/equipment/${row.equipmentId}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ dailyPrice: row.suggestedPrice }),
                                  })
                                  if (!res.ok) throw new Error()
                                  toast({ title: 'تم', description: 'تم تطبيق السعر المقترح' })
                                  setAnalysisRows((prev) =>
                                    prev.filter((r) => r.equipmentId !== row.equipmentId)
                                  )
                                } catch {
                                  toast({
                                    title: 'خطأ',
                                    description: 'فشل تطبيق السعر',
                                    variant: 'destructive',
                                  })
                                }
                              }}
                            >
                              تطبيق
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>

            <TabsContent value="demand-forecast" className="mt-0">
              <div className="space-y-4">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="min-w-[200px]">
                    <label className="text-sm font-medium">
                      المعدات (اختياري - اتركه فارغاً للكل)
                    </label>
                    <Select
                      value={forecastEquipmentId || '_all'}
                      onValueChange={(v) => setForecastEquipmentId(v === '_all' ? '' : v)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="جميع المعدات" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">جميع المعدات</SelectItem>
                        {equipmentList.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.model} ({e.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-[120px]">
                    <label className="text-sm font-medium">الفترة</label>
                    <Select
                      value={forecastPeriod}
                      onValueChange={(v) => setForecastPeriod(v as typeof forecastPeriod)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="week">أسبوع</SelectItem>
                        <SelectItem value="month">شهر</SelectItem>
                        <SelectItem value="quarter">ربع سنة</SelectItem>
                        <SelectItem value="year">سنة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={runForecast} disabled={forecastLoading}>
                    {forecastLoading ? 'جاري التوقع...' : 'توقع الطلب'}
                  </Button>
                  {forecasts.length > 0 && (
                    <Button variant="outline" size="sm" onClick={exportForecastCsv}>
                      <Download className="ml-1 h-4 w-4" />
                      تصدير CSV
                    </Button>
                  )}
                </div>
                {forecastChartData.length > 0 && (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={forecastChartData}
                        margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="demand"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {forecasts.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>المعدات</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>الفترة</TableHead>
                        <TableHead className="text-left">الطلب المتوقع</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {forecasts.map((f) => (
                        <TableRow key={f.equipmentId}>
                          <TableCell className="font-medium">{f.equipmentName}</TableCell>
                          <TableCell>{f.sku}</TableCell>
                          <TableCell>{f.period}</TableCell>
                          <TableCell className="text-left">{f.predictedDemand}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'تعديل القاعدة' : 'إنشاء قاعدة جديدة'}</DialogTitle>
            <DialogDescription>قم بتحديد شروط وتعديلات التسعير</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">الاسم (عربي) *</label>
                <Input
                  value={formData.nameAr}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  placeholder="خصم الموسم"
                />
              </div>
              <div>
                <label className="text-sm font-medium">الاسم (إنجليزي) *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Season Discount"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">الوصف</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="وصف القاعدة..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">نوع القاعدة</label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v as RuleType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RULE_TYPE_CONFIG).map(([type, config]) => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          <config.icon className={`h-4 w-4 ${config.color}`} />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">الأولوية</label>
                <Input
                  type="number"
                  min="1"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">نوع التعديل</label>
                <Select
                  value={formData.adjustmentType}
                  onValueChange={(v) =>
                    setFormData({ ...formData, adjustmentType: v as AdjustmentType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">نسبة مئوية (%)</SelectItem>
                    <SelectItem value="fixed">مبلغ ثابت (ر.س)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">قيمة التعديل (سالب = خصم)</label>
                <Input
                  type="number"
                  value={formData.adjustmentValue}
                  onChange={(e) =>
                    setFormData({ ...formData, adjustmentValue: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            {/* Conditional Fields based on type */}
            <div className="space-y-4 rounded-lg border p-4">
              <h4 className="font-medium">الشروط</h4>

              {formData.type === 'seasonal' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">تاريخ البداية</label>
                    <Input
                      type="date"
                      value={formData.conditions?.startDate || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          conditions: { ...formData.conditions, startDate: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">تاريخ النهاية</label>
                    <Input
                      type="date"
                      value={formData.conditions?.endDate || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          conditions: { ...formData.conditions, endDate: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {formData.type === 'duration' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">الحد الأدنى للأيام</label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.conditions?.minDays || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          conditions: { ...formData.conditions, minDays: Number(e.target.value) },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">الحد الأقصى للأيام (اختياري)</label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.conditions?.maxDays || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          conditions: {
                            ...formData.conditions,
                            maxDays: Number(e.target.value) || undefined,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {(formData.type === 'early_bird' || formData.type === 'last_minute') && (
                <div>
                  <label className="text-sm font-medium">عدد الأيام قبل البداية</label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.conditions?.daysBeforeStart || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        conditions: {
                          ...formData.conditions,
                          daysBeforeStart: Number(e.target.value),
                        },
                      })
                    }
                  />
                </div>
              )}

              {formData.type === 'bulk' && (
                <div>
                  <label className="text-sm font-medium">الحد الأدنى للمعدات</label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.conditions?.minItems || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        conditions: { ...formData.conditions, minItems: Number(e.target.value) },
                      })
                    }
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <label className="text-sm">تفعيل القاعدة</label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSaveRule} disabled={saving}>
              <Save className="ml-2 h-4 w-4" />
              {saving ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
