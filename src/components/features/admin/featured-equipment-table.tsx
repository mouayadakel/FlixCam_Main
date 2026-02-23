/**
 * @file featured-equipment-table.tsx
 * @description Reusable featured equipment control: table, filters, category bulk actions, save.
 * Used on /admin/inventory/featured and embedded in /admin/cms/featured.
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Package, Loader2, Save, Star, ExternalLink, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import Image from 'next/image'

export interface EquipmentItem {
  id: string
  sku: string
  model: string | null
  featured: boolean
  category: { id: string; name: string; slug: string }
  brand: { id: string; name: string; slug: string } | null
  media: Array<{ id: string; url: string }>
}

export interface FeaturedEquipmentTableProps {
  /** When true, used inside CMS featured page (e.g. compact layout, show link to full page) */
  embedded?: boolean
  /** When true, show "فتح في صفحة كاملة" link (for CMS) */
  showLinkToFullPage?: boolean
}

export function FeaturedEquipmentTable({
  embedded = false,
  showLinkToFullPage = false,
}: FeaturedEquipmentTableProps) {
  const { toast } = useToast()
  const [equipment, setEquipment] = useState<EquipmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [featuredFilter, setFeaturedFilter] = useState<'all' | 'featured'>('all')
  const [localFeatured, setLocalFeatured] = useState<Record<string, boolean>>({})
  const [displayCount, setDisplayCount] = useState<number>(8)
  const [savingCount, setSavingCount] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [selectedBrandId, setSelectedBrandId] = useState<string>('')

  const loadEquipment = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('take', '500')
      const response = await fetch(`/api/equipment?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to load equipment')
      const data = await response.json()
      const items: EquipmentItem[] = data.items || []
      setEquipment(items)
      setLocalFeatured(
        items.reduce<Record<string, boolean>>((acc, item) => {
          acc[item.id] = item.featured
          return acc
        }, {})
      )
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحميل المعدات',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadEquipment()
  }, [loadEquipment])

  const loadDisplayCount = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings/featured-display-count')
      if (res.ok) {
        const data = await res.json()
        if (typeof data.count === 'number') setDisplayCount(data.count)
      }
    } catch {
      // keep default 8
    }
  }, [])

  useEffect(() => {
    loadDisplayCount()
  }, [loadDisplayCount])

  const handleDisplayCountChange = async (value: string) => {
    const n = parseInt(value, 10)
    if (Number.isNaN(n) || ![4, 6, 8, 12].includes(n)) return
    setSavingCount(true)
    try {
      const res = await fetch('/api/admin/settings/featured-display-count', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: n }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setDisplayCount(n)
      toast({ title: 'تم', description: `عدد العناصر المعروضة: ${n}` })
    } catch {
      toast({
        title: 'خطأ',
        description: 'فشل حفظ عدد العناصر المعروضة',
        variant: 'destructive',
      })
    } finally {
      setSavingCount(false)
    }
  }

  const handleToggle = (id: string, checked: boolean) => {
    setLocalFeatured((prev) => ({ ...prev, [id]: checked }))
  }

  const handleSave = async () => {
    setSaving(true)
    toast({
      title: 'جاري الحفظ',
      description: 'جاري تحديث المعدات المميزة...',
    })
    try {
      const toFeature = equipment
        .filter((e) => localFeatured[e.id] === true && !e.featured)
        .map((e) => e.id)
      const toUnfeature = equipment
        .filter((e) => localFeatured[e.id] === false && e.featured)
        .map((e) => e.id)

      if (toFeature.length > 0) {
        const res1 = await fetch('/api/admin/equipment/featured', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ equipmentIds: toFeature, featured: true }),
        })
        if (!res1.ok) {
          const err = await res1.json()
          throw new Error(err.error || 'Failed to set featured')
        }
      }
      if (toUnfeature.length > 0) {
        const res2 = await fetch('/api/admin/equipment/featured', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ equipmentIds: toUnfeature, featured: false }),
        })
        if (!res2.ok) {
          const err = await res2.json()
          throw new Error(err.error || 'Failed to unset featured')
        }
      }

      toast({
        title: 'تم الحفظ بنجاح',
        description: 'تم تحديث المعدات المميزة. ستظهر عشوائياً في الصفحة الرئيسية.',
        duration: 5000,
      })
      loadEquipment()
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل حفظ التغييرات',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const categories = useMemo(() => {
    const seen = new Set<string>()
    return equipment
      .map((e) => e.category)
      .filter((c) => {
        if (seen.has(c.id)) return false
        seen.add(c.id)
        return true
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
  }, [equipment])

  const brands = useMemo(() => {
    const seen = new Set<string>()
    return equipment
      .map((e) => e.brand)
      .filter((b): b is NonNullable<typeof b> => {
        if (b == null) return false
        if (seen.has(b.id)) return false
        seen.add(b.id)
        return true
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
  }, [equipment])

  const selectAllInCategory = useCallback(
    (categoryId: string) => {
      if (!categoryId) return
      setLocalFeatured((prev) => {
        const next = { ...prev }
        equipment
          .filter((e) => e.category.id === categoryId)
          .forEach((e) => {
            next[e.id] = true
          })
        return next
      })
    },
    [equipment]
  )

  const deselectAllInCategory = useCallback(
    (categoryId: string) => {
      if (!categoryId) return
      setLocalFeatured((prev) => {
        const next = { ...prev }
        equipment
          .filter((e) => e.category.id === categoryId)
          .forEach((e) => {
            next[e.id] = false
          })
        return next
      })
    },
    [equipment]
  )

  const filtered = equipment.filter((item) => {
    const matchSearch =
      !search ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.model?.toLowerCase().includes(search.toLowerCase()) ||
      item.category.name.toLowerCase().includes(search.toLowerCase()) ||
      item.brand?.name.toLowerCase().includes(search.toLowerCase())
    const matchFeatured =
      featuredFilter === 'all' || (featuredFilter === 'featured' && localFeatured[item.id])
    const matchCategory = !selectedCategoryId || item.category.id === selectedCategoryId
    const matchBrand = !selectedBrandId || item.brand?.id === selectedBrandId
    return matchSearch && matchFeatured && matchCategory && matchBrand
  })

  const hasChanges = equipment.some((e) => localFeatured[e.id] !== e.featured)
  const featuredCount = equipment.filter((e) => localFeatured[e.id]).length
  const showZeroAlert = !loading && equipment.length > 0 && featuredCount === 0

  return (
    <div className={embedded ? 'space-y-4' : 'space-y-6'} dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {!loading && (
            <p className="text-sm font-medium text-neutral-700">
              {featuredCount} معدات مميزة من {equipment.length}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm text-neutral-600">
              عدد العناصر المعروضة على الصفحة الرئيسية:
            </span>
            <Select
              value={String(displayCount)}
              onValueChange={handleDisplayCountChange}
              disabled={savingCount}
            >
              <SelectTrigger className="w-[100px]" dir="rtl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[4, 6, 8, 12].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {showLinkToFullPage && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/inventory/featured">فتح في صفحة كاملة</Link>
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <a href="/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="ml-2 h-4 w-4" />
              معاينة الصفحة الرئيسية
            </a>
          </Button>
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? (
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="ml-2 h-4 w-4" />
            )}
            حفظ التغييرات
          </Button>
        </div>
      </div>

      {showZeroAlert && (
        <div
          className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800"
          role="alert"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">
            لم تُحدد أي معدات مميزة. قسم «معدات مميزة» على الصفحة الرئيسية سيظهر فارغاً أو سيتم
            إخفاؤه. حدد عناصر واحدة على الأقل ثم احفظ.
          </p>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Input
                placeholder="بحث (SKU، الموديل، الفئة)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-3"
                dir="rtl"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={selectedCategoryId || 'all'}
                onValueChange={(v) => setSelectedCategoryId(v === 'all' ? '' : v)}
              >
                <SelectTrigger className="w-[180px]" dir="rtl">
                  <SelectValue placeholder="الفئة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الفئات</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedBrandId || 'all'}
                onValueChange={(v) => setSelectedBrandId(v === 'all' ? '' : v)}
              >
                <SelectTrigger className="w-[160px]" dir="rtl">
                  <SelectValue placeholder="العلامة التجارية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الماركات</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                disabled={!selectedCategoryId}
                onClick={() => selectedCategoryId && selectAllInCategory(selectedCategoryId)}
              >
                تحديد كل هذه الفئة
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!selectedCategoryId}
                onClick={() => selectedCategoryId && deselectAllInCategory(selectedCategoryId)}
              >
                إلغاء تحديد هذه الفئة
              </Button>
              <Button
                variant={featuredFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFeaturedFilter('all')}
              >
                الكل
              </Button>
              <Button
                variant={featuredFilter === 'featured' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFeaturedFilter('featured')}
              >
                <Star className="ml-1 h-4 w-4" />
                المميزة فقط
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-neutral-500">
              {equipment.length === 0
                ? 'لا توجد معدات. أضف معدات من صفحة المعدات أولاً.'
                : 'لا توجد نتائج تطابق البحث أو الفلتر.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">عرض على الصفحة الرئيسية</TableHead>
                  <TableHead>الصورة</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>الموديل</TableHead>
                  <TableHead>الفئة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => {
                  const imgUrl = item.media?.[0]?.url
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={!!localFeatured[item.id]}
                          onCheckedChange={(checked) => handleToggle(item.id, checked === true)}
                          aria-label={`عرض ${item.model || item.sku} على الصفحة الرئيسية`}
                        />
                      </TableCell>
                      <TableCell>
                        {imgUrl ? (
                          <div className="relative h-12 w-12 overflow-hidden rounded border border-neutral-200">
                            <Image
                              src={imgUrl}
                              alt={item.sku}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded border border-neutral-200 bg-neutral-100">
                            <Package className="h-5 w-5 text-neutral-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell>{item.model || '—'}</TableCell>
                      <TableCell>{item.category.name}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/inventory/equipment/${item.id}`}>عرض</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
