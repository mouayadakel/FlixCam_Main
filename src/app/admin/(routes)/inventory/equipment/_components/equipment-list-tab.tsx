/**
 * @file equipment-list-tab.tsx
 * @description All Equipment tab content
 * @module app/admin/(routes)/inventory/equipment/_components
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  Plus,
  Search,
  Package,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckSquare,
  Power,
  PowerOff,
  Trash2,
} from 'lucide-react'
import { SpecificationsAuditDialog } from '@/components/admin/specifications/SpecificationsAuditDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/states/empty-state'
import { formatDate } from '@/lib/utils/format.utils'
import Image from 'next/image'
import type { Equipment, EquipmentCondition } from '@prisma/client'

interface EquipmentWithRelations extends Equipment {
  category: { id: string; name: string; slug: string }
  brand: { id: string; name: string; slug: string } | null
  media: Array<{ id: string; url: string }>
  maintenance?: Array<{ completedDate: string }>
}

const CONDITION_COLORS: Record<EquipmentCondition, string> = {
  EXCELLENT: '#10B981',
  GOOD: '#1F87E8',
  FAIR: '#F59E0B',
  POOR: '#EF4444',
  MAINTENANCE: '#6B7280',
  DAMAGED: '#DC2626',
}

const CONDITION_LABELS: Record<EquipmentCondition, string> = {
  EXCELLENT: 'ممتاز',
  GOOD: 'جيد',
  FAIR: 'مقبول',
  POOR: 'ضعيف',
  MAINTENANCE: 'صيانة',
  DAMAGED: 'تالف',
}

export default function EquipmentListTab() {
  const { toast } = useToast()
  const [equipment, setEquipment] = useState<EquipmentWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [conditionFilter, setConditionFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [migratingSpecs, setMigratingSpecs] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkLoading, setBulkLoading] = useState(false)

  const LOW_STOCK_THRESHOLD = 1

  useEffect(() => {
    loadEquipment()
    loadCategories()
  }, [categoryFilter, conditionFilter, statusFilter])

  const loadEquipment = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (categoryFilter !== 'all') params.set('categoryId', categoryFilter)
      if (conditionFilter !== 'all') params.set('condition', conditionFilter)
      if (statusFilter === 'active') params.set('isActive', 'true')
      if (statusFilter === 'inactive') params.set('isActive', 'false')

      const response = await fetch(`/api/equipment?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to load equipment')

      const data = await response.json()
      setEquipment(data.items || [])
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحميل المعدات',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories ?? data)
      }
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }

  const handleMigrateSpecs = async () => {
    if (
      !confirm(
        'تحويل كل المعدات ذات المواصفات المسطحة إلى الصيغة المنظمة (حسب قالب الفئة). هل تريد المتابعة؟'
      )
    )
      return
    setMigratingSpecs(true)
    try {
      const res = await fetch('/api/admin/equipment/migrate-specs', {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'فشل التحديث')
      }
      const s = data.summary
      toast({
        title: 'تم التحديث',
        description: `تم تحويل ${s.updated} معدّة إلى المواصفات المنظمة. تم تخطي ${s.skippedStructured} (منظمة مسبقاً) و ${s.skippedEmpty} (بدون مواصفات).${data.failed?.length ? ` فشل: ${data.failed.length}` : ''}`,
      })
      loadEquipment()
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل تحديث المواصفات',
        variant: 'destructive',
      })
    } finally {
      setMigratingSpecs(false)
    }
  }

  const inventoryStats = useMemo(() => {
    const total = equipment.length
    const active = equipment.filter((e) => e.isActive).length
    const lowStock = equipment.filter(
      (e) => e.quantityAvailable <= LOW_STOCK_THRESHOLD && e.isActive
    ).length
    const inMaintenance = equipment.filter(
      (e) => e.condition === 'MAINTENANCE' || e.condition === 'DAMAGED'
    ).length
    return { total, active, lowStock, inMaintenance }
  }, [equipment])

  const filteredEquipment = useMemo(() => {
    if (!search) return equipment
    const searchLower = search.toLowerCase()
    return equipment.filter((item) => {
      return (
        item.sku.toLowerCase().includes(searchLower) ||
        item.model?.toLowerCase().includes(searchLower) ||
        item.category.name.toLowerCase().includes(searchLower) ||
        item.brand?.name.toLowerCase().includes(searchLower)
      )
    })
  }, [equipment, search])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredEquipment.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredEquipment.map((e) => e.id))
    }
  }
  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedIds.length === 0) return
    const labels = { activate: 'تفعيل', deactivate: 'إلغاء تفعيل', delete: 'حذف' }
    if (action === 'delete' && !confirm(`هل أنت متأكد من حذف ${selectedIds.length} معدة؟`)) return
    setBulkLoading(true)
    try {
      const res = await fetch('/api/equipment/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, action }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'فشل العملية')
      }
      const data = await res.json()
      toast({ title: 'تم', description: `تم ${labels[action]} ${data.updated} معدة` })
      setSelectedIds([])
      loadEquipment()
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل العملية',
        variant: 'destructive',
      })
    } finally {
      setBulkLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المعدة؟')) return
    try {
      const response = await fetch(`/api/equipment/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete equipment')
      }
      toast({ title: 'نجح', description: 'تم حذف المعدة بنجاح' })
      loadEquipment()
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل حذف المعدة',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-end gap-3">
        <SpecificationsAuditDialog />
        <Button variant="outline" asChild>
          <Link href="/admin/inventory/import">استيراد Excel</Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleMigrateSpecs}
          disabled={migratingSpecs}
        >
          {migratingSpecs ? (
            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="ml-2 h-4 w-4" />
          )}
          تحديث كل المواصفات
        </Button>
        <Button asChild>
          <Link href="/admin/inventory/equipment/new">
            <Plus className="ml-2 h-4 w-4" />
            إضافة معدات
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pb-3 pt-4">
            <p className="text-sm text-muted-foreground">إجمالي المعدات</p>
            <p className="text-2xl font-bold">{inventoryStats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-3 pt-4">
            <p className="text-sm text-muted-foreground">نشطة</p>
            <p className="text-2xl font-bold text-green-600">{inventoryStats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-3 pt-4">
            <p className="text-sm text-muted-foreground">مخزون منخفض</p>
            <p
              className={`text-2xl font-bold ${inventoryStats.lowStock > 0 ? 'text-amber-600' : ''}`}
            >
              {inventoryStats.lowStock}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-3 pt-4">
            <p className="text-sm text-muted-foreground">صيانة / تالفة</p>
            <p
              className={`text-2xl font-bold ${inventoryStats.inMaintenance > 0 ? 'text-red-600' : ''}`}
            >
              {inventoryStats.inMaintenance}
            </p>
          </CardContent>
        </Card>
      </div>

      {inventoryStats.lowStock > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">تنبيه مخزون منخفض</AlertTitle>
          <AlertDescription className="text-amber-700">
            {inventoryStats.lowStock} معدة لديها مخزون متاح ≤ {LOW_STOCK_THRESHOLD}. تحقق من الكميات
            وأعد التعبئة.
          </AlertDescription>
        </Alert>
      )}

      {selectedIds.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="flex flex-wrap items-center gap-3 py-3">
            <span className="text-sm font-medium">{selectedIds.length} معدة محددة</span>
            <Button
              size="sm"
              variant="outline"
              disabled={bulkLoading}
              onClick={() => handleBulkAction('activate')}
            >
              <Power className="ml-1 h-4 w-4" /> تفعيل
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={bulkLoading}
              onClick={() => handleBulkAction('deactivate')}
            >
              <PowerOff className="ml-1 h-4 w-4" /> إلغاء تفعيل
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={bulkLoading}
              onClick={() => handleBulkAction('delete')}
            >
              {bulkLoading ? (
                <Loader2 className="ml-1 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="ml-1 h-4 w-4" />
              )}
              حذف
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
              إلغاء التحديد
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input
                placeholder="بحث (SKU، الموديل، الفئة)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
                dir="rtl"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="جميع الفئات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الفئات</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={conditionFilter} onValueChange={setConditionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="جميع الحالات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="EXCELLENT">ممتاز</SelectItem>
                <SelectItem value="GOOD">جيد</SelectItem>
                <SelectItem value="FAIR">مقبول</SelectItem>
                <SelectItem value="POOR">ضعيف</SelectItem>
                <SelectItem value="MAINTENANCE">صيانة</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="جميع الحالات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="inactive">غير نشط</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredEquipment.length === 0 ? (
            <EmptyState
              title="لا توجد معدات"
              description="لم يتم العثور على معدات تطابق البحث أو الفلتر. أضف معدات جديدة من الزر أدناه أو عدّل معايير البحث."
              icon={<Package className="h-12 w-12" />}
              actionLabel="إضافة معدات"
              actionHref="/admin/inventory/equipment/new"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        filteredEquipment.length > 0 &&
                        selectedIds.length === filteredEquipment.length
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-24">الصورة</TableHead>
                  <TableHead className="min-w-[120px]">SKU</TableHead>
                  <TableHead className="min-w-[180px]">الموديل</TableHead>
                  <TableHead>الفئة</TableHead>
                  <TableHead>العلامة التجارية</TableHead>
                  <TableHead>حالة المعدة</TableHead>
                  <TableHead>المتاح / الإجمالي</TableHead>
                  <TableHead>آخر صيانة</TableHead>
                  <TableHead>السعر اليومي</TableHead>
                  <TableHead>النشاط</TableHead>
                  <TableHead className="min-w-[140px]">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEquipment.map((item) => {
                  const featuredImage = item.media?.[0]?.url
                  return (
                    <TableRow
                      key={item.id}
                      className={
                        item.quantityAvailable <= LOW_STOCK_THRESHOLD && item.isActive
                          ? 'bg-amber-50/50'
                          : ''
                      }
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                        />
                      </TableCell>
                      <TableCell className="align-middle">
                        {featuredImage ? (
                          <div className="relative inline-block h-12 w-12 overflow-hidden rounded border border-neutral-200">
                            <Image
                              src={featuredImage}
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
                      <TableCell>
                        <span className="block max-w-[200px] truncate" title={item.model ?? undefined}>
                          {item.model || '-'}
                        </span>
                      </TableCell>
                      <TableCell>{item.category.name}</TableCell>
                      <TableCell>{item.brand?.name || '-'}</TableCell>
                      <TableCell className="align-middle">
                        <Badge
                          className="inline-flex items-center"
                          style={{
                            backgroundColor: CONDITION_COLORS[item.condition],
                            color: '#fff',
                          }}
                        >
                          {CONDITION_LABELS[item.condition]}
                        </Badge>
                      </TableCell>
                      <TableCell className="inline-flex items-center gap-1">
                        <span
                          className={
                            item.quantityAvailable <= LOW_STOCK_THRESHOLD && item.isActive
                              ? 'font-bold text-amber-600'
                              : ''
                          }
                        >
                          {item.quantityAvailable}
                        </span>
                        {' / '}
                        {item.quantityTotal}
                        {item.quantityAvailable <= LOW_STOCK_THRESHOLD && item.isActive && (
                          <AlertTriangle className="inline h-3.5 w-3.5 shrink-0 text-amber-500" />
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.maintenance?.[0]?.completedDate
                          ? formatDate(item.maintenance[0].completedDate)
                          : '—'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {Number(item.dailyPrice).toLocaleString('ar-SA')} ر.س
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.isActive ? 'default' : 'secondary'} className="inline-flex items-center">
                          {item.isActive ? 'نشط' : 'غير نشط'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/inventory/equipment/${item.id}`}>عرض</Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/inventory/equipment/${item.id}/edit`}>تعديل</Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                            className="text-error-600 hover:text-error-700"
                          >
                            حذف
                          </Button>
                        </div>
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
