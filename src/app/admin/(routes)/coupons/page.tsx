/**
 * @file coupons/page.tsx
 * @description Coupons list page
 * @module app/admin/(routes)/coupons
 * @author Engineering Team
 * @created 2026-01-28
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Eye, Tag, Calendar, Users } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils/format.utils'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import type { CouponStatus, CouponType } from '@/lib/types/coupon.types'

interface Coupon {
  id: string
  code: string
  type: CouponType
  value: number
  minPurchaseAmount?: number | null
  maxDiscountAmount?: number | null
  usageLimit?: number | null
  usageCount: number
  status: CouponStatus
  validFrom: string
  validUntil: string
  description?: string | null
  createdAt: string
  updatedAt: string
}

const STATUS_LABELS: Record<CouponStatus, { ar: string; en: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { ar: 'نشط', en: 'Active', variant: 'default' },
  inactive: { ar: 'غير نشط', en: 'Inactive', variant: 'secondary' },
  expired: { ar: 'منتهي', en: 'Expired', variant: 'destructive' },
  scheduled: { ar: 'مجدول', en: 'Scheduled', variant: 'outline' },
}

const TYPE_LABELS: Record<CouponType, { ar: string; en: string }> = {
  percent: { ar: 'نسبة مئوية', en: 'Percentage' },
  fixed: { ar: 'مبلغ ثابت', en: 'Fixed Amount' },
}

export default function CouponsPage() {
  const { toast } = useToast()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const statuses: Array<CouponStatus | 'all'> = [
    'all',
    'active',
    'inactive',
    'expired',
    'scheduled',
  ]

  const types: Array<CouponType | 'all'> = [
    'all',
    'percent',
    'fixed',
  ]

  useEffect(() => {
    loadCoupons()
  }, [statusFilter, typeFilter, searchQuery])

  const loadCoupons = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (searchQuery) params.set('search', searchQuery)
      params.set('page', '1')
      params.set('pageSize', '50')

      const response = await fetch(`/api/coupons?${params.toString()}`)
      if (!response.ok) {
        throw new Error('فشل تحميل الكوبونات')
      }

      const data = await response.json()
      setCoupons(data.data || [])
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحميل الكوبونات',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredCoupons = useMemo(() => {
    return coupons
  }, [coupons])

  const getStatusLabel = (status: CouponStatus) => {
    return STATUS_LABELS[status]?.ar || status
  }

  const getStatusVariant = (status: CouponStatus) => {
    return STATUS_LABELS[status]?.variant || 'default'
  }

  const getTypeLabel = (type: CouponType) => {
    return TYPE_LABELS[type]?.ar || type
  }

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.type === 'percent') {
      return `${coupon.value}%`
    }
    return formatCurrency(coupon.value)
  }

  const isExpired = (coupon: Coupon) => {
    return new Date(coupon.validUntil) < new Date()
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">الكوبونات</h1>
          <p className="text-muted-foreground mt-2">
            إدارة كوبونات الخصم والعروض
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/coupons/new">
            <Plus className="h-4 w-4 ml-2" />
            كوبون جديد
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center flex-wrap">
        <input
          type="text"
          placeholder="البحث برمز الكوبون..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2 border rounded-lg flex-1 min-w-[200px]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status === 'all' ? 'جميع الحالات' : STATUS_LABELS[status as CouponStatus]?.ar || status}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          {types.map((type) => (
            <option key={type} value={type}>
              {type === 'all' ? 'جميع الأنواع' : TYPE_LABELS[type as CouponType]?.ar || type}
            </option>
          ))}
        </select>
      </div>

      {/* Coupons Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رمز الكوبون</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>الخصم</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الاستخدام</TableHead>
              <TableHead>تاريخ الانتهاء</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="space-y-2 py-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredCoupons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  لا توجد كوبونات
                </TableCell>
              </TableRow>
            ) : (
              filteredCoupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      {coupon.code}
                    </div>
                  </TableCell>
                  <TableCell>{getTypeLabel(coupon.type)}</TableCell>
                  <TableCell>
                    <span className="font-medium text-green-600">
                      {formatDiscount(coupon)}
                    </span>
                    {coupon.maxDiscountAmount && (
                      <div className="text-xs text-muted-foreground">
                        (حد أقصى: {formatCurrency(coupon.maxDiscountAmount)})
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(coupon.status)}>
                      {getStatusLabel(coupon.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {coupon.usageCount}
                      {coupon.usageLimit && ` / ${coupon.usageLimit}`}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className={isExpired(coupon) ? 'text-destructive' : ''}>
                        {formatDate(coupon.validUntil)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/admin/coupons/${coupon.id}`}>
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4 ml-1" />
                          عرض
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
