/**
 * @file ai-recommendations/page.tsx
 * @description AI Recommendations - alternatives, risk assessment, compatible equipment
 * @module app/admin/(routes)/ai-recommendations
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  Package,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Shield,
  Link2,
  History,
  Info,
  XCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils/format.utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { RiskAssessment } from '@/lib/types/ai.types'

interface EquipmentOption {
  id: string
  sku: string
  model: string | null
}

interface EquipmentRecommendationResult {
  equipmentId: string
  equipmentName: string
  sku: string
  matchScore: number
  reasons: string[]
  compatibility: 'exact' | 'compatible' | 'alternative'
  priceDifference?: number
}

interface CompatibleItem {
  id: string
  sku: string
  model: string | null
  dailyPrice: number
  category: { name: string; slug: string }
  brand: { name: string; slug: string } | null
  matchingCameraModels?: string[]
}

const RISK_LEVEL_LABELS: Record<string, string> = {
  low: 'منخفض',
  medium: 'متوسط',
  high: 'مرتفع',
  critical: 'حرج',
}

export default function AIRecommendationsPage() {
  const { toast } = useToast()
  const [equipment, setEquipment] = useState<EquipmentOption[]>([])
  const [equipmentLoading, setEquipmentLoading] = useState(true)
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('')
  const [recommendations, setRecommendations] = useState<EquipmentRecommendationResult[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [historyRequests, setHistoryRequests] = useState<{ equipmentId: string; name: string }[]>(
    []
  )

  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null)
  const [riskLoading, setRiskLoading] = useState(false)
  const [riskForm, setRiskForm] = useState({
    customerId: '',
    equipmentIds: '',
    rentalDuration: '',
    totalValue: '',
  })
  const [customers, setCustomers] = useState<{ id: string; name: string | null; email: string }[]>(
    []
  )

  const [compatibleEquipmentId, setCompatibleEquipmentId] = useState<string>('')
  const [targetCategoryId, setTargetCategoryId] = useState<string>('')
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([])
  const [compatibleResults, setCompatibleResults] = useState<CompatibleItem[]>([])
  const [compatibleLoading, setCompatibleLoading] = useState(false)

  useEffect(() => {
    loadEquipment()
  }, [])

  useEffect(() => {
    loadCustomers()
    loadCategories()
  }, [])

  const loadEquipment = async () => {
    setEquipmentLoading(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/equipment?take=200')
      if (!res.ok) throw new Error('Failed to load equipment')
      const data = await res.json()
      const items = data.items ?? data.equipment ?? []
      setEquipment(Array.isArray(items) ? items : [])
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : 'فشل تحميل المعدات')
      setEquipment([])
    } finally {
      setEquipmentLoading(false)
    }
  }

  const loadCustomers = async () => {
    try {
      const res = await fetch('/api/clients?pageSize=100')
      if (!res.ok) return
      const data = await res.json()
      const list = data.data ?? data.clients ?? []
      setCustomers(Array.isArray(list) ? list : [])
    } catch {
      setCustomers([])
    }
  }

  const loadCategories = async () => {
    try {
      const res = await fetch('/api/categories')
      if (!res.ok) return
      const data = await res.json()
      const list = data.categories ?? data.data ?? []
      const flat = Array.isArray(list) ? list : []
      setCategories(
        flat.map((c: { id: string; name: string; slug?: string }) => ({
          id: c.id,
          name: c.name,
          slug: c.slug ?? c.id,
        }))
      )
    } catch {
      setCategories([])
    }
  }

  const handleGetAlternatives = async () => {
    if (!selectedEquipmentId) {
      toast({
        title: 'اختر معدّة',
        description: 'يرجى اختيار معدّة للحصول على البدائل',
        variant: 'destructive',
      })
      return
    }
    setLoading(true)
    setLoadError(null)
    setRecommendations([])
    try {
      const res = await fetch('/api/ai/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unavailableEquipmentId: selectedEquipmentId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'فشل الحصول على البدائل')
      }
      const data = await res.json()
      setRecommendations(data.recommendations ?? [])
      const name =
        equipment.find((e) => e.id === selectedEquipmentId)?.model ||
        equipment.find((e) => e.id === selectedEquipmentId)?.sku ||
        selectedEquipmentId
      setHistoryRequests((prev) =>
        [{ equipmentId: selectedEquipmentId, name: name ?? '' }, ...prev].slice(0, 10)
      )
      if ((data.recommendations ?? []).length === 0) {
        toast({ title: 'لا بدائل', description: 'لم يتم العثور على بدائل في نفس الفئة' })
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'فشل تحميل التوصيات'
      setLoadError(msg)
      toast({ title: 'خطأ', description: msg, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleAssessRisk = async () => {
    if (!riskForm.equipmentIds.trim() || !riskForm.rentalDuration || !riskForm.totalValue) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء المعدات والمدة والقيمة الإجمالية',
        variant: 'destructive',
      })
      return
    }
    setRiskLoading(true)
    setRiskAssessment(null)
    try {
      const res = await fetch('/api/ai/risk-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: riskForm.customerId || undefined,
          equipmentIds: riskForm.equipmentIds
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean),
          rentalDuration: parseInt(riskForm.rentalDuration, 10),
          totalValue: parseFloat(riskForm.totalValue),
        }),
      })
      if (!res.ok) throw new Error('فشل تقييم المخاطر')
      const data = await res.json()
      setRiskAssessment(data)
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تقييم المخاطر',
        variant: 'destructive',
      })
    } finally {
      setRiskLoading(false)
    }
  }

  const handleGetCompatible = async () => {
    if (!targetCategoryId) {
      toast({ title: 'اختر الفئة', description: 'يرجى اختيار فئة الهدف', variant: 'destructive' })
      return
    }
    setCompatibleLoading(true)
    setCompatibleResults([])
    try {
      const res = await fetch('/api/ai/compatible-equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedEquipmentIds: compatibleEquipmentId ? [compatibleEquipmentId] : [],
          targetCategoryId,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'فشل جلب المعدات المتوافقة')
      }
      const data = await res.json()
      setCompatibleResults(data.data ?? [])
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل جلب المعدات المتوافقة',
        variant: 'destructive',
      })
    } finally {
      setCompatibleLoading(false)
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'bg-green-500'
      case 'medium':
        return 'bg-yellow-500'
      case 'high':
        return 'bg-orange-500'
      case 'critical':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const compatibilityLabel: Record<string, string> = {
    exact: 'مطابق',
    compatible: 'متوافق',
    alternative: 'بديل',
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Sparkles className="h-8 w-8 text-primary" />
            توصيات الذكاء الاصطناعي
          </h1>
          <p className="mt-1 text-muted-foreground">بدائل معدات، تقييم مخاطر، ومعدات متوافقة</p>
        </div>
      </div>

      <Tabs defaultValue="alternatives" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alternatives">بدائل المعدات</TabsTrigger>
          <TabsTrigger value="risk">تقييم المخاطر</TabsTrigger>
          <TabsTrigger value="compatible">المعدات المتوافقة</TabsTrigger>
        </TabsList>

        <TabsContent value="alternatives" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>بدائل المعدات</CardTitle>
              <CardDescription>
                اختر معدّة غير متاحة لرؤية بدائل مقترحة من نفس الفئة
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {equipmentLoading ? (
                <Skeleton className="h-10 w-full max-w-sm" />
              ) : fetchError ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-destructive">{fetchError}</p>
                  <Button variant="outline" onClick={loadEquipment}>
                    <RefreshCw className="ml-2 h-4 w-4" />
                    إعادة تحميل المعدات
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-4">
                  <Select value={selectedEquipmentId} onValueChange={setSelectedEquipmentId}>
                    <SelectTrigger className="w-[280px]">
                      <SelectValue placeholder="اختر معدّة..." />
                    </SelectTrigger>
                    <SelectContent>
                      {equipment.map((eq) => (
                        <SelectItem key={eq.id} value={eq.id}>
                          {eq.model || eq.sku} ({eq.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleGetAlternatives}
                    disabled={loading || !selectedEquipmentId}
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                        جاري التحليل...
                      </>
                    ) : (
                      <>
                        <Sparkles className="ml-2 h-4 w-4" />
                        الحصول على البدائل
                      </>
                    )}
                  </Button>
                </div>
              )}
              {historyRequests.length > 0 && (
                <div className="rounded-lg border p-3">
                  <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <History className="h-4 w-4" />
                    آخر 10 طلبات
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {historyRequests.map((h, i) => (
                      <li key={`${h.equipmentId}-${i}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedEquipmentId(h.equipmentId)}
                        >
                          {h.name || h.equipmentId}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {loadError && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-4 text-destructive">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <span>{loadError}</span>
                  <Button variant="outline" size="sm" onClick={handleGetAlternatives}>
                    إعادة المحاولة
                  </Button>
                </div>
              )}
              {!loading && !loadError && recommendations.length === 0 && selectedEquipmentId && (
                <div className="py-8 text-center text-muted-foreground">
                  <Package className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p className="font-medium">لا توجد بدائل</p>
                  <p className="text-sm">جرّب معدّة أخرى أو شغّل &quot;الحصول على البدائل&quot;</p>
                </div>
              )}
              {!loading && recommendations.length > 0 && (
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>المعدّة / SKU</TableHead>
                        <TableHead>التوافق</TableHead>
                        <TableHead>نسبة التطابق</TableHead>
                        <TableHead>فرق السعر</TableHead>
                        <TableHead>الأسباب</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recommendations.map((rec) => (
                        <TableRow key={rec.equipmentId}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{rec.equipmentName}</p>
                              <p className="text-xs text-muted-foreground">{rec.sku}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                rec.compatibility === 'exact'
                                  ? 'default'
                                  : rec.compatibility === 'compatible'
                                    ? 'secondary'
                                    : 'outline'
                              }
                            >
                              {rec.compatibility === 'exact' && (
                                <CheckCircle className="ml-1 h-3 w-3" />
                              )}
                              {compatibilityLabel[rec.compatibility] ?? rec.compatibility}
                            </Badge>
                          </TableCell>
                          <TableCell>{rec.matchScore}%</TableCell>
                          <TableCell>
                            {rec.priceDifference != null
                              ? (rec.priceDifference >= 0 ? '+' : '') +
                                formatCurrency(rec.priceDifference)
                              : '—'}
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <ul className="list-inside list-disc text-xs text-muted-foreground">
                              {rec.reasons.slice(0, 3).map((r, i) => (
                                <li key={i}>{r}</li>
                              ))}
                            </ul>
                          </TableCell>
                          <TableCell>
                            <Link href={`/admin/inventory/equipment/${rec.equipmentId}`}>
                              <Button size="sm" variant="ghost">
                                عرض
                                <ArrowRight className="mr-1 h-4 w-4" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                تقييم المخاطر
              </CardTitle>
              <CardDescription>تقييم مخاطر الحجز بناءً على العميل والمعدات والقيمة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>العميل (اختياري)</Label>
                  <Select
                    value={riskForm.customerId || '_none'}
                    onValueChange={(v) =>
                      setRiskForm({ ...riskForm, customerId: v === '_none' ? '' : v })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="اختر عميلاً" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">— لا عميل —</SelectItem>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name || c.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>معرفات المعدات (مفصولة بفاصلة) *</Label>
                  <Input
                    value={riskForm.equipmentIds}
                    onChange={(e) => setRiskForm({ ...riskForm, equipmentIds: e.target.value })}
                    placeholder="id1, id2, id3"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>مدة الإيجار (أيام) *</Label>
                  <Input
                    type="number"
                    value={riskForm.rentalDuration}
                    onChange={(e) => setRiskForm({ ...riskForm, rentalDuration: e.target.value })}
                    placeholder="7"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>القيمة الإجمالية (ر.س) *</Label>
                  <Input
                    type="number"
                    value={riskForm.totalValue}
                    onChange={(e) => setRiskForm({ ...riskForm, totalValue: e.target.value })}
                    placeholder="50000"
                    className="mt-1"
                  />
                </div>
              </div>
              <Button onClick={handleAssessRisk} disabled={riskLoading}>
                {riskLoading ? 'جاري التقييم...' : 'تقييم المخاطر'}
              </Button>
            </CardContent>
          </Card>
          {riskAssessment && (
            <Card>
              <CardHeader>
                <CardTitle>نتائج تقييم المخاطر</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-sm font-medium">درجة المخاطر:</span>
                      <Badge className={getRiskColor(riskAssessment.level)}>
                        {riskAssessment.score}/100
                      </Badge>
                      <Badge variant="outline">
                        {RISK_LEVEL_LABELS[riskAssessment.level] ?? riskAssessment.level}
                      </Badge>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200">
                      <div
                        className={`h-2 rounded-full ${getRiskColor(riskAssessment.level)}`}
                        style={{ width: `${riskAssessment.score}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <Label>التوصية:</Label>
                  <div className="mt-1 flex items-center gap-2">
                    {riskAssessment.recommendation === 'approve' && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {riskAssessment.recommendation === 'review' && (
                      <Info className="h-4 w-4 text-yellow-500" />
                    )}
                    {riskAssessment.recommendation === 'reject' && (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    {riskAssessment.recommendation === 'require_deposit' && (
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                    )}
                    <span className="font-medium capitalize">
                      {riskAssessment.recommendation.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                {riskAssessment.suggestedDeposit != null && (
                  <div>
                    <Label>الوديعة المقترحة:</Label>
                    <p className="mt-1 text-lg font-semibold">
                      {riskAssessment.suggestedDeposit.toLocaleString('ar-SA')} ر.س
                    </p>
                  </div>
                )}
                <div>
                  <Label>التحليل:</Label>
                  <p className="mt-1 text-sm text-muted-foreground">{riskAssessment.reasoning}</p>
                </div>
                {riskAssessment.factors?.length > 0 && (
                  <div>
                    <Label>عوامل المخاطر:</Label>
                    <div className="mt-2 space-y-2">
                      {riskAssessment.factors.map(
                        (
                          factor: {
                            name: string
                            weight?: number
                            impact?: string
                            description?: string
                          },
                          index: number
                        ) => (
                          <div key={index} className="flex items-start gap-2 rounded bg-muted p-2">
                            <span className="font-medium">{factor.name}</span>
                            {factor.weight != null && (
                              <Badge variant="outline" className="text-xs">
                                الوزن: {factor.weight}%
                              </Badge>
                            )}
                            {factor.impact && (
                              <Badge
                                variant={factor.impact === 'negative' ? 'destructive' : 'secondary'}
                              >
                                {factor.impact}
                              </Badge>
                            )}
                            {factor.description && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                {factor.description}
                              </p>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="compatible" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                المعدات المتوافقة
              </CardTitle>
              <CardDescription>
                اختر معدّة (مثلاً كاميرا) وفئة الهدف (مثلاً عدسات) لعرض المعدات المتوافقة
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="min-w-[200px]">
                  <Label>المعدّة (اختياري)</Label>
                  <Select
                    value={compatibleEquipmentId || '_none'}
                    onValueChange={(v) => setCompatibleEquipmentId(v === '_none' ? '' : v)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="اختر معدّة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">— الكل —</SelectItem>
                      {equipment.map((eq) => (
                        <SelectItem key={eq.id} value={eq.id}>
                          {eq.model || eq.sku}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[200px]">
                  <Label>فئة الهدف *</Label>
                  <Select value={targetCategoryId} onValueChange={setTargetCategoryId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="اختر الفئة" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleGetCompatible}
                  disabled={compatibleLoading || !targetCategoryId}
                >
                  {compatibleLoading ? 'جاري الجلب...' : 'عرض المتوافق'}
                </Button>
              </div>
              {compatibleResults.length > 0 && (
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>المعدّة / SKU</TableHead>
                        <TableHead>الفئة</TableHead>
                        <TableHead>السعر اليومي</TableHead>
                        <TableHead>متوافق مع</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {compatibleResults.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.model || item.sku}</p>
                              <p className="text-xs text-muted-foreground">{item.sku}</p>
                            </div>
                          </TableCell>
                          <TableCell>{item.category?.name ?? '—'}</TableCell>
                          <TableCell>{formatCurrency(item.dailyPrice)}</TableCell>
                          <TableCell className="max-w-[180px] text-xs">
                            {item.matchingCameraModels?.length
                              ? item.matchingCameraModels.join(', ')
                              : '—'}
                          </TableCell>
                          <TableCell>
                            <Link href={`/admin/inventory/equipment/${item.id}`}>
                              <Button size="sm" variant="ghost">
                                عرض
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
