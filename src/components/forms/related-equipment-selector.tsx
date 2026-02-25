/**
 * @file related-equipment-selector.tsx
 * @description Searchable multi-select for related equipment with full filters
 * @module components/forms
 */

'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Search, X, Package, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface Equipment {
  id: string
  sku: string
  model?: string | null
  category: { id: string; name: string; slug?: string }
  brand?: { id: string; name: string; slug?: string } | null
  condition?: string
}

interface Category {
  id: string
  name: string
  parentId?: string | null
  children?: Category[]
}

interface Brand {
  id: string
  name: string
}

interface RelatedEquipmentSelectorProps {
  value?: string[]
  onChange: (ids: string[]) => void
  label?: string
  excludeId?: string
  className?: string
}

const CONDITION_OPTIONS = [
  { value: '', label: 'كل الحالات' },
  { value: 'EXCELLENT', label: 'ممتاز' },
  { value: 'GOOD', label: 'جيد' },
  { value: 'FAIR', label: 'مقبول' },
  { value: 'POOR', label: 'ضعيف' },
  { value: 'MAINTENANCE', label: 'صيانة' },
] as const

const SORT_OPTIONS = [
  { value: 'newest', label: 'الأحدث' },
  { value: 'sku', label: 'SKU' },
  { value: 'model', label: 'الموديل' },
  { value: 'category', label: 'الفئة' },
  { value: 'brand', label: 'العلامة التجارية' },
] as const

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  return a.every((id, i) => id === b[i])
}

export function RelatedEquipmentSelector({
  value = [],
  onChange,
  label = 'المعدات ذات الصلة',
  excludeId,
  className,
}: RelatedEquipmentSelectorProps) {
  const [search, setSearch] = useState('')
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<string[]>(() => (Array.isArray(value) ? value : []))
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [filterOpen, setFilterOpen] = useState(true)

  // Filters
  const [categoryId, setCategoryId] = useState<string>('')
  const [brandId, setBrandId] = useState<string>('')
  const [condition, setCondition] = useState<string>('')
  const [isActive, setIsActive] = useState<string>('')
  const [featured, setFeatured] = useState<string>('')
  const [sortBy, setSortBy] = useState<string>('newest')

  const valueArr = Array.isArray(value) ? value : []
  const valueKey = valueArr.join(',')

  // Sync from parent only when the list of IDs actually changes
  useEffect(() => {
    setSelected((prev) => (arraysEqual(prev, valueArr) ? prev : valueArr))
  }, [valueKey])

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [catRes, brandRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/brands'),
        ])
        if (catRes.ok) {
          const catData = await catRes.json()
          setCategories(catData.categories ?? catData ?? [])
        }
        if (brandRes.ok) {
          const brandData = await brandRes.json()
          setBrands(brandData.brands ?? brandData ?? [])
        }
      } catch {
        // ignore
      }
    }
    loadLookups()
  }, [])

  const loadEquipment = useMemo(
    () => async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (search.trim()) params.set('search', search.trim())
        if (categoryId) params.set('categoryId', categoryId)
        if (brandId) params.set('brandId', brandId)
        if (condition) params.set('condition', condition)
        if (isActive === 'true') params.set('isActive', 'true')
        if (isActive === 'false') params.set('isActive', 'false')
        if (featured === 'true') params.set('featured', 'true')
        if (featured === 'false') params.set('featured', 'false')
        params.set('take', '100')

        const response = await fetch(`/api/equipment?${params.toString()}`)
        if (!response.ok) throw new Error('Failed to load equipment')

        const data = await response.json()
        let items: Equipment[] = data.items || []

        if (excludeId) {
          items = items.filter((item) => item.id !== excludeId)
        }

        setEquipment(items)
      } catch (error) {
        console.error('Error loading equipment:', error)
        setEquipment([])
      } finally {
        setLoading(false)
      }
    },
    [search, categoryId, brandId, condition, isActive, featured, excludeId]
  )

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadEquipment()
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [loadEquipment])

  const hasActiveFilters =
    search.trim() !== '' ||
    categoryId !== '' ||
    brandId !== '' ||
    condition !== '' ||
    isActive !== '' ||
    featured !== ''

  const clearFilters = () => {
    setSearch('')
    setCategoryId('')
    setBrandId('')
    setCondition('')
    setIsActive('')
    setFeatured('')
    setSortBy('newest')
  }

  const sortedEquipment = useMemo(() => {
    const list = [...equipment]
    switch (sortBy) {
      case 'sku':
        return list.sort((a, b) => (a.sku || '').localeCompare(b.sku || ''))
      case 'model':
        return list.sort((a, b) =>
          (a.model || '').localeCompare(b.model || '', 'ar')
        )
      case 'category':
        return list.sort((a, b) =>
          (a.category?.name || '').localeCompare(b.category?.name || '', 'ar')
        )
      case 'brand':
        return list.sort((a, b) =>
          (a.brand?.name || '').localeCompare(b.brand?.name || '', 'ar')
        )
      default:
        return list
    }
  }, [equipment, sortBy])

  const selectedEquipment = useMemo(() => {
    return sortedEquipment.filter((item) => selected.includes(item.id))
  }, [sortedEquipment, selected])

  const handleToggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter((i) => i !== id) : [...selected, id]
    setSelected(next)
    onChange(next)
  }

  const handleRemove = (id: string) => {
    const next = selected.filter((i) => i !== id)
    setSelected(next)
    onChange(next)
  }

  const flatCategories = useMemo(() => {
    const out: { id: string; name: string; depth: number }[] = []
    function add(cats: Category[], depth: number) {
      for (const c of cats) {
        out.push({ id: c.id, name: c.name, depth })
        if (c.children?.length) add(c.children, depth + 1)
      }
    }
    const roots = categories.filter((c) => !c.parentId)
    if (roots.length > 0) add(roots, 0)
    else categories.forEach((c) => out.push({ id: c.id, name: c.name, depth: 0 }))
    return out
  }, [categories])

  return (
    <div className={cn('space-y-4', className)} dir="rtl">
      <Label>{label}</Label>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <Input
          placeholder="ابحث عن المعدات (SKU، الموديل، الفئة)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
          dir="rtl"
        />
      </div>

      {/* فلترة: أفضل المعدات ذات الصلة */}
      <Collapsible open={filterOpen} onOpenChange={setFilterOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-t-lg border-0 border-b border-neutral-200 bg-neutral-50/80 px-4 py-3 text-right hover:bg-neutral-100/80"
            >
              <SlidersHorizontal className="h-4 w-4 text-neutral-500" />
              <span className="font-medium text-neutral-800">فلترة: أفضل المعدات ذات الصلة</span>
              {hasActiveFilters && (
                <Badge variant="secondary" className="text-xs">
                  مفعّل
                </Badge>
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <div className="space-y-2">
                  <Label className="text-xs text-neutral-500">الفئة</Label>
                  <Select value={categoryId || 'all'} onValueChange={(v) => setCategoryId(v === 'all' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="كل الفئات" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الفئات</SelectItem>
                      {flatCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.depth > 0 ? '\u200e'.repeat(cat.depth * 2) + '↳ ' : ''}{cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-neutral-500">العلامة التجارية</Label>
                  <Select value={brandId || 'all'} onValueChange={(v) => setBrandId(v === 'all' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="كل العلامات" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل العلامات</SelectItem>
                      {brands.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-neutral-500">الحالة الفنية</Label>
                  <Select value={condition || 'all'} onValueChange={(v) => setCondition(v === 'all' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value || 'all'} value={opt.value || 'all'}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-neutral-500">نشط</Label>
                  <Select value={isActive || 'all'} onValueChange={(v) => setIsActive(v === 'all' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="الكل" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="true">نشط فقط</SelectItem>
                      <SelectItem value="false">غير نشط فقط</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-neutral-500">مميز</Label>
                  <Select value={featured || 'all'} onValueChange={(v) => setFeatured(v === 'all' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="الكل" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="true">مميز فقط</SelectItem>
                      <SelectItem value="false">غير مميز فقط</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-neutral-500">ترتيب العرض</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-3 text-neutral-600"
                  onClick={clearFilters}
                >
                  مسح كل الفلاتر
                </Button>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Selected Equipment */}
      {selectedEquipment.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm">المعدات المحددة:</Label>
          <div className="flex flex-wrap gap-2">
            {selectedEquipment.map((item) => (
              <Badge key={item.id} variant="secondary" className="gap-2">
                {item.sku} {item.model && `- ${item.model}`}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => handleRemove(item.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Equipment List */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="py-8 text-center text-neutral-500">جاري التحميل...</div>
          ) : sortedEquipment.length === 0 ? (
            <div className="py-8 text-center text-neutral-500">لا توجد معدات تطابق الفلتر</div>
          ) : (
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {sortedEquipment.map((item) => (
                <div
                  key={item.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50"
                  onClick={() => handleToggle(item.id)}
                >
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.includes(item.id)}
                      onCheckedChange={() => handleToggle(item.id)}
                    />
                  </div>
                  <Package className="h-4 w-4 shrink-0 text-neutral-400" />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-medium">{item.sku}</p>
                    {item.model && <p className="text-sm text-neutral-600">{item.model}</p>}
                    <p className="text-xs text-neutral-500">
                      {item.category?.name}
                      {item.brand?.name && ` · ${item.brand.name}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
