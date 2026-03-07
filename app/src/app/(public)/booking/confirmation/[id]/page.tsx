/**
 * Booking confirmation page (Phase 3.6). Summary, PDF, calendar, WhatsApp.
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
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
  const { t } = useLocale()
  const id = params?.id as string
  const [booking, setBooking] = useState<{
    id: string
    bookingNumber: string
    status: string
    startDate: string
    endDate: string
    studioStartTime?: string | null
    studioEndTime?: string | null
    totalAmount: number
    customer?: { name?: string; email?: string }
    equipment?: { quantity: number; equipment: { name: string } }[]
    studio?: { name: string; slug: string; address?: string | null } | null
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

  return (
    <main className="container mx-auto max-w-lg px-4 py-12 pb-24 lg:pb-12">
      <div className="mb-8 text-center">
        <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-600" />
        <h1 className="mb-2 text-2xl font-bold">{t('checkout.bookingConfirmed')}</h1>
        <p className="text-muted-foreground">
          {t('checkout.bookingNumber').replace('{number}', booking.bookingNumber)}
        </p>
      </div>

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
        <Button asChild size="lg" className="h-12 w-full sm:w-auto">
          <Link href="/portal/bookings">{t('checkout.myBookings')}</Link>
        </Button>
      </div>
    </main>
  )
}
