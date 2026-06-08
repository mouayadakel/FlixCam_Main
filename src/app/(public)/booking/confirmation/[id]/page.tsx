/**
 * Booking confirmation page (Phase 3.6). Summary, PDF, calendar, WhatsApp.
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { CheckCircle, Calendar, MessageCircle, Download, Share2 } from 'lucide-react'

import { siteConfig } from '@/config/site.config'

function ShareBookingButton({
  bookingNumber,
  id,
  t,
}: {
  bookingNumber: string
  id: string
  t: (key: string) => string
}) {
  const [copied, setCopied] = useState(false)
  const shareUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/booking/confirmation/${id}` : ''

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `FlixCam – ${t('checkout.bookingNumber').replace('{number}', bookingNumber)}`,
          url: shareUrl,
          text: t('checkout.bookingConfirmed'),
        })
        return
      } catch {
        // fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.open(shareUrl, '_blank')
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleShare}
      className="h-12 w-full gap-2 sm:w-auto"
      size="lg"
    >
      <Share2 className="h-4 w-4" />
      {copied ? (t('common.copied') ?? 'Copied!') : (t('common.share') ?? 'Share')}
    </Button>
  )
}

export default function BookingConfirmationPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { t } = useLocale()
  const id = params?.id as string
  const paymentStatus = searchParams.get('paymentStatus')
  const [booking, setBooking] = useState<{
    id: string
    bookingNumber: string
    status: string
    startDate: string
    endDate: string
    studioStartTime?: string | null
    studioEndTime?: string | null
    totalAmount: number
    vatAmount?: number | null
    couponCode?: string | null
    paymentSummary?: { grandTotalSar: number; vatSar: number } | null
    customer?: { name?: string; email?: string }
    equipment?: Array<{
      quantity: number
      equipment?: {
        id: string
        name?: string | null
        model?: string | null
        sku?: string | null
        category?: { name?: string | null }
        brand?: { name?: string | null }
        dailyPrice?: unknown
      } | null
    }> | null
    studio?: { id: string; name: string; slug: string; address?: string | null } | null
    payments?: Array<{
      id: string
      status: string
      gateway?: string | null
      externalId?: string | null
      createdAt: string
    }>
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

  useEffect(() => {
    if (booking) {
      const storageKey = `tracked_booking_${booking.id}`
      if (typeof window !== 'undefined' && !window.localStorage.getItem(storageKey)) {
        window.localStorage.setItem(storageKey, 'true')
        import('@/lib/analytics/ecommerce-data-layer').then(({ pushPurchaseFromBooking }) => {
          pushPurchaseFromBooking(booking)
        })
        import('@/lib/analytics/track-event').then(({ trackMarketingEvent }) => {
          const grand =
            booking.paymentSummary?.grandTotalSar ??
            Number(booking.totalAmount) + Number(booking.vatAmount ?? 0)
          trackMarketingEvent({
            eventType: 'Purchase',
            entityType: 'Order',
            entityId: booking.id,
            transactionId: booking.bookingNumber,
            value: grand,
            currency: 'SAR',
            tax: booking.paymentSummary?.vatSar ?? booking.vatAmount ?? undefined,
            coupon: booking.couponCode ?? undefined,
          })
        })
      }
    }
  }, [booking])

  useEffect(() => {
    if (!booking) return
    const storageKey = `staff_notified_booking_${booking.id}`
    const isConfirmed = booking.status?.toUpperCase() === 'CONFIRMED'
    if (!isConfirmed) return
    if (typeof window === 'undefined') return
    if (window.localStorage.getItem(storageKey)) return

    window.localStorage.setItem(storageKey, 'true')
    fetch('/api/notifications/payment-confirmed/ping', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ bookingId: booking.id }),
    }).catch(() => {
      // best-effort; webhook remains source of truth
    })
  }, [booking])

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
      <main className="container mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </main>
    )
  }

  if (error || !booking) {
    return (
      <main className="container mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold">{t('checkout.bookingConfirmed')}</h1>
        <p className="mb-2 text-muted-foreground">
          {t('checkout.bookingNumber').replace('{number}', id)}
        </p>
        <p className="mb-6 text-sm text-muted-foreground">{t('checkout.bookingLoginPrompt')}</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild>
            <Link href="/login">{t('nav.login')}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/support">{t('nav.support')}</Link>
          </Button>
        </div>
      </main>
    )
  }

  const normalizedPaymentStatus = (paymentStatus || '').toLowerCase()
  const isBookingConfirmed = booking.status?.toUpperCase() === 'CONFIRMED'
  const isPaymentFailed = ['failed', 'voided', 'abandoned', 'cancelled'].includes(
    normalizedPaymentStatus
  )
  const latestPayment = (booking.payments || [])
    .slice()
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0]
  const displayedPaymentStatus =
    (paymentStatus || latestPayment?.status || 'pending').toString().toLowerCase()

  return (
    <main className="container mx-auto max-w-lg px-4 py-12 pb-24 lg:pb-12">
      <div className="mb-8 text-center">
        <CheckCircle
          className={`mx-auto mb-4 h-16 w-16 ${
            isBookingConfirmed ? 'text-green-600' : isPaymentFailed ? 'text-red-500' : 'text-amber-500'
          }`}
        />
        <h1 className="mb-2 text-2xl font-bold">
          {isBookingConfirmed
            ? t('checkout.bookingConfirmed')
            : isPaymentFailed
              ? t('checkout.paymentFailed')
              : t('checkout.paymentPendingConfirmation')}
        </h1>
        <p className="text-muted-foreground">
          {t('checkout.bookingNumber').replace('{number}', booking.bookingNumber)}
        </p>
        {!isBookingConfirmed && (
          <p className="mt-2 text-sm text-muted-foreground">
            {t('checkout.currentPaymentStatus')}: {displayedPaymentStatus}
          </p>
        )}
        {isPaymentFailed && (
          <p className="mt-2 text-sm text-red-600">
            {t('checkout.paymentRetryPrompt')}
          </p>
        )}
      </div>

      {!isBookingConfirmed && latestPayment && (
        <div className="mb-6 space-y-2 rounded-lg border bg-card p-4">
          <p className="text-sm font-medium">{t('checkout.lastPaymentAttempt')}</p>
          <p className="text-sm text-muted-foreground">
            {t('checkout.paymentGateway')}: {(latestPayment.gateway || 'unknown').toUpperCase()}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('checkout.paymentReference')}: {latestPayment.externalId || latestPayment.id}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('checkout.paymentAttemptedAt')}: {new Date(latestPayment.createdAt).toLocaleString()}
          </p>
        </div>
      )}

      <div className="mb-6 space-y-4 rounded-lg border bg-card p-6">
        {booking.studio && (
          <>
            <p>
              <strong>{t('checkout.bookingStudio')}:</strong> {booking.studio.name}
            </p>
            {booking.studio.address && (
              <p className="text-sm text-muted-foreground">{booking.studio.address}</p>
            )}
            {booking.studioStartTime && booking.studioEndTime && (
              <p>
                <strong>{t('checkout.bookingAppointment')}:</strong>{' '}
                {new Date(booking.studioStartTime).toLocaleDateString('ar-SA', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                {' · '}
                {new Date(booking.studioStartTime).toLocaleTimeString('ar-SA', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {' – '}
                {new Date(booking.studioEndTime).toLocaleTimeString('ar-SA', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </>
        )}
        {!booking.studio && (
          <p>
            <strong>{t('checkout.bookingDates')}:</strong>{' '}
            {new Date(booking.startDate).toLocaleDateString('ar-SA')} –{' '}
            {new Date(booking.endDate).toLocaleDateString('ar-SA')}
          </p>
        )}
        <p>
          <strong>{t('checkout.bookingTotal')}:</strong>{' '}
          {Number(booking.totalAmount).toLocaleString()} SAR
        </p>
        {booking.equipment?.length ? (
          <p>
            <strong>{t('checkout.bookingEquipment')}:</strong>{' '}
            {booking.equipment.map((e) => `${e.equipment?.name ?? ''} × ${e.quantity}`).join('، ')}
          </p>
        ) : null}
      </div>

      {/* Share & Save Card (Phase 35) */}
      <div className="mb-8 overflow-hidden rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-600">
            <Share2 className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-violet-900">شارك واحصل على خصم! 🎁</h3>
            <p className="mt-1 text-sm text-violet-700">
              ادعُ أصدقاءك لاستخدام فليكس كام، وسيحصل كل منكم على **50 ريال رصيد** عند أول حجز لهم!
            </p>
            
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-violet-100 bg-white p-2">
              <code className="flex-1 px-2 font-mono text-sm font-bold text-violet-600">
                {typeof window !== 'undefined' ? `${window.location.origin}/login?ref=${(booking as any).customer?.referrals?.[0]?.code || 'SHARE50'}` : ''}
              </code>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-xs text-violet-600 hover:bg-violet-50 hover:text-violet-700"
                onClick={() => {
                  const url = `${window.location.origin}/login?ref=${(booking as any).customer?.referrals?.[0]?.code || 'SHARE50'}`;
                  navigator.clipboard.writeText(url);
                  // Toast is available via useToast but I haven't imported it here. I'll use alert for simplicity or just the copy state.
                }}
              >
                نسخ الرابط
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
        <Button asChild variant="outline" className="h-12 w-full gap-2 sm:w-auto" size="lg">
          <a href={`/api/bookings/${booking.id}/invoice-pdf`} download>
            <Download className="h-4 w-4" />
            {t('checkout.downloadInvoice')}
          </a>
        </Button>
        <Button
          variant="outline"
          onClick={addToCalendar}
          className="h-12 w-full gap-2 sm:w-auto"
          size="lg"
        >
          <Calendar className="h-4 w-4" />
          {t('checkout.addToCalendar')}
        </Button>
        <Button asChild variant="outline" className="h-12 w-full gap-2 sm:w-auto" size="lg">
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-4 w-4" />
            {t('checkout.whatsapp')}
          </a>
        </Button>
        <ShareBookingButton bookingNumber={booking.bookingNumber} id={booking.id} t={t} />
        {!isBookingConfirmed && (
          <Button asChild variant={isPaymentFailed ? 'default' : 'outline'} size="lg" className="h-12 w-full sm:w-auto">
            <Link href={`/checkout/moyasar/${booking.id}`}>{t('checkout.retryPayment')}</Link>
          </Button>
        )}
        <Button asChild size="lg" className="h-12 w-full sm:w-auto">
          <Link href="/portal/bookings">{t('checkout.myBookings')}</Link>
        </Button>
      </div>
    </main>
  )
}
