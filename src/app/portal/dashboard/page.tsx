/**
 * @file portal/dashboard/page.tsx
 * @description Client portal dashboard with KPI cards and booking overview
 * @module app/portal/dashboard
 * @author Engineering Team
 * @created 2026-01-28
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Calendar, DollarSign, Package, Clock, ArrowLeft, FileText, Receipt } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format.utils'
import { BookingStatus } from '@prisma/client'
import { t } from '@/lib/i18n/translate'

export default async function PortalDashboardPage() {
  const session = await auth()

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
  const upcomingBookings = bookings.filter(
    (b) =>
      b.status === 'CONFIRMED' &&
      new Date(b.startDate) > new Date() &&
      new Date(b.startDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  )
  const pastBookings = bookings.filter((b) => b.status === 'CLOSED' || b.status === 'RETURNED')

  function getStatusBadge(status: BookingStatus) {
    const statusConfig: Record<
      BookingStatus,
      { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
    > = {
      DRAFT: { label: t('ar', 'portal.statusDraft'), variant: 'outline' },
      RISK_CHECK: { label: t('ar', 'portal.statusRiskCheck'), variant: 'outline' },
      PAYMENT_PENDING: { label: t('ar', 'portal.statusPaymentPending'), variant: 'secondary' },
      CONFIRMED: { label: t('ar', 'portal.statusConfirmed'), variant: 'default' },
      ACTIVE: { label: t('ar', 'portal.statusActive'), variant: 'default' },
      RETURNED: { label: t('ar', 'portal.statusReturned'), variant: 'secondary' },
      CLOSED: { label: t('ar', 'portal.statusClosed'), variant: 'outline' },
      CANCELLED: { label: t('ar', 'portal.statusCancelled'), variant: 'destructive' },
    }

    const config = statusConfig[status] || { label: status, variant: 'outline' }

    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('ar', 'portal.dashboard')}</h1>
        <p className="mt-2 text-muted-foreground">{t('ar', 'portal.welcomeMessage')}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('ar', 'portal.totalBookings')}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBookings}</div>
            <p className="mt-1 text-xs text-muted-foreground">{t('ar', 'portal.allBookings')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('ar', 'portal.totalSpent')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalSpent._sum.amount?.toNumber() ?? 0)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t('ar', 'portal.paidSoFar')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('ar', 'portal.upcomingReturns')}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingReturns}</div>
            <p className="mt-1 text-xs text-muted-foreground">{t('ar', 'portal.nextSevenDays')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Bookings */}
      {activeBookings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {t('ar', 'portal.activeBookings')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-3">
                      <span className="font-medium">
                        {t('ar', 'portal.bookingHash').replace('{number}', booking.bookingNumber)}
                      </span>
                      {getStatusBadge(booking.status)}
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div>
                        {t('ar', 'portal.fromTo')
                          .replace('{from}', formatDate(booking.startDate))
                          .replace('{to}', formatDate(booking.endDate))}
                      </div>
                      <div>{formatCurrency(booking.totalAmount.toNumber())}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/portal/bookings/${booking.id}`}>
                      <Button variant="outline" size="sm">
                        {t('ar', 'portal.viewDetails')}
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Bookings */}
      {upcomingBookings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t('ar', 'portal.upcomingBookings')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-3">
                      <span className="font-medium">
                        {t('ar', 'portal.bookingHash').replace('{number}', booking.bookingNumber)}
                      </span>
                      {getStatusBadge(booking.status)}
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div>
                        {t('ar', 'portal.fromTo')
                          .replace('{from}', formatDate(booking.startDate))
                          .replace('{to}', formatDate(booking.endDate))}
                      </div>
                      <div>{formatCurrency(booking.totalAmount.toNumber())}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/portal/bookings/${booking.id}`}>
                      <Button variant="outline" size="sm">
                        {t('ar', 'portal.viewDetails')}
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('ar', 'portal.quickActions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Link href="/portal/bookings">
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="ms-2 h-4 w-4" />
                {t('ar', 'portal.viewAllBookings')}
              </Button>
            </Link>
            <Link href="/portal/contracts">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="ms-2 h-4 w-4" />
                {t('ar', 'portal.contracts')}
              </Button>
            </Link>
            <Link href="/portal/invoices">
              <Button variant="outline" className="w-full justify-start">
                <Receipt className="ms-2 h-4 w-4" />
                {t('ar', 'portal.invoices')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
