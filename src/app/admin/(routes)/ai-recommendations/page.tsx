/**
 * @file ai-recommendations/page.tsx
 * @description AI Equipment Alternatives - get alternatives for unavailable equipment via API
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
  ArrowRight,
  CheckCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils/format.utils'
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

export default function AIRecommendationsPage() {
  const { toast } = useToast()
  const [equipment, setEquipment] = useState<EquipmentOption[]>([])
  const [equipmentLoading, setEquipmentLoading] = useState(true)
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('')
  const [recommendations, setRecommendations] = useState<EquipmentRecommendationResult[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    loadEquipment()
  }, [])

  const loadEquipment = async () => {
    setEquipmentLoading(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/equipment?isActive=true&limit=200')
      if (!res.ok) throw new Error('Failed to load equipment')
      const data = await res.json()
      const items = data.items ?? data.equipment ?? []
      setEquipment(Array.isArray(items) ? items : [])
    } catch (error) {
      console.error('Failed to load equipment:', error)
      setFetchError(error instanceof Error ? error.message : 'فشل تحميل المعدات')
      setEquipment([])
    } finally {
      setEquipmentLoading(false)
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
      if ((data.recommendations ?? []).length === 0) {
        toast({
          title: 'لا بدائل',
          description: 'لم يتم العثور على بدائل في نفس الفئة',
        })
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'فشل تحميل التوصيات'
      setLoadError(msg)
      toast({
        title: 'خطأ',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
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
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            توصيات الذكاء الاصطناعي
          </h1>
          <p className="text-muted-foreground mt-1">
            الحصول على بدائل معدات بناءً على الفئة والسعر
          </p>
        </div>
      </div>

      {/* Equipment selection & alternatives */}
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
                <RefreshCw className="h-4 w-4 ml-2" />
                إعادة تحميل المعدات
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <Select
                value={selectedEquipmentId}
                onValueChange={setSelectedEquipmentId}
              >
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
                    <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                    جاري التحليل...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 ml-2" />
                    الحصول على البدائل
                  </>
                )}
              </Button>
            </div>
          )}

          {loadError && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>{loadError}</span>
              <Button variant="outline" size="sm" onClick={handleGetAlternatives}>
                إعادة المحاولة
              </Button>
            </div>
          )}

          {!loading && !loadError && recommendations.length === 0 && selectedEquipmentId && (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">لا توجد بدائل</p>
              <p className="text-sm">جرّب معدّة أخرى أو شغّل &quot;الحصول على البدائل&quot;</p>
            </div>
          )}

          {!loading && recommendations.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
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
                            <CheckCircle className="h-3 w-3 ml-1" />
                          )}
                          {compatibilityLabel[rec.compatibility] ?? rec.compatibility}
                        </Badge>
                      </TableCell>
                      <TableCell>{rec.matchScore}%</TableCell>
                      <TableCell>
                        {rec.priceDifference != null
                          ? (rec.priceDifference >= 0 ? '+' : '') + formatCurrency(rec.priceDifference)
                          : '—'}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <ul className="text-xs text-muted-foreground list-disc list-inside">
                          {rec.reasons.slice(0, 3).map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/inventory/equipment/${rec.equipmentId}`}>
                          <Button size="sm" variant="ghost">
                            عرض
                            <ArrowRight className="h-4 w-4 mr-1" />
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
    </div>
  )
}
