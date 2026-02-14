/**
 * Booking confirmation page (Phase 3.6). Summary, PDF, calendar, WhatsApp.
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { CheckCircle, FileText, Calendar, MessageCircle } from 'lucide-react'

import { siteConfig } from '@/config/site.config'

export default function BookingConfirmationPage() {
  const params = useParams()
  const { t } = useLocale()
  const id = params?.id as string
  const [booking, setBooking] = useState<{
    id: string
    bookingNumber: string
    status: string
    startDate: string
    endDate: string
    totalAmount: number
    customer?: { name?: string; email?: string }
    equipment?: { quantity: number; equipment: { name: string } }[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    let cancelled = false
    fetch(`/api/bookings/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 401 ? 'Unauthorized' : 'Failed to load')
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setBooking(data)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const addToCalendar = () => {
    if (!booking) return
    const start = new Date(booking.startDate)
    const end = new Date(booking.endDate)
    const title = `FlixCam – حجز ${booking.bookingNumber}`
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${start.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
      `DTEND:${end.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
      `SUMMARY:${title}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')
    const blob = new Blob([ics], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `booking-${booking.bookingNumber}.ics`
    a.click()
    URL.revokeObjectURL(url)
  }

  const whatsappUrl = `https://wa.me/${siteConfig.contact.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(
    `مرحباً، لدي استفسار عن الحجز ${booking?.bookingNumber ?? id}`
  )}`

  if (loading) {
    return (
      <main className="container mx-auto max-w-lg py-16 px-4 text-center">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </main>
    )
  }

  if (error || !booking) {
    return (
      <main className="container mx-auto max-w-lg py-16 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">تم تأكيد الحجز</h1>
        <p className="text-muted-foreground mb-2">رقم الحجز: {id}</p>
        <p className="text-sm text-muted-foreground mb-6">
          سجّل الدخول لعرض التفاصيل أو تواصل مع الدعم.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Button asChild>
            <Link href="/login">تسجيل الدخول</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/support">الدعم</Link>
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="container mx-auto max-w-lg py-12 px-4">
      <div className="text-center mb-8">
        <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">تم تأكيد الحجز</h1>
        <p className="text-muted-foreground">رقم الحجز: {booking.bookingNumber}</p>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-4 mb-6">
        <p><strong>التواريخ:</strong> {new Date(booking.startDate).toLocaleDateString('ar-SA')} – {new Date(booking.endDate).toLocaleDateString('ar-SA')}</p>
        <p><strong>الإجمالي:</strong> {Number(booking.totalAmount).toLocaleString()} SAR</p>
        {booking.equipment?.length ? (
          <p><strong>المعدات:</strong> {booking.equipment.map((e) => `${e.equipment?.name ?? ''} × ${e.quantity}`).join('، ')}</p>
        ) : null}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button variant="outline" onClick={addToCalendar} className="gap-2">
          <Calendar className="h-4 w-4" />
          إضافة للتقويم
        </Button>
        <Button asChild variant="outline" className="gap-2">
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-4 w-4" />
            واتساب
          </a>
        </Button>
        <Button asChild>
          <Link href="/portal/bookings">حجوزاتي</Link>
        </Button>
      </div>
    </main>
  )
}
