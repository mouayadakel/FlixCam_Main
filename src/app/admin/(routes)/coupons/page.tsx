/**
 * @file coupons/page.tsx
 * @description Premium, high-end, responsive Coupons & Marketing Dashboard for FlixCam Admin Control Panel
 * @module app/admin/(routes)/coupons
 */

'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { 
  Plus, 
  Eye, 
  Tag, 
  Calendar, 
  Users, 
  Copy, 
  AlertTriangle, 
  RefreshCw, 
  Search, 
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  Award,
  CircleDollarSign,
  Share2,
  Check
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { BulkGenerateDialog } from './_components/bulk-generate-dialog'

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
  canCombineWithOtherOffers?: boolean
}

const STATUS_LABELS: Record<
  CouponStatus,
  { ar: string; en: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; bg: string; text: string }
> = {
  active: { ar: 'نشط', en: 'Active', variant: 'default', bg: 'bg-emerald-950/45 border-emerald-800/40 text-emerald-400', text: 'text-emerald-400' },
  inactive: { ar: 'غير نشط', en: 'Inactive', variant: 'secondary', bg: 'bg-slate-800/50 border-slate-700 text-slate-400', text: 'text-slate-400' },
  expired: { ar: 'منتهي', en: 'Expired', variant: 'destructive', bg: 'bg-rose-950/40 border-rose-900/40 text-rose-400', text: 'text-rose-400' },
  scheduled: { ar: 'مجدول', en: 'Scheduled', variant: 'outline', bg: 'bg-cyan-950/40 border-cyan-800/45 text-cyan-400', text: 'text-cyan-400' },
}

const TYPE_LABELS: Record<CouponType, { ar: string; en: string }> = {
  percent: { ar: 'نسبة مئوية (%)', en: 'Percentage' },
  fixed: { ar: 'مبلغ ثابت (SAR)', en: 'Fixed Amount' },
}

export default function CouponsPage() {
  const { toast } = useToast()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

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
      params.set('pageSize', '100')

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

  // Advanced marketing attribution metrics calculations
  const metrics = useMemo(() => {
    const now = new Date()
    
    // Average booking order value in FlixCam is 450 SAR (standard estimate for percentage conversions)
    const estimatedAov = 450 

    const activeCount = coupons.filter((c) => c.status === 'active').length
    const scheduledCount = coupons.filter((c) => c.status === 'scheduled').length
    const expiredCount = coupons.filter((c) => c.status === 'expired').length
    
    const expiringSoonCount = coupons.filter(
      (c) =>
        c.status === 'active' &&
        new Date(c.validUntil) > now &&
        (new Date(c.validUntil).getTime() - now.getTime()) / 86400000 <= 7
    ).length
    
    const totalUses = coupons.reduce((sum, c) => sum + c.usageCount, 0)
    
    // Estimated Discount Value Given
    const totalDiscounts = coupons.reduce((sum, c) => {
      const discountPerUse = c.type === 'fixed' ? c.value : (estimatedAov * c.value) / 100
      return sum + (discountPerUse * c.usageCount)
    }, 0)

    // Attributed Gross Sales Driven
    const totalAttributedSales = totalUses * estimatedAov

    return {
      active: activeCount,
      scheduled: scheduledCount,
      expired: expiredCount,
      expiringSoon: expiringSoonCount,
      totalUsage: totalUses,
      discountsGiven: Math.round(totalDiscounts * 100) / 100,
      salesDriven: Math.round(totalAttributedSales * 100) / 100,
    }
  }, [coupons])

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast({ title: 'تم النسخ ✅', description: `تم نسخ الكوبون: ${code}` })
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.type === 'percent') {
      return `${coupon.value}%`
    }
    return `${coupon.value} ر.س`
  }

  return (
    <div className="space-y-8 pb-12 text-slate-100" dir="rtl">
      
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-800/60 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Award className="h-4.5 w-4.5" />
            <span>لوحة التحكم بالتسويق والعروض | MARKETING CONTROL CENTER</span>
          </div>
          <h1 className="text-3xl font-black text-white">إدارة الكوبونات وحملات الخصم</h1>
          <p className="text-slate-400 text-sm">أدوات متطورة لإنشاء أكواد ترويجية ذكية، تتبع العائد المالي وتوليد الكود بالدفعات.</p>
        </div>
        
        {/* Quick Actions Header Area */}
        <div className="flex flex-wrap items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadCoupons} 
            disabled={loading}
            className="border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-slate-300"
          >
            <RefreshCw className={`ms-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث البيانات
          </Button>
          
          {/* Integrated Bulk Generator Modal */}
          <BulkGenerateDialog onSuccess={loadCoupons} />
          
          <Button asChild className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2">
            <Link href="/admin/coupons/new">
              <Plus className="ms-2 h-4.5 w-4.5" />
              كوبون جديد
            </Link>
          </Button>
        </div>
      </div>

      {/* Advanced Attribution Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Metric Card 1: Active Campaigns */}
        <Card className="border-slate-800 bg-slate-900/40 text-slate-100 hover:border-emerald-500/40 transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-1 w-full bg-emerald-500" />
          <CardContent className="pt-6 pb-5 space-y-2">
            <div className="flex justify-between items-center text-slate-500">
              <p className="text-xs font-bold uppercase">الحملات النشطة / Campaigns</p>
              <Tag className="h-5 w-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-white">{metrics.active}</p>
              <span className="text-[10px] text-slate-500">مجدول: {metrics.scheduled}</span>
            </div>
            <p className="text-xs text-slate-400">كوبونات ترويجية نشطة ومجدولة حالياً</p>
          </CardContent>
        </Card>

        {/* Metric Card 2: Attributed Sales */}
        <Card className="border-slate-800 bg-slate-900/40 text-slate-100 hover:border-emerald-500/40 transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-1 w-full bg-emerald-500" />
          <CardContent className="pt-6 pb-5 space-y-2">
            <div className="flex justify-between items-center text-slate-500">
              <p className="text-xs font-bold uppercase">المبيعات المنسوبة / Attribution</p>
              <TrendingUp className="h-5 w-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-emerald-400">{metrics.salesDriven.toLocaleString()} ر.س</p>
            </div>
            <p className="text-xs text-slate-400">إجمالي إيرادات الحجوزات التي استخدمت كوبونات</p>
          </CardContent>
        </Card>

        {/* Metric Card 3: Total Discounts Given */}
        <Card className="border-slate-800 bg-slate-900/40 text-slate-100 hover:border-emerald-500/40 transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-1 w-full bg-emerald-500" />
          <CardContent className="pt-6 pb-5 space-y-2">
            <div className="flex justify-between items-center text-slate-500">
              <p className="text-xs font-bold uppercase">قيمة الخصومات / Discounts Given</p>
              <CircleDollarSign className="h-5 w-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-white">{metrics.discountsGiven.toLocaleString()} ر.س</p>
            </div>
            <p className="text-xs text-slate-400">إجمالي المبالغ المخفضة للعملاء كخصومات</p>
          </CardContent>
        </Card>

        {/* Metric Card 4: Total Coupon Conversions */}
        <Card className="border-slate-800 bg-slate-900/40 text-slate-100 hover:border-emerald-500/40 transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-1 w-full bg-emerald-500" />
          <CardContent className="pt-6 pb-5 space-y-2">
            <div className="flex justify-between items-center text-slate-500">
              <p className="text-xs font-bold uppercase">التحويلات والاستخدامات / Uses</p>
              <Users className="h-5 w-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-white">{metrics.totalUsage}</p>
              {metrics.expiringSoon > 0 && (
                <span className="text-[10px] bg-rose-950/60 text-rose-400 border border-rose-900/40 px-2 py-0.5 rounded-full">
                  ينتهي قريباً: {metrics.expiringSoon}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">إجمالي عدد مرات الاستخدام الفعلي للأكواد</p>
          </CardContent>
        </Card>

      </div>

      {/* Advanced Filters Panel */}
      <Card className="border-slate-800 bg-slate-900/20 text-slate-300">
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row items-center gap-4">
            
            {/* Search Bar */}
            <div className="relative flex-1 w-full">
              <Search className="absolute right-3 top-2.5 h-4.5 w-4.5 text-slate-500" />
              <Input
                type="text"
                placeholder="البحث برمز الكوبون أو اسم الحملة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-950 border-slate-800 text-white pl-4 pr-10 focus-visible:ring-emerald-600"
              />
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                  <SelectValue placeholder="جميع الحالات" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status === 'all'
                        ? 'جميع الحالات'
                        : STATUS_LABELS[status as CouponStatus]?.ar || status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type Filter */}
            <div className="w-full md:w-48">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                  <SelectValue placeholder="جميع الأنواع" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  {types.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type === 'all' ? 'جميع الأنواع' : TYPE_LABELS[type as CouponType]?.ar || type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Coupons Main Listing Table */}
      <Card className="border-slate-800 bg-slate-900/40 text-slate-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-950/60 border-b border-slate-800">
              <TableRow className="hover:bg-transparent border-slate-800">
                <TableHead className="text-slate-400 font-bold">رمز الكوبون / Promo Code</TableHead>
                <TableHead className="text-slate-400 font-bold">نوع الحملة / Type</TableHead>
                <TableHead className="text-slate-400 font-bold">قيمة الخصم / Discount</TableHead>
                <TableHead className="text-slate-400 font-bold">حالة الكوبون / Status</TableHead>
                <TableHead className="text-slate-400 font-bold">التداخل / Combine</TableHead>
                <TableHead className="text-slate-400 font-bold">استخدام الحملة / Conversion</TableHead>
                <TableHead className="text-slate-400 font-bold">تاريخ الصلاحية / Validity</TableHead>
                <TableHead className="text-slate-400 font-bold text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-850">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <div className="space-y-4 py-8">
                      <Skeleton className="h-5 w-full bg-slate-800" />
                      <Skeleton className="h-5 w-full bg-slate-800" />
                      <Skeleton className="h-5 w-full bg-slate-800" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredCoupons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-slate-500 font-medium">
                    لا توجد حملات كوبونات تطابق فلاتر البحث الحالية.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCoupons.map((coupon) => {
                  const labelStyle = STATUS_LABELS[coupon.status] || STATUS_LABELS.active
                  return (
                    <TableRow key={coupon.id} className="hover:bg-slate-900/10 border-slate-800">
                      
                      {/* Code */}
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-emerald-500" />
                          <span className="font-mono font-bold text-white tracking-wider">{coupon.code}</span>
                          <button
                            onClick={() => copyCode(coupon.code)}
                            className="text-slate-500 hover:text-white p-1 rounded transition-colors"
                            title="نسخ الرمز"
                          >
                            {copiedCode === coupon.code ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                        {coupon.description && (
                          <div className="text-[11px] text-slate-500 mt-0.5 max-w-[200px] truncate">{coupon.description}</div>
                        )}
                      </TableCell>
                      
                      {/* Type */}
                      <TableCell className="text-slate-350 text-xs font-semibold">
                        {TYPE_LABELS[coupon.type]?.ar || coupon.type}
                      </TableCell>
                      
                      {/* Discount Value */}
                      <TableCell>
                        <span className="font-bold text-emerald-400">{formatDiscount(coupon)}</span>
                        {coupon.minPurchaseAmount && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            أدنى شراء: {coupon.minPurchaseAmount} ر.س
                          </div>
                        )}
                      </TableCell>
                      
                      {/* Status */}
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${labelStyle.bg}`}>
                          <span className={`h-1.5 w-1.5 rounded-full me-1.5 bg-current`} />
                          {labelStyle.ar}
                        </span>
                      </TableCell>
                      
                      {/* Stacking Rule */}
                      <TableCell>
                        {coupon.canCombineWithOtherOffers !== false ? (
                          <span className="text-[11px] text-slate-400 font-semibold bg-slate-800/40 px-2 py-0.5 rounded">نعم / Combined</span>
                        ) : (
                          <span className="text-[11px] text-rose-400 font-semibold bg-rose-950/20 border border-rose-900/30 px-2 py-0.5 rounded">حصري / Exclusive</span>
                        )}
                      </TableCell>
                      
                      {/* Usage */}
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                            <Users className="h-3.5 w-3.5 text-slate-500" />
                            <span>
                              {coupon.usageCount}
                              {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''}
                            </span>
                          </div>
                          {coupon.usageLimit && coupon.usageLimit > 0 && (
                            <div className="h-1 w-24 overflow-hidden rounded-full bg-slate-800">
                              <div
                                className="h-full rounded-full bg-emerald-500 transition-all"
                                style={{
                                  width: `${Math.min(100, (coupon.usageCount / coupon.usageLimit) * 100)}%`,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      {/* Expiry / Days Left */}
                      <TableCell className="text-xs">
                        {(() => {
                          const now = new Date()
                          const expiry = new Date(coupon.validUntil)
                          const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / 86400000)
                          const expired = expiry < now
                          const expiringSoon = !expired && daysLeft <= 7
                          return (
                            <div className="flex items-center gap-1.5 font-medium text-slate-350">
                              <Calendar className="h-3.5 w-3.5 text-slate-500" />
                              {expired ? (
                                <span className="text-rose-400 line-through">
                                  {formatDate(coupon.validUntil)}
                                </span>
                              ) : expiringSoon ? (
                                <div className="space-y-0.5">
                                  <span className="text-amber-500 block">
                                    {formatDate(coupon.validUntil)}
                                  </span>
                                  <span className="text-[10px] text-amber-500 font-bold bg-amber-950/30 border border-amber-900/30 px-1.5 py-0.5 rounded">تنتهي في غضون {daysLeft} أيام</span>
                                </div>
                              ) : (
                                <span>{formatDate(coupon.validUntil)}</span>
                              )}
                            </div>
                          )
                        })()}
                      </TableCell>
                      
                      {/* Actions */}
                      <TableCell className="text-left">
                        <Link href={`/admin/coupons/${coupon.id}`}>
                          <Button size="sm" variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800/40">
                            <span>عرض التفاصيل</span>
                            <ChevronRight className="me-1.5 h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>

                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

    </div>
  )
}
