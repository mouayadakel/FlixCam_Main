/**
 * @file portal/bookings/page.tsx
 * @description Client portal - My Bookings page with filters
 * @module app/portal/bookings
 * @author Engineering Team
 * @created 2026-01-28
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils/format.utils'
import { BookingStatus } from '@prisma/client'
import { t } from '@/lib/i18n/translate'
import { getRequestLocale } from '@/lib/i18n/request-locale'
import { PortalInvoiceDownloadButton } from '@/components/features/portal/portal-invoice-download-button'
import { BookingStatusBadge } from '@/components/shared/domain-status-badges'
import {
  BOOKING_STATUS_LABELS,
  PORTAL_BOOKING_FILTER_STATUSES,
  getStatusLabel,
} from '@/lib/constants/status-labels'

export default async function PortalBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>
}) {
  const session = await auth()
  const { locale } = await getRequestLocale()

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/portal/bookings')
  }

  const resolved = await searchParams
  const userId = session.user.id
  const statusFilter = resolved.status
  const searchQuery = resolved.search

  // Build where clause
  const where: any = {
    customerId: userId,
    deletedAt: null,
  }

  if (statusFilter && statusFilter !== 'all') {
    where.status = statusFilter as BookingStatus
  }

  if (searchQuery) {
    where.OR = [{ bookingNumber: { contains: searchQuery, mode: 'insensitive' } }]
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      equipment: {
        include: {
          equipment: {
            select: {
              sku: true,
              model: true,
            },
          },
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
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t(locale, 'portal.myBookings')}</h1>
        <p className="mt-2 text-muted-foreground">{t(locale, 'portal.myBookingsDesc')}</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t(locale, 'portal.searchAndFilter')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="flex flex-wrap items-center gap-4">
            <div className="relative min-w-[200px] flex-1">
              <input
                type="text"
                name="search"
                placeholder={t(locale, 'portal.searchByBookingNumber')}
                defaultValue={searchQuery || ''}
                className="w-full rounded-lg border px-4 py-2"
              />
            </div>
            <select
              name="status"
              defaultValue={statusFilter || 'all'}
              className="rounded-lg border px-4 py-2"
            >
              <option value="all">{t(locale, 'portal.allStatuses')}</option>
              {PORTAL_BOOKING_FILTER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {getStatusLabel(BOOKING_STATUS_LABELS, status, 'ar')}
                </option>
              ))}
            </select>
            <Button type="submit">{t(locale, 'portal.filter')}</Button>
          </form>
        </CardContent>
      </Card>

      {/* Bookings List */}
      <Card>
        <CardHeader>
          <CardTitle>{t(locale, 'portal.bookingsList')}</CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">{t(locale, 'portal.noBookings')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-neutral-50"
                >
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-3">
                      <span className="text-lg font-medium">
                        {t(locale, 'portal.bookingHash').replace('{number}', booking.bookingNumber)}
                      </span>
                      <BookingStatusBadge status={booking.status} />
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">{t(locale, 'portal.dates')}:</span>{' '}
                        {t(locale, 'portal.fromTo')
                          .replace('{from}', formatDate(booking.startDate))
                          .replace('{to}', formatDate(booking.endDate))}
                      </div>
                      <div>
                        <span className="font-medium">{t(locale, 'portal.amount')}:</span>{' '}
                        {formatCurrency(booking.totalAmount.toNumber())}
                      </div>
                      <div>
                        <span className="font-medium">{t(locale, 'portal.equipmentCount')}:</span>{' '}
                        {booking.equipment.length} {t(locale, 'portal.itemUnit')}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <PortalInvoiceDownloadButton booking={booking} />
                    <Link href={`/portal/bookings/${booking.id}`}>
                      <Button variant="outline" size="sm">
                        {t(locale, 'portal.viewDetails')}
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
