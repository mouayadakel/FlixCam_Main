/**
 * @file page.tsx
 * @description Equipment list page with filters, search, and pagination
 * @module app/admin/(routes)/inventory/equipment
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Search, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
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

export default function EquipmentPage() {
  const { toast } = useToast()
  const [equipment, setEquipment] = useState<EquipmentWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [conditionFilter, setConditionFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])

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

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المعدة؟')) return

    try {
      const response = await fetch(`/api/equipment/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete equipment')
      }

      toast({
        title: 'نجح',
        description: 'تم حذف المعدة بنجاح',
      })

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">المعدات</h1>
          <p className="mt-1 text-sm text-neutral-600">إدارة جميع المعدات والمعدات</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/admin/inventory/import">
              استيراد Excel
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/inventory/equipment/new">
              <Plus className="ml-2 h-4 w-4" />
              إضافة معدات
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {/* Search */}
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

            {/* Category Filter */}
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

            {/* Condition Filter */}
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

            {/* Status Filter */}
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

      {/* Equipment Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredEquipment.length === 0 ? (
            <div className="py-12 text-center text-neutral-500">
              لا توجد معدات
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الصورة</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>الموديل</TableHead>
                  <TableHead>الفئة</TableHead>
                  <TableHead>العلامة التجارية</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>المتاح / الإجمالي</TableHead>
                  <TableHead>آخر صيانة</TableHead>
                  <TableHead>السعر اليومي</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEquipment.map((item) => {
                  const featuredImage = item.media?.[0]?.url
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        {featuredImage ? (
                          <div className="relative h-12 w-12 rounded border border-neutral-200 overflow-hidden">
                            <Image
                              src={featuredImage}
                              alt={item.sku}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="h-12 w-12 rounded border border-neutral-200 bg-neutral-100 flex items-center justify-center">
                            <Package className="h-5 w-5 text-neutral-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell>{item.model || '-'}</TableCell>
                      <TableCell>{item.category.name}</TableCell>
                      <TableCell>{item.brand?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          style={{
                            backgroundColor: CONDITION_COLORS[item.condition],
                            color: '#fff',
                          }}
                        >
                          {CONDITION_LABELS[item.condition]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.quantityAvailable} / {item.quantityTotal}
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
                        <Badge variant={item.isActive ? 'default' : 'secondary'}>
                          {item.isActive ? 'نشط' : 'غير نشط'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/inventory/equipment/${item.id}`}>
                              عرض
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/inventory/equipment/${item.id}/edit`}>
                              تعديل
                            </Link>
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
