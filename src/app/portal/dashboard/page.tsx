/**
 * @file portal/dashboard/page.tsx
 * @description Client portal dashboard with KPI cards, booking timeline, and quick actions
 * @module app/portal/dashboard
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  Calendar,
  DollarSign,
  Package,
  Clock,
  ArrowLeft,
  FileText,
  Receipt,
  RotateCcw,
  Building2,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format.utils'
import { t } from '@/lib/i18n/translate'
import { getRequestLocale } from '@/lib/i18n/request-locale'
import type { LaunchLocale } from '@/lib/i18n/locales'
import { BookingTimeline } from '@/components/portal/booking-timeline'
import { PortalInvoiceDownloadButton } from '@/components/features/portal/portal-invoice-download-button'
import { BookingStatusBadge } from '@/components/shared/domain-status-badges'

/** One line under past bookings / list: reflects studio-only vs gear vs mixed. */
function portalBookingSummaryLine(
  booking: {
    equipment: { id: string }[]
    studio: { name: string } | null
  },
  locale: LaunchLocale
): string {
  const eq = booking.equipment.length
  const st = booking.studio
  if (st != null && eq === 0) {
    return t(locale, 'portal.bookingSummaryStudioOnly').replace('{name}', st.name)
  }
  if (st != null && eq > 0) {
    return t(locale, 'portal.bookingSummaryMixed')
      .replace('{count}', String(eq))
      .replace('{name}', st.name)
  }
  if (eq > 0) {
    return t(locale, 'portal.bookingSummaryGearOnly').replace('{count}', String(eq))
  }
  return t(locale, 'portal.bookingSummaryEmpty')
}

export default async function PortalDashboardPage() {
  const session = await auth()
  const { locale, dir } = await getRequestLocale()

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/portal/dashboard')
  }

  const userId = session.user.id

  // Fetch client bookings
  const bookings = await prisma.booking.findMany({
    where: {
      customerId: userId,
      deletedAt: null,
    },
    include: {
      studio: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      equipment: {
        include: {
          equipment: {
            select: {
              id: true,
              sku: true,
              model: true,
            },
          },
        },
      },
      payments: {
        where: {
          status: 'SUCCESS',
        },
      },
      invoices: {
        where: { deletedAt: null },
        select: { id: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  })

  // Calculate KPIs
  const totalBookings = await prisma.booking.count({
    where: {
      customerId: userId,
      deletedAt: null,
    },
  })

  const totalSpent = await prisma.payment.aggregate({
    where: {
      booking: {
        customerId: userId,
        deletedAt: null,
      },
      status: 'SUCCESS',
    },
    _sum: {
      amount: true,
    },
  })

  const upcomingReturns = await prisma.booking.count({
    where: {
      customerId: userId,
      status: {
        in: ['ACTIVE', 'CONFIRMED'],
      },
      endDate: {
        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
      },
      deletedAt: null,
    },
  })

  // Categorize bookings
  const activeBookings = bookings.filter((b) => b.status === 'ACTIVE' || b.status === 'CONFIRMED')
  const pastBookings = bookings.filter((b) => b.status === 'CLOSED' || b.status === 'RETURNED')

  return (
    <div className="space-y-8" dir={dir}>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{t(locale, 'portal.dashboard')}</h1>
        <p className="text-muted-foreground">{t(locale, 'portal.welcomeMessage')}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-brand-primary/10 bg-brand-primary/[0.02]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t(locale, 'portal.totalBookings')}</CardTitle>
            <Calendar className="h-4 w-4 text-brand-primary/60" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBookings}</div>
            <p className="mt-1 text-xs text-muted-foreground">{t(locale, 'portal.allBookings')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t(locale, 'portal.totalSpent')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalSpent._sum.amount?.toNumber() ?? 0)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t(locale, 'portal.paidSoFar')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t(locale, 'portal.upcomingReturns')}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingReturns}</div>
            <p className="mt-1 text-xs text-muted-foreground">{t(locale, 'portal.nextSevenDays')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Bookings - High Focus */}
      {activeBookings.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Package className="h-5 w-5 text-brand-primary" />
            {t(locale, 'portal.activeBookings')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeBookings.map((booking) => (
              <Card key={booking.id} className="overflow-hidden border-brand-primary/20 shadow-lg group hover:shadow-xl transition-all duration-300">
                <CardHeader className="bg-brand-primary/5 pb-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-lg">
                      {t(locale, 'portal.bookingHash').replace('{number}', booking.bookingNumber)}
                    </span>
                    <BookingStatusBadge status={booking.status} />
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <BookingTimeline
                    status={booking.status}
                    startDate={booking.startDate}
                    endDate={booking.endDate}
                  />

                  {booking.studio != null && (
                    <Link
                      href={`/studios/${booking.studio.slug}`}
                      className="-mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-brand-primary"
                    >
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span>{t(locale, 'portal.studioBooking')}: {booking.studio.name}</span>
                    </Link>
                  )}

                  <p className="text-xs text-muted-foreground">{portalBookingSummaryLine(booking, locale)}</p>

                  <div className="pt-4 border-t flex items-center justify-between">
                    <div className="text-sm">
                        <p className="text-muted-foreground">{t(locale, 'portal.totalAmount')}</p>
                        <p className="font-bold text-brand-primary">{formatCurrency(booking.totalAmount.toNumber())}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <PortalInvoiceDownloadButton booking={booking} />
                        <Link href={`/portal/bookings/${booking.id}`}>
                          <Button variant="outline" size="sm" className="gap-2 border-brand-primary/20 hover:bg-brand-primary/5">
                            {t(locale, 'portal.viewDetails')}
                            <ArrowLeft className="h-4 w-4" />
                          </Button>
                        </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Past Bookings & Quick Re-book */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">{t(locale, 'portal.pastBookings')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pastBookings.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                   <RotateCcw className="h-8 w-8 mx-auto mb-2 opacity-20" />
                   <p>{t(locale, 'portal.noPastBookings')}</p>
                </div>
              ) : (
                pastBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-slate-50 transition-colors group">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold">{booking.bookingNumber}</p>
                          <Badge variant="outline" className="text-[10px] h-4">{formatDate(booking.startDate)}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {portalBookingSummaryLine(booking, locale)} •{' '}
                          {formatCurrency(booking.totalAmount.toNumber())}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <PortalInvoiceDownloadButton booking={booking} />
                        <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                          <Link href={`/portal/bookings/${booking.id}`}>{t(locale, 'portal.viewDetails')}</Link>
                        </Button>
                        <Button variant="outline" size="sm" className="text-brand-primary border-brand-primary/30 hover:bg-brand-primary/5 gap-2">
                          <RotateCcw className="h-3.5 w-3.5" />
                          {t(locale, 'portal.rebook')}
                        </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t(locale, 'portal.quickActions')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Link href="/studios">
              <Button variant="outline" className="w-full justify-start gap-2 h-11">
                <Building2 className="h-4 w-4 text-brand-primary" />
                {t(locale, 'portal.bookStudio')}
              </Button>
            </Link>
            <Link href="/portal/bookings">
              <Button variant="outline" className="w-full justify-start gap-2 h-11">
                <Calendar className="h-4 w-4 text-brand-primary" />
                {t(locale, 'portal.viewAllBookings')}
              </Button>
            </Link>
            <Link href="/portal/contracts">
              <Button variant="outline" className="w-full justify-start gap-2 h-11">
                <FileText className="h-4 w-4 text-brand-primary" />
                {t(locale, 'portal.contracts')}
              </Button>
            </Link>
            <Link href="/portal/invoices">
              <Button variant="outline" className="w-full justify-start gap-2 h-11">
                <Receipt className="h-4 w-4 text-brand-primary" />
                {t(locale, 'portal.invoices')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
