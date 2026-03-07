/**
 * @file overview-tab.tsx
 * @description Quality score dashboard: gauge, donut gap breakdown, trend chart, bottom-20 table, goal tracking
 * @module app/admin/(routes)/ai-dashboard/_components
 */

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CircularProgress } from '@/components/ui/circular-progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  Package,
  CheckCircle,
  AlertCircle,
  Activity,
  Target,
  Sparkles,
  Loader2,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  FileDown,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ToastAction } from '@/components/ui/toast'
import { format } from 'date-fns'
import { arSA } from 'date-fns/locale'
import {
  GAP_LABELS,
  GAP_COLORS,
  QUALITY_TARGET_STORAGE_KEY,
  getMilestone,
  notifyJobComplete,
  readLocalStorage,
  writeLocalStorage,
  exportQualityReportPDF,
  type JobProgress,
} from '../_utils/ai-dashboard.utils'
import { useJobStream } from '@/hooks/use-job-stream'

interface SummaryData {
  totalProducts: number
  avgQualityScore: number
  distribution: { excellent: number; good: number; fair: number; poor: number }
  gaps: {
    missingTranslations: number
    missingSeo: number
    missingDescription: number
    missingPhotos: number
    missingSpecs: number
  }
  scannedAt: string
}

interface TrendPoint {
  date: string
  avgScore: number
  totalProducts: number
}

interface BottomProduct {
  id: string
  name: string
  score: number
  gap?: string
  missingFields?: string[]
  revenueWeight?: number
  priorityScore?: number
}

interface SpendSummary {
  daily: { spent: number; budget: number | null; remaining: number | null }
  monthly: { spent: number; budget: number | null; remaining: number | null }
}

interface OverviewTabProps {
  onSwitchTab: (tab: string) => void
}

function SyncCatalogButton({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast()
  const [syncing, setSyncing] = useState(false)
  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/admin/ai/sync-catalog', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'خطأ', description: data.error ?? 'فشل المزامنة', variant: 'destructive' })
        return
      }
      const synced = data.synced ?? 0
      toast({ title: 'تم', description: `تم إنشاء ${synced} منتج من المعدات. جاري التحديث...` })
      onSuccess()
    } catch {
      toast({ title: 'خطأ', description: 'فشل طلب المزامنة', variant: 'destructive' })
    } finally {
      setSyncing(false)
    }
  }
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleSync}
      disabled={syncing}
      className="mt-2"
    >
      {syncing ? <Loader2 className="ms-2 h-4 w-4 animate-spin" /> : null}
      إنشاء منتجات من المعدات
    </Button>
  )
}

export function OverviewTab({ onSwitchTab }: OverviewTabProps) {
  const { toast } = useToast()
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [bottomProducts, setBottomProducts] = useState<BottomProduct[]>([])
  const [targetScore, setTargetScore] = useState(80)
  const [loading, setLoading] = useState(true)
  const [fillingId, setFillingId] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const [showFillAllDialog, setShowFillAllDialog] = useState(false)
  const [isFillAllRunning, setIsFillAllRunning] = useState(false)
  const [fillAllProgress, setFillAllProgress] = useState<JobProgress | null>(null)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [avgCostPerProduct, setAvgCostPerProduct] = useState<number | null>(null)
  const [spendSummary, setSpendSummary] = useState<SpendSummary | null>(null)
  const [revenueWeighted, setRevenueWeighted] = useState(false)
  const [fillTypes, setFillTypes] = useState<Array<'text' | 'photo' | 'spec'>>(['text'])
  const [minQualityScore, setMinQualityScore] = useState<number>(0)
  const [sortBottomByRevenue, setSortBottomByRevenue] = useState(false)
  const [fillEstimateCount, setFillEstimateCount] = useState<number | null>(null)
  const [fillEstimateLoading, setFillEstimateLoading] = useState(false)
  const fillAllProgressCardRef = useRef<HTMLDivElement>(null)

  const { data: jobStreamData } = useJobStream(activeJobId, {
    onComplete: (d) => {
      setIsFillAllRunning(false)
      setFillAllProgress(null)
      setActiveJobId(null)
      fetchAll()
      if (d.status === 'COMPLETED') {
        toast({ title: 'تم', description: `اكتمل ملء ${d.processed} منتج بنجاح` })
        notifyJobComplete(d.processed)
      } else {
        toast({
          title: 'فشل',
          description: 'فشلت بعض العناصر أثناء المعالجة',
          variant: 'destructive',
        })
      }
    },
    onError: () => {
      setIsFillAllRunning(false)
      setFillAllProgress(null)
      setActiveJobId(null)
    },
  })

  useEffect(() => {
    if (jobStreamData) {
      const status =
        jobStreamData.status === 'COMPLETED'
          ? 'done'
          : jobStreamData.status === 'FAILED'
            ? 'failed'
            : 'running'
      setFillAllProgress({
        status,
        progress: jobStreamData.progress,
        processed: jobStreamData.processed,
        total: jobStreamData.total,
        errors: jobStreamData.failed,
      })
    }
  }, [jobStreamData])

  // SSR-safe localStorage read on mount
  useEffect(() => {
    const stored = readLocalStorage(QUALITY_TARGET_STORAGE_KEY, '80')
    setTargetScore(Math.max(0, Math.min(100, Number(stored) || 80)))
  }, [])

  // On mount: sync with any already-running backfill so "Fill All" state and progress are correct
  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/ai/backfill/active')
      .then((res) => (res.ok ? res.json() : { activeJob: null }))
      .then((data) => {
        if (cancelled || !data?.activeJob?.id) return
        setActiveJobId(data.activeJob.id)
        setIsFillAllRunning(true)
        setFillAllProgress({
          status: 'running',
          progress: data.activeJob.progress ?? 0,
          processed: data.activeJob.processed ?? 0,
          total: data.activeJob.total ?? 0,
          errors: data.activeJob.failed ?? 0,
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [summaryRes, trendRes, productsRes, spendRes] = await Promise.all([
        fetch('/api/admin/ai/quality/summary'),
        fetch('/api/admin/ai/quality/trend?days=84'),
        fetch(
          `/api/admin/ai/quality/products?sort=${sortBottomByRevenue ? 'revenue' : 'score'}&order=${sortBottomByRevenue ? 'desc' : 'asc'}&limit=20`
        ),
        fetch('/api/admin/ai/spend-summary'),
      ])
      if (summaryRes.ok) {
        const d = await summaryRes.json()
        const data = d.data ?? d
        setSummary({
          totalProducts: data.totalProducts ?? 0,
          avgQualityScore: data.avgQualityScore ?? 0,
          distribution: data.distribution ?? { excellent: 0, good: 0, fair: 0, poor: 0 },
          gaps: data.gaps ?? {
            missingTranslations: 0,
            missingSeo: 0,
            missingDescription: 0,
            missingPhotos: 0,
            missingSpecs: 0,
          },
          scannedAt: data.scannedAt ?? '',
        })
      }
      if (trendRes.ok) {
        const t = await trendRes.json()
        const arr = (t.data ?? t) as Array<{
          date: string
          avgScore: number
          totalProducts: number
        }>
        setTrend(Array.isArray(arr) ? arr : [])
      }
      if (productsRes.ok) {
        const p = await productsRes.json()
        const list = (p.data?.products ?? p.products ?? []) as BottomProduct[]
        setBottomProducts(Array.isArray(list) ? list : [])
      }
      if (spendRes.ok) {
        const s = await spendRes.json()
        setSpendSummary(s)
      }
      setLastUpdated(new Date().toLocaleTimeString('ar-SA'))
    } catch {
      toast({ title: 'خطأ', description: 'فشل تحميل بيانات الجودة', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast, sortBottomByRevenue])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const isOverBudget =
    spendSummary &&
    ((spendSummary.daily.budget != null &&
      spendSummary.daily.spent >= spendSummary.daily.budget * 0.95) ||
      (spendSummary.monthly.budget != null &&
        spendSummary.monthly.spent >= spendSummary.monthly.budget * 0.95))

  useEffect(() => {
    async function fetchCost() {
      try {
        const res = await fetch('/api/admin/ai/jobs?limit=50')
        if (!res.ok) return
        const data = await res.json()
        const jobs = data.jobs ?? []
        let totalCost = 0
        let totalProcessed = 0
        for (const j of jobs) {
          if (j.costUsd && j.costUsd > 0 && j.processed > 0) {
            totalCost += j.costUsd
            totalProcessed += j.processed
          }
        }
        if (totalProcessed > 0) setAvgCostPerProduct(totalCost / totalProcessed)
      } catch {
        /* non-critical */
      }
    }
    fetchCost()
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await fetchAll()
      toast({ title: 'تم', description: 'تم تحديث بيانات الجودة' })
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleFillAllConfirm = useCallback(async () => {
    setShowFillAllDialog(false)
    setIsFillAllRunning(true)
    try {
      const res = await fetch('/api/admin/ai/backfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fillAll: true,
          revenueWeighted,
          types: fillTypes.length > 0 ? fillTypes : ['text'],
          minQualityScore: minQualityScore > 0 ? minQualityScore : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 409) {
        let jobId = data.activeJobId
        if (!jobId) {
          try {
            const activeRes = await fetch('/api/admin/ai/backfill/active')
            const activeData = await activeRes.json().catch(() => ({}))
            jobId = activeData?.activeJob?.id
          } catch {
            /* ignore */
          }
        }
        if (jobId) {
          setActiveJobId(jobId)
          setFillAllProgress(
            (prev) => prev ?? { status: 'running', progress: 0, processed: 0, total: 0, errors: 0 }
          )
        }
        const runCancelAndRetry = async () => {
          const cancelRes = await fetch('/api/admin/ai/backfill/cancel', { method: 'POST' })
          const cancelData = await cancelRes.json().catch(() => ({}))
          if (!cancelData.cancelled) {
            toast({
              title: 'تنبيه',
              description: cancelData.message ?? 'لا توجد مهمة قيد التشغيل أو فشل الإلغاء',
              variant: 'destructive',
            })
            return
          }
          setActiveJobId(null)
          setFillAllProgress(null)
          const retryRes = await fetch('/api/admin/ai/backfill', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fillAll: true,
              revenueWeighted,
              types: fillTypes.length > 0 ? fillTypes : ['text'],
              minQualityScore: minQualityScore > 0 ? minQualityScore : undefined,
            }),
          })
          const retryData = await retryRes.json().catch(() => ({}))
          if (retryRes.ok && retryData.jobId) {
            setActiveJobId(retryData.jobId)
            setFillAllProgress({
              status: 'running',
              progress: 0,
              processed: 0,
              total: retryData.queued ?? 0,
              errors: 0,
            })
            toast({
              title: 'تم',
              description: `تم إلغاء المهمة السابقة وبدء مهمة جديدة (${retryData.queued ?? 0} منتج)`,
            })
          } else if (retryRes.status === 409) {
            toast({
              title: 'مهمة قيد التشغيل',
              description: 'ما زالت هناك مهمة قيد التشغيل. انتظر قليلاً ثم حاول مرة أخرى.',
              variant: 'destructive',
            })
          } else {
            toast({
              title: 'خطأ',
              description: retryData.error ?? 'فشل بدء المهمة الجديدة',
              variant: 'destructive',
            })
          }
        }
        toast({
          title: 'مهمة قيد التشغيل',
          description:
            'مهمة ذكاء اصطناعي قيد التشغيل بالفعل. انتظر حتى تنتهي أو ألغِها وابدأ مهمة جديدة.',
          action: (
            <div className="flex flex-wrap gap-1.5">
              <ToastAction
                altText="عرض المهمة الحالية"
                onClick={() => {
                  setTimeout(() => {
                    fillAllProgressCardRef.current?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'center',
                    })
                  }, 100)
                }}
              >
                عرض المهمة الحالية
              </ToastAction>
              <ToastAction altText="إلغاء وبدء جديدة" onClick={() => runCancelAndRetry()}>
                إلغاء وبدء جديدة
              </ToastAction>
            </div>
          ),
        })
        return
      }
      if (!res.ok) {
        throw new Error(data.error ?? 'فشل البدء')
      }
      if (data.queued === 0 && data.message) {
        toast({ title: 'تم', description: data.message })
        setIsFillAllRunning(false)
      } else {
        setFillAllProgress({
          status: 'running',
          progress: 0,
          processed: 0,
          total: data.queued ?? 0,
          errors: 0,
        })
        toast({ title: 'تم', description: `تم إدراج ${data.queued} منتج في قائمة المعالجة` })
        if (data.jobId) setActiveJobId(data.jobId)
      }
    } catch (e) {
      setIsFillAllRunning(false)
      const message = e instanceof Error ? e.message : 'فشل تشغيل الملء'
      const isAlreadyRunning = typeof message === 'string' && message.includes('قيد التشغيل')
      toast({
        title: 'خطأ',
        description: message,
        variant: 'destructive',
        ...(isAlreadyRunning && {
          action: (
            <ToastAction altText="عرض سجل المهام" onClick={() => onSwitchTab('analytics')}>
              عرض المهمة الحالية
            </ToastAction>
          ),
        }),
      })
    }
  }, [toast, onSwitchTab, revenueWeighted, fillTypes, minQualityScore])

  const handleFillNow = async (productId: string) => {
    setFillingId(productId)
    try {
      const res = await fetch('/api/admin/ai/backfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: [productId] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل تشغيل الملء')
      toast({
        title: 'تمت إضافة المهمة',
        description: data.jobId ? `رقم المهمة: ${data.jobId}` : 'سيتم معالجة المنتج قريباً',
      })
      setBottomProducts((prev) => prev.filter((p) => p.id !== productId))
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل تشغيل الملء',
        variant: 'destructive',
      })
    } finally {
      setFillingId(null)
    }
  }

  const handleTargetChange = (value: number) => {
    const clamped = Math.max(0, Math.min(100, value))
    setTargetScore(clamped)
    writeLocalStorage(QUALITY_TARGET_STORAGE_KEY, String(clamped))
  }

  // Scoped fill estimate: when dialog is open, fetch count of products that would be filled
  useEffect(() => {
    if (!showFillAllDialog) {
      setFillEstimateCount(null)
      return
    }
    let cancelled = false
    setFillEstimateLoading(true)
    const params = new URLSearchParams()
    params.set('revenueWeighted', String(revenueWeighted))
    if (minQualityScore > 0) params.set('minQualityScore', String(minQualityScore))
    fetch(`/api/admin/ai/backfill/estimate?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : { count: null }))
      .then((data) => {
        if (!cancelled && typeof data?.count === 'number') setFillEstimateCount(data.count)
      })
      .catch(() => {
        if (!cancelled) setFillEstimateCount(null)
      })
      .finally(() => {
        if (!cancelled) setFillEstimateLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [showFillAllDialog, revenueWeighted, minQualityScore])

  const fillCount = fillEstimateCount ?? summary?.totalProducts ?? 0
  const scopedEstimatedCost =
    avgCostPerProduct != null && fillCount > 0 ? (fillCount * avgCostPerProduct).toFixed(2) : null

  const donutData = summary?.gaps
    ? Object.entries(summary.gaps)
        .filter(([, v]) => Number(v) > 0)
        .map(([key, value]) => ({ name: GAP_LABELS[key] ?? key, value: Number(value) }))
    : []

  const trendChartData = trend.map((t) => ({
    date: format(new Date(t.date), 'dd/MM', { locale: arSA }),
    avgScore: t.avgScore,
  }))

  const productsToReachTarget = summary
    ? (() => {
        const { good, fair, poor } = summary.distribution
        if (targetScore >= 80) return good + fair + poor
        if (targetScore >= 60) return fair + poor
        if (targetScore >= 40) return poor
        return 0
      })()
    : 0

  const milestone = getMilestone(summary?.avgQualityScore ?? 0)
  const pointsNeeded = targetScore - (summary?.avgQualityScore ?? 0)

  const getProductGapBadges = (product: BottomProduct) => {
    if (product.missingFields && product.missingFields.length > 0) return product.missingFields
    if (product.gap) return product.gap.split(',').filter(Boolean)
    return []
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Empty catalog notice */}
      {(summary?.totalProducts ?? 0) === 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">لا توجد منتجات في الكتالوج</AlertTitle>
          <AlertDescription className="space-y-2 text-amber-700">
            <span className="block">
              لوحة الذكاء الاصطناعي تعرض بيانات من جدول <strong>Product</strong> (المنتجات). إذا كان
              لديك معدات (Equipment) فقط، انقر أدناه لإنشاء سجلات المنتجات منها ثم حدّث الصفحة.
            </span>
            <SyncCatalogButton onSuccess={fetchAll} />
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards — 2-col on mobile, 4-col on desktop */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المنتجات</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalProducts ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">محتوى كامل (80+)</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.distribution?.excellent ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">تحتاج تحسين</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(summary?.distribution?.good ?? 0) +
                (summary?.distribution?.fair ?? 0) +
                (summary?.distribution?.poor ?? 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط الجودة</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CircularProgress value={summary?.avgQualityScore ?? 0} size={48} strokeWidth={4} />
              <span className="text-2xl font-bold">{summary?.avgQualityScore ?? 0}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget status bar */}
      {spendSummary &&
        (spendSummary.monthly.budget != null || spendSummary.daily.budget != null) && (
          <Card className="border-muted">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">ميزانية الذكاء الاصطناعي</CardTitle>
              <CardDescription>
                شهري: ${spendSummary.monthly.spent.toFixed(2)}
                {spendSummary.monthly.budget != null &&
                  ` / $${spendSummary.monthly.budget.toFixed(2)}`}
                {' • '}
                يومي: ${spendSummary.daily.spent.toFixed(2)}
                {spendSummary.daily.budget != null && ` / $${spendSummary.daily.budget.toFixed(2)}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {spendSummary.monthly.budget != null && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>الشهري</span>
                    <span>
                      {Math.round((spendSummary.monthly.spent / spendSummary.monthly.budget) * 100)}
                      %
                    </span>
                  </div>
                  <Progress
                    value={Math.min(
                      100,
                      (spendSummary.monthly.spent / spendSummary.monthly.budget) * 100
                    )}
                    className={
                      spendSummary.monthly.remaining != null && spendSummary.monthly.remaining <= 0
                        ? '[&>div]:bg-red-500'
                        : spendSummary.monthly.remaining != null &&
                            spendSummary.monthly.remaining < spendSummary.monthly.budget * 0.2
                          ? '[&>div]:bg-amber-500'
                          : undefined
                    }
                  />
                </div>
              )}
              {isOverBudget && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    تم استنفاد الميزانية. لا يمكن تشغيل ملء الكل حتى إعادة تعيين الميزانية أو زيادة
                    الحد.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

      {/* Fill-all job progress */}
      {isFillAllRunning && fillAllProgress && (
        <Card ref={fillAllProgressCardRef} className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="font-medium">جاري الملء بالذكاء الاصطناعي</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>
                  {fillAllProgress.processed} / {fillAllProgress.total} منتج (
                  {fillAllProgress.progress}%)
                </span>
              </div>
              <Progress value={fillAllProgress.progress} />
              <p className="text-xs text-muted-foreground">يرجى الانتظار حتى تكتمل العملية...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gauge + Donut — stack on mobile */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>مقياس الجودة الإجمالي</CardTitle>
            <CardDescription>
              متوسط نقاط المحتوى عبر الكتالوج. الصيغة: ترجمات (25) + سيو (20) + وصف قصير (10) + وصف
              طويل ≥100 حرف (15) + 4+ صور (30) = 100. إذا كانت النتيجة ~63 فغالباً ينقص وصف طويل
              كافٍ أو صور كافية.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <CircularProgress value={summary?.avgQualityScore ?? 0} size={160} strokeWidth={8} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>توزيع الفجوات</CardTitle>
            <CardDescription>عدد المنتجات حسب نوع النقص</CardDescription>
          </CardHeader>
          <CardContent>
            {donutData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {donutData.map((_, i) => (
                      <Cell key={i} fill={GAP_COLORS[i % GAP_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [v, 'منتج']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-muted-foreground">لا توجد فجوات مسجلة</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trend chart */}
      {trendChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>اتجاه الجودة (آخر 12 أسبوعاً)</CardTitle>
            <CardDescription>متوسط النقاط حسب التاريخ</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => [`${value}%`, 'متوسط النقاط']} />
                <Line
                  type="monotone"
                  dataKey="avgScore"
                  stroke="#1F87E8"
                  strokeWidth={2}
                  name="نقاط الجودة"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Goal tracking */}
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>تتبع الهدف</CardTitle>
            <CardDescription>حدد هدف نقاط الجودة واعرف كم منتج يحتاج تحسين</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-muted-foreground" />
            <input
              type="number"
              min={0}
              max={100}
              value={targetScore}
              onChange={(e) => handleTargetChange(Number(e.target.value) || 0)}
              className="w-16 rounded border bg-background px-2 py-1 text-center text-lg font-medium"
              title="هدف نقاط الجودة"
              aria-label="هدف نقاط الجودة"
            />
            <span className="text-muted-foreground">%</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>هدف الجودة: {targetScore}%</span>
              <span>{summary?.avgQualityScore ?? 0}% الحالي</span>
            </div>
            <Progress value={summary?.avgQualityScore ?? 0} className="h-3" />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {pointsNeeded > 0 && (
              <span>
                <span className="font-bold text-primary">{Math.ceil(pointsNeeded)}</span> نقاط
                مطلوبة
              </span>
            )}
            <span>
              <span className="font-bold text-primary">{productsToReachTarget}</span> منتج يحتاج
              تحسين
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
            <span className="text-2xl">{milestone.emoji}</span>
            <div>
              <p className="font-medium">المستوى الحالي: {milestone.label}</p>
              {milestone.next && (
                <p className="text-xs text-muted-foreground">
                  التالي: {milestone.next} ({milestone.nextAt}%+)
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom-20 products — responsive overflow on mobile */}
      <Card data-testid="overview-bottom-20">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>أقل 20 منتجاً من حيث الجودة</CardTitle>
            <CardDescription>ملء الآن بالذكاء الاصطناعي لكل منتج</CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Switch
              id="sort-bottom-revenue"
              checked={sortBottomByRevenue}
              onCheckedChange={setSortBottomByRevenue}
              data-testid="sort-bottom-by-revenue"
            />
            <Label
              htmlFor="sort-bottom-revenue"
              className="cursor-pointer whitespace-nowrap text-sm"
            >
              ترتيب حسب الإيرادات
            </Label>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {bottomProducts.length === 0 ? (
            <div className="space-y-2 py-12 text-center">
              <p className="text-muted-foreground">لا توجد منتجات في القائمة</p>
              {(summary?.totalProducts ?? 0) === 0 && (
                <p className="mx-auto max-w-md text-sm text-muted-foreground">
                  لوحة الذكاء الاصطناعي تعرض بيانات من كتالوج <strong>المنتجات (Product)</strong>.
                  إذا كان الكتالوج فارغاً فلن تظهر أي عناصر. أضف أو استورد منتجات من قسم
                  المخزون/المنتجات لرؤية البيانات هنا.
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المنتج</TableHead>
                    <TableHead>النقاط</TableHead>
                    <TableHead className="hidden sm:table-cell">الحقول الناقصة</TableHead>
                    <TableHead className="text-start">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bottomProducts.map((p) => {
                    const gaps = getProductGapBadges(p)
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="max-w-[120px] truncate font-medium sm:max-w-none">
                              {p.name}
                            </span>
                            <Link
                              href={`/admin/inventory/equipment/${p.id}`}
                              target="_blank"
                              className="shrink-0 text-muted-foreground hover:text-primary"
                              title="فتح صفحة المنتج"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono">{p.score}%</span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {gaps.map((g) => (
                              <Badge key={g} variant="secondary" className="text-xs">
                                {GAP_LABELS[g] ?? g}
                              </Badge>
                            ))}
                            {gaps.length === 0 && (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-start">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={fillingId === p.id || isFillAllRunning}
                            onClick={() => handleFillNow(p.id)}
                          >
                            {fillingId === p.id ? (
                              <Loader2 className="ms-1 h-4 w-4 animate-spin" />
                            ) : (
                              <Sparkles className="ms-1 h-4 w-4" />
                            )}
                            {fillingId === p.id ? 'جاري...' : 'ملء'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle>إجراءات سريعة</CardTitle>
          <CardDescription>
            فحص المحتوى أو تشغيل الملء بالذكاء الاصطناعي
            {lastUpdated && <span className="me-2 text-xs">• آخر تحديث: {lastUpdated}</span>}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            disabled={isRefreshing}
            onClick={handleRefresh}
          >
            {isRefreshing ? (
              <Loader2 className="ms-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="ms-2 h-4 w-4" />
            )}
            تحديث البيانات
          </Button>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            data-testid="overview-export-pdf"
            onClick={() =>
              exportQualityReportPDF({
                totalProducts: summary?.totalProducts ?? 0,
                avgQualityScore: summary?.avgQualityScore ?? 0,
                distribution: summary?.distribution ?? { excellent: 0, good: 0, fair: 0, poor: 0 },
                gaps: summary?.gaps ?? {},
                scannedAt: summary?.scannedAt ?? undefined,
                products: bottomProducts,
              })
            }
          >
            <FileDown className="ms-2 h-4 w-4" />
            تصدير PDF
          </Button>
          <Button
            className="w-full sm:w-auto"
            disabled={isFillAllRunning || !!isOverBudget}
            onClick={() => setShowFillAllDialog(true)}
          >
            {isFillAllRunning && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
            ملء الكل بالذكاء الاصطناعي
          </Button>
          <Button
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={() => onSwitchTab('analytics')}
          >
            عرض سجل المهام
          </Button>
        </CardContent>
      </Card>

      {/* Fill-all confirmation dialog */}
      <Dialog open={showFillAllDialog} onOpenChange={setShowFillAllDialog}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>ملء الكل بالذكاء الاصطناعي</DialogTitle>
            <DialogDescription>
              هل أنت متأكد؟ سيتم ملء جميع المنتجات بالذكاء الاصطناعي.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <Label htmlFor="revenue-weighted" className="flex-1 cursor-pointer">
              ترتيب حسب الإيرادات (ملء الأعلى إيراداً أولاً)
            </Label>
            <Switch
              id="revenue-weighted"
              checked={revenueWeighted}
              onCheckedChange={setRevenueWeighted}
            />
          </div>
          <div className="space-y-2 rounded-lg border p-4">
            <Label>نوع الملء</Label>
            <div className="flex flex-wrap gap-4 pt-2">
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={fillTypes.includes('text')}
                  onCheckedChange={(c) =>
                    setFillTypes((prev) =>
                      c === true
                        ? [...prev.filter((t) => t !== 'text'), 'text']
                        : prev.filter((t) => t !== 'text')
                    )
                  }
                />
                <span>نص (وصف، SEO)</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={fillTypes.includes('photo')}
                  onCheckedChange={(c) =>
                    setFillTypes((prev) =>
                      c === true
                        ? [...prev.filter((t) => t !== 'photo'), 'photo']
                        : prev.filter((t) => t !== 'photo')
                    )
                  }
                />
                <span>صور</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={fillTypes.includes('spec')}
                  onCheckedChange={(c) =>
                    setFillTypes((prev) =>
                      c === true
                        ? [...prev.filter((t) => t !== 'spec'), 'spec']
                        : prev.filter((t) => t !== 'spec')
                    )
                  }
                />
                <span>مواصفات</span>
              </label>
            </div>
          </div>
          <div className="space-y-2 rounded-lg border p-4">
            <Label>الحد الأدنى لنقاط الجودة (ملء الأقل نقاطاً فقط، 0 = الكل)</Label>
            <Slider
              value={[minQualityScore]}
              onValueChange={(value) => setMinQualityScore(value[0] ?? 0)}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              المنتجات ذات النقاط أقل من {minQualityScore} فقط
            </p>
          </div>
          {isOverBudget && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>الميزانية مستنفدة</AlertTitle>
              <AlertDescription>
                لا يمكن تشغيل ملء الكل لأن الميزانية اليومية أو الشهرية قد استُنفدت.
              </AlertDescription>
            </Alert>
          )}
          <Alert variant="default" className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">تقدير التكلفة</AlertTitle>
            <AlertDescription className="text-amber-700">
              {fillEstimateLoading ? (
                <p className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري حساب عدد المنتجات...
                </p>
              ) : scopedEstimatedCost ? (
                <>
                  <p>سيتم معالجة {fillCount} منتج</p>
                  <p className="font-medium">التكلفة التقديرية: ~${scopedEstimatedCost}</p>
                  <p className="mt-1 text-xs">هذه العملية قد تستغرق وقتاً ولا يمكن إيقافها</p>
                </>
              ) : (
                <p>التكلفة غير معروفة — راجع إعدادات الذكاء الاصطناعي</p>
              )}
            </AlertDescription>
          </Alert>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowFillAllDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleFillAllConfirm} disabled={!!isOverBudget}>
              تأكيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
