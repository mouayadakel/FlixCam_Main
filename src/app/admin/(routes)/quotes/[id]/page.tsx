/**
 * @file quotes/[id]/page.tsx
 * @description Quote detail page
 * @module app/admin/(routes)/quotes
 * @author Engineering Team
 * @created 2026-01-28
 */

'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, ArrowLeft, FileText, Send, Check, X, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils/format.utils'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import type { Quote, QuoteStatus } from '@/lib/types/quote.types'

const STATUS_LABELS: Record<
  QuoteStatus,
  { ar: string; en: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  draft: { ar: 'مسودة', en: 'Draft', variant: 'outline' },
  sent: { ar: 'مرسل', en: 'Sent', variant: 'secondary' },
  accepted: { ar: 'مقبول', en: 'Accepted', variant: 'default' },
  rejected: { ar: 'مرفوض', en: 'Rejected', variant: 'destructive' },
  expired: { ar: 'منتهي', en: 'Expired', variant: 'outline' },
  converted: { ar: 'محول', en: 'Converted', variant: 'default' },
}

export default function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadQuote()
  }, [id])

  const loadQuote = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/quotes/${id}`)
      if (!response.ok) {
        throw new Error('فشل تحميل العرض')
      }

      const data = await response.json()
      setQuote(data.data)
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحميل العرض',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (status: QuoteStatus) => {
    try {
      const response = await fetch(`/api/quotes/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'فشل تحديث الحالة')
      }

      toast({
        title: 'نجح',
        description: 'تم تحديث حالة العرض بنجاح',
      })

      loadQuote()
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'حدث خطأ أثناء تحديث الحالة',
        variant: 'destructive',
      })
    }
  }

  const handleConvert = async () => {
    try {
      const response = await fetch(`/api/quotes/${id}/convert`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'فشل تحويل العرض')
      }

      toast({
        title: 'نجح',
        description: 'تم تحويل العرض إلى حجز بنجاح',
      })

      router.push(`/admin/bookings/${id}`)
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'حدث خطأ أثناء تحويل العرض',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6" dir="rtl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="space-y-6" dir="rtl">
        <p>العرض غير موجود</p>
      </div>
    )
  }

  const isExpired = new Date(quote.validUntil) < new Date()
  const canConvert =
    quote.status === 'draft' || quote.status === 'sent' || quote.status === 'accepted'
  const canEdit = quote.status === 'draft'

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">عرض السعر #{quote.quoteNumber}</h1>
          <p className="mt-2 text-muted-foreground">تفاصيل عرض السعر</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/quotes">
            <Button variant="outline">
              <ArrowLeft className="ml-2 h-4 w-4" />
              العودة
            </Button>
          </Link>
          {canConvert && (
            <Button onClick={handleConvert}>
              <ArrowRight className="ml-2 h-4 w-4" />
              تحويل إلى حجز
            </Button>
          )}
        </div>
      </div>

      {/* Quote Information */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">معلومات العرض</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">رقم العرض:</span>
              <div className="font-medium">{quote.quoteNumber}</div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">الحالة:</span>
              <div>
                <Badge variant={STATUS_LABELS[quote.status]?.variant || 'default'}>
                  {STATUS_LABELS[quote.status]?.ar || quote.status}
                </Badge>
              </div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">صالح حتى:</span>
              <div className={isExpired ? 'font-medium text-destructive' : ''}>
                {formatDate(quote.validUntil)}
                {isExpired && ' (منتهي)'}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">معلومات العميل</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">الاسم:</span>
              <div className="font-medium">{quote.customer?.name || 'غير محدد'}</div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">البريد الإلكتروني:</span>
              <div className="font-medium">{quote.customer?.email}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">المبالغ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">المجموع الفرعي:</span>
              <div className="font-medium">{formatCurrency(quote.subtotal)}</div>
            </div>
            {quote.discount && quote.discount > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">الخصم:</span>
                <div className="font-medium text-green-600">-{formatCurrency(quote.discount)}</div>
              </div>
            )}
            <div>
              <span className="text-sm text-muted-foreground">ضريبة القيمة المضافة:</span>
              <div className="font-medium">{formatCurrency(quote.vatAmount)}</div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">المبلغ الإجمالي:</span>
              <div className="text-lg font-bold">{formatCurrency(quote.totalAmount)}</div>
            </div>
            {quote.depositAmount && (
              <div>
                <span className="text-sm text-muted-foreground">الضمان:</span>
                <div className="font-medium">{formatCurrency(quote.depositAmount)}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dates */}
      <Card>
        <CardHeader>
          <CardTitle>التواريخ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <span className="text-sm text-muted-foreground">تاريخ البداية:</span>
              <div className="font-medium">{formatDate(quote.startDate)}</div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">تاريخ النهاية:</span>
              <div className="font-medium">{formatDate(quote.endDate)}</div>
            </div>
            {quote.studioStartTime && quote.studioEndTime && (
              <>
                <div>
                  <span className="text-sm text-muted-foreground">وقت بداية الاستوديو:</span>
                  <div className="font-medium">{formatDate(quote.studioStartTime)}</div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">وقت نهاية الاستوديو:</span>
                  <div className="font-medium">{formatDate(quote.studioEndTime)}</div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Equipment */}
      <Card>
        <CardHeader>
          <CardTitle>المعدات</CardTitle>
        </CardHeader>
        <CardContent>
          {quote.equipment.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد معدات</p>
          ) : (
            <div className="space-y-2">
              {quote.equipment.map((item, index) => (
                <div key={index} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">SKU: {item.equipmentId}</div>
                      <div className="text-sm text-muted-foreground">
                        الكمية: {item.quantity} × {formatCurrency(item.dailyRate)}/يوم ×{' '}
                        {item.totalDays} يوم
                      </div>
                    </div>
                    <div className="font-medium">{formatCurrency(item.subtotal)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>الإجراءات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {quote.status === 'draft' && (
              <>
                <Button variant="outline" onClick={() => handleStatusUpdate('sent')}>
                  <Send className="ml-2 h-4 w-4" />
                  إرسال للعميل
                </Button>
              </>
            )}
            {quote.status === 'sent' && (
              <>
                <Button variant="outline" onClick={() => handleStatusUpdate('accepted')}>
                  <Check className="ml-2 h-4 w-4" />
                  قبول العرض
                </Button>
                <Button variant="outline" onClick={() => handleStatusUpdate('rejected')}>
                  <X className="ml-2 h-4 w-4" />
                  رفض العرض
                </Button>
              </>
            )}
            {canConvert && (
              <Button onClick={handleConvert}>
                <ArrowRight className="ml-2 h-4 w-4" />
                تحويل إلى حجز
              </Button>
            )}
            {quote.convertedToBookingId && (
              <Link href={`/admin/bookings/${quote.convertedToBookingId}`}>
                <Button variant="outline">
                  <FileText className="ml-2 h-4 w-4" />
                  عرض الحجز
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
