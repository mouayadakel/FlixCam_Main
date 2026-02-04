/**
 * @file coupons/[id]/page.tsx
 * @description Coupon detail page
 * @module app/admin/(routes)/coupons/[id]
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowRight, 
  Tag, 
  Calendar,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  Edit,
  Trash2,
  Copy,
  ToggleLeft,
  ToggleRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/lib/utils/format.utils'

interface Coupon {
  id: string
  code: string
  type: 'percent' | 'fixed'
  value: number
  minPurchaseAmount?: number | null
  maxDiscountAmount?: number | null
  usageLimit?: number | null
  usageCount: number
  status: 'active' | 'inactive' | 'expired' | 'scheduled'
  validFrom: string
  validUntil: string
  description?: string | null
  applicableCategories?: string[] | null
  applicableProducts?: string[] | null
  createdAt: string
  updatedAt: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  active: { label: 'نشط', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  inactive: { label: 'غير نشط', color: 'bg-gray-100 text-gray-800', icon: Clock },
  expired: { label: 'منتهي', color: 'bg-red-100 text-red-800', icon: AlertCircle },
  scheduled: { label: 'مجدول', color: 'bg-blue-100 text-blue-800', icon: Calendar },
}

export default function CouponDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [coupon, setCoupon] = useState<Coupon | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    if (params?.id) {
      loadCoupon()
    }
  }, [params?.id])

  const loadCoupon = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/coupons/${params?.id}`)
      if (!response.ok) {
        throw new Error('فشل تحميل الكوبون')
      }
      const data = await response.json()
      setCoupon(data.data || data)
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحميل الكوبون',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!coupon) return
    
    setToggling(true)
    try {
      const newStatus = coupon.status === 'active' ? 'inactive' : 'active'
      const response = await fetch(`/api/coupons/${params?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('فشل تحديث الحالة')
      }

      toast({
        title: 'تم التحديث',
        description: `تم ${newStatus === 'active' ? 'تفعيل' : 'إلغاء تفعيل'} الكوبون`,
      })

      loadCoupon()
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحديث الحالة',
        variant: 'destructive',
      })
    } finally {
      setToggling(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/coupons/${params?.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('فشل حذف الكوبون')
      }

      toast({
        title: 'تم الحذف',
        description: 'تم حذف الكوبون بنجاح',
      })

      router.push('/admin/coupons')
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل حذف الكوبون',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  const copyCode = () => {
    if (coupon) {
      navigator.clipboard.writeText(coupon.code)
      toast({
        title: 'تم النسخ',
        description: 'تم نسخ رمز الكوبون',
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6" dir="rtl">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!coupon) {
    return (
      <div className="text-center py-12" dir="rtl">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg font-medium">الكوبون غير موجود</p>
        <Button asChild className="mt-4">
          <Link href="/admin/coupons">العودة إلى الكوبونات</Link>
        </Button>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[coupon.status] || STATUS_CONFIG.active
  const StatusIcon = statusConfig.icon
  const isExpired = new Date(coupon.validUntil) < new Date()
  const usagePercent = coupon.usageLimit ? (coupon.usageCount / coupon.usageLimit) * 100 : 0

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Tag className="h-8 w-8" />
            كوبون: {coupon.code}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge className={statusConfig.color}>
              <StatusIcon className="h-3 w-3 ml-1" />
              {statusConfig.label}
            </Badge>
            {isExpired && coupon.status !== 'expired' && (
              <Badge variant="destructive">منتهي الصلاحية</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/coupons">
              <ArrowRight className="h-4 w-4 ml-2" />
              العودة
            </Link>
          </Button>
          <Button variant="outline" onClick={copyCode}>
            <Copy className="h-4 w-4 ml-2" />
            نسخ الرمز
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/admin/coupons/${coupon.id}/edit`}>
              <Edit className="h-4 w-4 ml-2" />
              تعديل
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleting}>
                <Trash2 className="h-4 w-4 ml-2" />
                حذف
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent dir="rtl">
              <AlertDialogHeader>
                <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                <AlertDialogDescription>
                  سيتم حذف الكوبون نهائياً. هذا الإجراء لا يمكن التراجع عنه.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                  حذف
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">قيمة الخصم</p>
                <p className="text-2xl font-bold text-green-600">
                  {coupon.type === 'percent' ? `${coupon.value}%` : formatCurrency(coupon.value)}
                </p>
              </div>
              <Tag className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">مرات الاستخدام</p>
                <p className="text-2xl font-bold">
                  {coupon.usageCount}
                  {coupon.usageLimit && <span className="text-muted-foreground text-lg">/{coupon.usageLimit}</span>}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">تاريخ البداية</p>
                <p className="text-lg font-bold">{formatDate(coupon.validFrom)}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">تاريخ الانتهاء</p>
                <p className={`text-lg font-bold ${isExpired ? 'text-red-600' : ''}`}>
                  {formatDate(coupon.validUntil)}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>تفاصيل الكوبون</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">رمز الكوبون</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-lg font-bold bg-muted px-3 py-1 rounded">
                      {coupon.code}
                    </p>
                    <Button size="sm" variant="ghost" onClick={copyCode}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">نوع الخصم</p>
                  <p className="font-medium">
                    {coupon.type === 'percent' ? 'نسبة مئوية' : 'مبلغ ثابت'}
                  </p>
                </div>
                {coupon.minPurchaseAmount && (
                  <div>
                    <p className="text-sm text-muted-foreground">الحد الأدنى للشراء</p>
                    <p className="font-medium">{formatCurrency(coupon.minPurchaseAmount)}</p>
                  </div>
                )}
                {coupon.maxDiscountAmount && (
                  <div>
                    <p className="text-sm text-muted-foreground">الحد الأقصى للخصم</p>
                    <p className="font-medium">{formatCurrency(coupon.maxDiscountAmount)}</p>
                  </div>
                )}
              </div>
              
              {coupon.description && (
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-1">الوصف</p>
                  <p>{coupon.description}</p>
                </div>
              )}

              {coupon.usageLimit && (
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-2">نسبة الاستخدام</p>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${usagePercent >= 100 ? 'bg-red-500' : usagePercent >= 75 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(usagePercent, 100)}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {coupon.usageCount} من {coupon.usageLimit} ({usagePercent.toFixed(0)}%)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>الإجراءات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full" 
                variant={coupon.status === 'active' ? 'outline' : 'default'}
                onClick={handleToggleStatus}
                disabled={toggling || isExpired}
              >
                {coupon.status === 'active' ? (
                  <>
                    <ToggleLeft className="h-4 w-4 ml-2" />
                    إلغاء التفعيل
                  </>
                ) : (
                  <>
                    <ToggleRight className="h-4 w-4 ml-2" />
                    تفعيل
                  </>
                )}
              </Button>
              <Button className="w-full" variant="outline" onClick={copyCode}>
                <Copy className="h-4 w-4 ml-2" />
                نسخ الرمز
              </Button>
            </CardContent>
          </Card>

          {/* Info */}
          <Card>
            <CardHeader>
              <CardTitle>معلومات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">تاريخ الإنشاء</p>
                <p className="font-medium">{formatDate(coupon.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">آخر تحديث</p>
                <p className="font-medium">{formatDate(coupon.updatedAt)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
