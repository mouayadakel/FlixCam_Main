/**
 * @file coupons/page.tsx
 * @description Coupons list page
 * @module app/admin/(routes)/coupons
 * @author Engineering Team
 * @created 2026-01-28
 */

'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Eye, Tag, Calendar, Users, Copy, AlertTriangle, RefreshCw } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
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

const STATUS_LABELS: Record<
  CouponStatus,
  { ar: string; en: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
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

  const types: Array<CouponType | 'all'> = ['all', 'percent', 'fixed']

  const loadCoupons = useCallback(async () => {
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
  }, [statusFilter, typeFilter, searchQuery, toast])

  useEffect(() => {
    loadCoupons()
  }, [loadCoupons])

  const filteredCoupons = useMemo(() => {
    return coupons
  }, [coupons])

  const summary = useMemo(() => {
    const now = new Date()
    return {
      active: coupons.filter((c) => c.status === 'active').length,
      scheduled: coupons.filter((c) => c.status === 'scheduled').length,
      expired: coupons.filter((c) => c.status === 'expired').length,
      expiringSoon: coupons.filter(
        (c) =>
          c.status === 'active' &&
          new Date(c.validUntil) > now &&
          (new Date(c.validUntil).getTime() - now.getTime()) / 86400000 <= 7
      ).length,
      totalUsage: coupons.reduce((s, c) => s + c.usageCount, 0),
    }
  }, [coupons])

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast({ title: 'تم النسخ', description: `تم نسخ الرمز: ${code}` })
  }

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
          <p className="mt-2 text-muted-foreground">إدارة كوبونات الخصم والعروض</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadCoupons} disabled={loading}>
            <RefreshCw className={`ml-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          <Button asChild>
            <Link href="/admin/coupons/new">
              <Plus className="ml-2 h-4 w-4" />
              كوبون جديد
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card
          className="cursor-pointer hover:border-primary/50"
          onClick={() => setStatusFilter('active')}
        >
          <CardContent className="pb-3 pt-4">
            <p className="text-sm text-muted-foreground">نشط</p>
            <p className="text-2xl font-bold text-green-600">{summary.active}</p>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:border-primary/50"
          onClick={() => setStatusFilter('scheduled')}
        >
          <CardContent className="pb-3 pt-4">
            <p className="text-sm text-muted-foreground">مجدول</p>
            <p className="text-2xl font-bold text-blue-600">{summary.scheduled}</p>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:border-primary/50"
          onClick={() => setStatusFilter('expired')}
        >
          <CardContent className="pb-3 pt-4">
            <p className="text-sm text-muted-foreground">منتهي</p>
            <p className="text-2xl font-bold">{summary.expired}</p>
          </CardContent>
        </Card>
        <Card className={summary.expiringSoon > 0 ? 'border-amber-300' : ''}>
          <CardContent className="pb-3 pt-4">
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              <p className="text-sm text-muted-foreground">تنتهي خلال 7 أيام</p>
            </div>
            <p className={`text-2xl font-bold ${summary.expiringSoon > 0 ? 'text-amber-600' : ''}`}>
              {summary.expiringSoon}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-3 pt-4">
            <p className="text-sm text-muted-foreground">إجمالي الاستخدام</p>
            <p className="text-2xl font-bold">{summary.totalUsage}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor="coupons-search" className="sr-only">
          البحث برمز الكوبون
        </Label>
        <Input
          id="coupons-search"
          type="text"
          placeholder="البحث برمز الكوبون..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 min-w-[200px] flex-1 rounded-md border border-input"
          aria-label="البحث برمز الكوبون"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 rounded-md border border-input" aria-label="فلتر الحالة">
            <SelectValue placeholder="جميع الحالات" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status === 'all'
                  ? 'جميع الحالات'
                  : STATUS_LABELS[status as CouponStatus]?.ar || status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-9 rounded-md border border-input" aria-label="فلتر النوع">
            <SelectValue placeholder="جميع الأنواع" />
          </SelectTrigger>
          <SelectContent>
            {types.map((type) => (
              <SelectItem key={type} value={type}>
                {type === 'all' ? 'جميع الأنواع' : TYPE_LABELS[type as CouponType]?.ar || type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Coupons Table */}
      <div className="rounded-lg border">
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
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  لا توجد كوبونات
                </TableCell>
              </TableRow>
            ) : (
              filteredCoupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono">{coupon.code}</span>
                      <button
                        onClick={() => copyCode(coupon.code)}
                        className="text-muted-foreground hover:text-foreground"
                        title="نسخ الرمز"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>{getTypeLabel(coupon.type)}</TableCell>
                  <TableCell>
                    <span className="font-medium text-green-600">{formatDiscount(coupon)}</span>
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
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span>
                          {coupon.usageCount}
                          {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''}
                        </span>
                      </div>
                      {coupon.usageLimit && coupon.usageLimit > 0 && (
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{
                              width: `${Math.min(100, (coupon.usageCount / coupon.usageLimit) * 100)}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const now = new Date()
                      const expiry = new Date(coupon.validUntil)
                      const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / 86400000)
                      const expired = expiry < now
                      const expiringSoon = !expired && daysLeft <= 7
                      return (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {expired ? (
                            <span className="text-destructive">
                              {formatDate(coupon.validUntil)}
                            </span>
                          ) : expiringSoon ? (
                            <>
                              <span className="text-amber-600">
                                {formatDate(coupon.validUntil)}
                              </span>
                              <span className="text-xs text-amber-500">({daysLeft}د)</span>
                            </>
                          ) : (
                            <span>{formatDate(coupon.validUntil)}</span>
                          )}
                        </div>
                      )
                    })()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/admin/coupons/${coupon.id}`}>
                        <Button size="sm" variant="ghost">
                          <Eye className="ml-1 h-4 w-4" />
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
