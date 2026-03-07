/**
 * @file bookings/guest/page.tsx
 * @description Guest booking view page. Standalone, no portal nav.
 * Fetches booking by token from URL and displays summary.
 * @module app/(public)/bookings/guest
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils/format.utils'
import { Package, Calendar, CreditCard, User, Mail } from 'lucide-react'

interface GuestBookingEquipment {
  model: string | null
  sku: string
  quantity: number
}

interface GuestBookingData {
  id: string
  bookingNumber: string
  status: string
  startDate: string
  endDate: string
  totalAmount: number
  vatAmount: number
  depositAmount: number | null
  guestName: string | null
  guestEmail: string | null
  equipment: GuestBookingEquipment[]
  paymentStatus: string
}

interface ApiResponse {
  success: boolean
  data?: GuestBookingData
  error?: string
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'مسودة',
  RISK_CHECK: 'فحص المخاطر',
  PAYMENT_PENDING: 'بانتظار الدفع',
  CONFIRMED: 'مؤكد',
  ACTIVE: 'نشط',
  RETURNED: 'تم الإرجاع',
  CLOSED: 'مغلق',
  CANCELLED: 'ملغي',
}

const PAYMENT_LABELS: Record<string, string> = {
  PENDING: 'بانتظار الدفع',
  PROCESSING: 'قيد المعالجة',
  SUCCESS: 'مدفوع',
  FAILED: 'فشل',
  REFUNDED: 'مسترد',
  PARTIALLY_REFUNDED: 'مسترد جزئياً',
}

function getStatusVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (['CONFIRMED', 'ACTIVE', 'RETURNED', 'CLOSED'].includes(status)) return 'default'
  if (['PAYMENT_PENDING', 'RISK_CHECK'].includes(status)) return 'secondary'
  if (status === 'CANCELLED') return 'destructive'
  return 'outline'
}

export default function GuestBookingPage() {
  const searchParams = useSearchParams()
  const token = searchParams?.get('token') ?? null

  const [booking, setBooking] = useState<GuestBookingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBooking = useCallback(async () => {
    if (!token || token.trim() === '') {
      setError('Invalid or expired booking link')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/bookings/guest?token=${encodeURIComponent(token)}`)
      const json: ApiResponse = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Invalid or expired booking link')
        setBooking(null)
        return
      }

      if (!json.success || !json.data) {
        setError('Invalid or expired booking link')
        setBooking(null)
        return
      }

      setBooking(json.data)
    } catch {
      setError('Invalid or expired booking link')
      setBooking(null)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchBooking()
  }, [fetchBooking])

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-4">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">خطأ</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error ?? 'Invalid or expired booking link'}</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/">العودة للرئيسية</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const equipmentName = (eq: GuestBookingEquipment) => eq.model ?? eq.sku

  return (
    <div className="min-h-[50vh] p-4 md:p-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-lg md:text-xl">تفاصيل الحجز</CardTitle>
            <Badge variant={getStatusVariant(booking.status)}>
              {STATUS_LABELS[booking.status] ?? booking.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground font-mono">
            #{booking.bookingNumber}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {(booking.guestName || booking.guestEmail) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4 text-muted-foreground" />
                معلومات الضيف
              </div>
              <div className="ps-6 space-y-1 text-sm">
                {booking.guestName && (
                  <p className="flex items-center gap-2">
                    <span className="text-muted-foreground">الاسم:</span>
                    {booking.guestName}
                  </p>
                )}
                {booking.guestEmail && (
                  <p className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3 text-muted-foreground" />
                    {booking.guestEmail}
                  </p>
                )}
              </div>
            </div>
          )}

          {booking.equipment.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Package className="h-4 w-4 text-muted-foreground" />
                المعدات
              </div>
              <ul className="ps-6 space-y-1.5">
                {booking.equipment.map((eq, i) => (
                  <li key={i} className="text-sm flex justify-between gap-2">
                    <span>{equipmentName(eq)}</span>
                    <span className="text-muted-foreground">
                      {eq.quantity} ×
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              التواريخ
            </div>
            <p className="ps-6 text-sm">
              {formatDate(booking.startDate)} → {formatDate(booking.endDate)}
            </p>
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">المجموع</span>
              <span className="font-medium">{formatCurrency(booking.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ضريبة القيمة المضافة</span>
              <span>{formatCurrency(booking.vatAmount)}</span>
            </div>
            {booking.depositAmount != null && booking.depositAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">التأمين</span>
                <span>{formatCurrency(booking.depositAmount)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-sm">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">حالة الدفع</span>
            </div>
            <Badge variant={booking.paymentStatus === 'SUCCESS' ? 'default' : 'secondary'}>
              {PAYMENT_LABELS[booking.paymentStatus] ?? booking.paymentStatus}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-center">
        <Button asChild variant="outline">
          <Link href="/">العودة للرئيسية</Link>
        </Button>
      </div>
    </div>
  )
}
