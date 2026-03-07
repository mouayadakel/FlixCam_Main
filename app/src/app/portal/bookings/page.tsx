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
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils/format.utils'
import { BookingStatus } from '@prisma/client'
import { t } from '@/lib/i18n/translate'

export default async function PortalBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>
}) {
  const session = await auth()

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
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

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
        <h1 className="text-3xl font-bold">{t('ar', 'portal.myBookings')}</h1>
        <p className="mt-2 text-muted-foreground">{t('ar', 'portal.myBookingsDesc')}</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t('ar', 'portal.searchAndFilter')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="flex flex-wrap items-center gap-4">
            <div className="relative min-w-[200px] flex-1">
              <input
                type="text"
                name="search"
                placeholder={t('ar', 'portal.searchByBookingNumber')}
                defaultValue={searchQuery || ''}
                className="w-full rounded-lg border px-4 py-2"
              />
            </div>
            <select
              name="status"
              defaultValue={statusFilter || 'all'}
              className="rounded-lg border px-4 py-2"
            >
              <option value="all">{t('ar', 'portal.allStatuses')}</option>
              <option value="DRAFT">{t('ar', 'portal.statusDraft')}</option>
              <option value="CONFIRMED">{t('ar', 'portal.statusConfirmed')}</option>
              <option value="ACTIVE">{t('ar', 'portal.statusActive')}</option>
              <option value="RETURNED">{t('ar', 'portal.statusReturned')}</option>
              <option value="CLOSED">{t('ar', 'portal.statusClosed')}</option>
              <option value="CANCELLED">{t('ar', 'portal.statusCancelled')}</option>
            </select>
            <Button type="submit">{t('ar', 'portal.filter')}</Button>
          </form>
        </CardContent>
      </Card>

      {/* Bookings List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('ar', 'portal.bookingsList')}</CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">{t('ar', 'portal.noBookings')}</p>
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
                        {t('ar', 'portal.bookingHash').replace('{number}', booking.bookingNumber)}
                      </span>
                      {getStatusBadge(booking.status)}
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">{t('ar', 'portal.dates')}:</span>{' '}
                        {t('ar', 'portal.fromTo')
                          .replace('{from}', formatDate(booking.startDate))
                          .replace('{to}', formatDate(booking.endDate))}
                      </div>
                      <div>
                        <span className="font-medium">{t('ar', 'portal.amount')}:</span>{' '}
                        {formatCurrency(booking.totalAmount.toNumber())}
                      </div>
                      <div>
                        <span className="font-medium">{t('ar', 'portal.equipmentCount')}:</span>{' '}
                        {booking.equipment.length} {t('ar', 'portal.itemUnit')}
                      </div>
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
