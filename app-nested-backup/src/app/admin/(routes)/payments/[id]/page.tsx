/**
 * @file payments/[id]/page.tsx
 * @description Payment detail page
 * @module app/admin/(routes)/payments/[id]
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight,
  CreditCard,
  DollarSign,
  Calendar,
  User,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  RotateCcw,
  FileText,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/lib/utils/format.utils'

interface Payment {
  id: string
  bookingId: string
  amount: number
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED'
  tapTransactionId?: string | null
  tapChargeId?: string | null
  refundAmount?: number | null
  refundReason?: string | null
  metadata?: Record<string, any> | null
  booking?: {
    id: string
    bookingNumber: string
    customerId: string
    totalAmount: number
    customer?: {
      id: string
      name: string | null
      email: string
      phone?: string | null
    }
  } | null
  createdAt: string
  updatedAt: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: 'قيد الانتظار', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  PROCESSING: { label: 'قيد المعالجة', color: 'bg-blue-100 text-blue-800', icon: RefreshCw },
  SUCCESS: { label: 'ناجح', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  FAILED: { label: 'فشل', color: 'bg-red-100 text-red-800', icon: AlertCircle },
  REFUNDED: { label: 'مسترد', color: 'bg-purple-100 text-purple-800', icon: RotateCcw },
  PARTIALLY_REFUNDED: {
    label: 'مسترد جزئياً',
    color: 'bg-orange-100 text-orange-800',
    icon: RotateCcw,
  },
}

export default function PaymentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [payment, setPayment] = useState<Payment | null>(null)
  const [loading, setLoading] = useState(true)
  const [refundDialogOpen, setRefundDialogOpen] = useState(false)
  const [refunding, setRefunding] = useState(false)
  const [refundData, setRefundData] = useState({
    amount: '',
    reason: '',
  })

  useEffect(() => {
    if (params?.id) {
      loadPayment()
    }
  }, [params?.id])

  const loadPayment = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/payments/${params?.id}`)
      if (!response.ok) {
        throw new Error('فشل تحميل بيانات الدفعة')
      }
      const data = await response.json()
      setPayment(data.data || data)
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحميل بيانات الدفعة',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRefund = async () => {
    if (!refundData.amount || Number(refundData.amount) <= 0) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال مبلغ صحيح',
        variant: 'destructive',
      })
      return
    }

    if (!refundData.reason) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال سبب الاسترداد',
        variant: 'destructive',
      })
      return
    }

    setRefunding(true)
    try {
      const response = await fetch(`/api/payments/${params?.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refundAmount: Number(refundData.amount),
          refundReason: refundData.reason,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'فشل عملية الاسترداد')
      }

      const result = await response.json()
      const message =
        result.message ||
        (result.data?.approval
          ? 'تم طلب الاسترداد. في انتظار الموافقة.'
          : 'تم استرداد المبلغ بنجاح')
      toast({
        title: result.data?.approval ? 'طلب استرداد' : 'تم الاسترداد',
        description: message,
      })

      setRefundDialogOpen(false)
      setRefundData({ amount: '', reason: '' })
      loadPayment()
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل عملية الاسترداد',
        variant: 'destructive',
      })
    } finally {
      setRefunding(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6" dir="rtl">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!payment) {
    return (
      <div className="py-12 text-center" dir="rtl">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">الدفعة غير موجودة</p>
        <Button asChild className="mt-4">
          <Link href="/admin/payments">العودة إلى المدفوعات</Link>
        </Button>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[payment.status] || STATUS_CONFIG.PENDING
  const StatusIcon = statusConfig.icon
  const canRefund =
    payment.status === 'SUCCESS' && (!payment.refundAmount || payment.refundAmount < payment.amount)
  const refundableAmount = payment.amount - (payment.refundAmount || 0)

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <CreditCard className="h-8 w-8" />
            تفاصيل الدفعة
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge className={statusConfig.color}>
              <StatusIcon className="ms-1 h-3 w-3" />
              {statusConfig.label}
            </Badge>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{formatDate(payment.createdAt)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/payments">
              <ArrowRight className="ms-2 h-4 w-4" />
              العودة
            </Link>
          </Button>
          {canRefund && (
            <Button variant="destructive" onClick={() => setRefundDialogOpen(true)}>
              <RotateCcw className="ms-2 h-4 w-4" />
              استرداد
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">المبلغ</p>
                <p className="text-2xl font-bold">{formatCurrency(payment.amount)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        {payment.refundAmount && payment.refundAmount > 0 && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">المسترد</p>
                  <p className="text-2xl font-bold text-red-600">
                    -{formatCurrency(payment.refundAmount)}
                  </p>
                </div>
                <RotateCcw className="h-8 w-8 text-red-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">الصافي</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(payment.amount - (payment.refundAmount || 0))}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Payment Details */}
        <Card>
          <CardHeader>
            <CardTitle>تفاصيل الدفعة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">الحالة</p>
                <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">تاريخ الإنشاء</p>
                <p className="font-medium">{formatDate(payment.createdAt)}</p>
              </div>
              {payment.tapTransactionId && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">معرف المعاملة (Tap)</p>
                  <p className="mt-1 break-all rounded bg-muted p-2 font-mono text-sm">
                    {payment.tapTransactionId}
                  </p>
                </div>
              )}
              {payment.tapChargeId && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">معرف الشحن (Tap)</p>
                  <p className="mt-1 break-all rounded bg-muted p-2 font-mono text-sm">
                    {payment.tapChargeId}
                  </p>
                </div>
              )}
              {payment.refundReason && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">سبب الاسترداد</p>
                  <p className="mt-1 rounded bg-red-50 p-2 text-red-800">{payment.refundReason}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Customer & Booking Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              معلومات العميل والحجز
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {payment.booking?.customer && (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">العميل</p>
                  <Link
                    href={`/admin/clients/${payment.booking.customer.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {payment.booking.customer.name || payment.booking.customer.email}
                  </Link>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                  <p className="font-medium">{payment.booking.customer.email}</p>
                </div>
                {payment.booking.customer.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">الهاتف</p>
                    <p className="font-medium" dir="ltr">
                      {payment.booking.customer.phone}
                    </p>
                  </div>
                )}
              </>
            )}
            {payment.booking && (
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground">الحجز المرتبط</p>
                <Link
                  href={`/admin/bookings/${payment.booking.id}`}
                  className="mt-1 flex items-center gap-2 font-medium text-primary hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  {payment.booking.bookingNumber}
                </Link>
                <p className="mt-2 text-sm text-muted-foreground">
                  إجمالي الحجز: {formatCurrency(payment.booking.totalAmount)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Refund Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>استرداد المبلغ</DialogTitle>
            <DialogDescription>
              الحد الأقصى للاسترداد: {formatCurrency(refundableAmount)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>مبلغ الاسترداد *</Label>
              <Input
                type="number"
                value={refundData.amount}
                onChange={(e) => setRefundData({ ...refundData, amount: e.target.value })}
                placeholder="0.00"
                max={refundableAmount}
              />
            </div>
            <div className="space-y-2">
              <Label>سبب الاسترداد *</Label>
              <Textarea
                value={refundData.reason}
                onChange={(e) => setRefundData({ ...refundData, reason: e.target.value })}
                placeholder="اذكر سبب الاسترداد..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleRefund} disabled={refunding}>
              {refunding ? 'جاري الاسترداد...' : 'تأكيد الاسترداد'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
