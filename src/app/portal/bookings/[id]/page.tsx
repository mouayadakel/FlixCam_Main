/**
 * @file portal/bookings/[id]/page.tsx
 * @description Client portal - Booking detail page
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
import { ArrowRight, Package, FileText, Receipt, Calendar } from 'lucide-react'
import { notFound } from 'next/navigation'
import { BookingActions } from '@/components/features/portal/booking-actions'
import { BookingTimeline } from '@/components/features/portal/booking-timeline'
import { t } from '@/lib/i18n/translate'

const CANCELLATION_HOURS_BEFORE_START = 48

export default async function PortalBookingDetailPage({ params }: { params: { id: string } }) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/portal/bookings')
  }

  const userId = session.user.id

  const booking = await prisma.booking.findFirst({
    where: {
      id: params.id,
      customerId: userId,
      deletedAt: null,
    },
    include: {
      equipment: {
        include: {
          equipment: {
            include: {
              category: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
      payments: {
        orderBy: {
          createdAt: 'desc',
        },
      },
      contracts: {
        where: {
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  })

  if (!booking) {
    notFound()
  }

  const canCancel =
    ['DRAFT', 'RISK_CHECK', 'PAYMENT_PENDING'].includes(booking.status) ||
    (booking.status === 'CONFIRMED' &&
      (new Date(booking.startDate).getTime() - Date.now()) / (1000 * 60 * 60) >=
        CANCELLATION_HOURS_BEFORE_START)

  const cancelNotAllowedMessage =
    booking.status === 'CONFIRMED' && !canCancel
      ? t('ar', 'portal.cancelNotAllowed').replace(
          '{hours}',
          String(CANCELLATION_HOURS_BEFORE_START)
        )
      : undefined

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
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/portal/bookings"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowRight className="h-4 w-4" />
            {t('ar', 'portal.backToBookings')}
          </Link>
          <h1 className="text-3xl font-bold">
            {t('ar', 'portal.booking')} #{booking.bookingNumber}
          </h1>
        </div>
        {getStatusBadge(booking.status)}
      </div>

      {/* Booking Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>{t('ar', 'portal.bookingStages')}</CardTitle>
        </CardHeader>
        <CardContent>
          <BookingTimeline
            status={booking.status}
            createdAt={booking.createdAt.toISOString()}
            startDate={booking.startDate.toISOString()}
            endDate={booking.endDate.toISOString()}
            actualReturnDate={
              'actualReturnDate' in booking && booking.actualReturnDate
                ? (booking.actualReturnDate as Date).toISOString()
                : null
            }
          />
        </CardContent>
      </Card>

      {/* Booking Information */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t('ar', 'portal.bookingInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">{t('ar', 'portal.startDate')}</div>
              <div className="font-medium">{formatDate(booking.startDate)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t('ar', 'portal.endDate')}</div>
              <div className="font-medium">{formatDate(booking.endDate)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t('ar', 'portal.totalAmount')}</div>
              <div className="text-lg font-medium">
                {formatCurrency(booking.totalAmount.toNumber())}
              </div>
            </div>
            {booking.depositAmount && (
              <div>
                <div className="text-sm text-muted-foreground">{t('ar', 'portal.deposit')}</div>
                <div className="font-medium">
                  {formatCurrency(booking.depositAmount.toNumber())}
                </div>
              </div>
            )}
            {'actualReturnDate' in booking && booking.actualReturnDate && (
              <div>
                <div className="text-sm text-muted-foreground">
                  {t('ar', 'portal.actualReturnDate')}
                </div>
                <div className="font-medium">{formatDate(booking.actualReturnDate)}</div>
              </div>
            )}
            {'lateFeeAmount' in booking &&
              booking.lateFeeAmount &&
              Number(booking.lateFeeAmount) > 0 && (
                <div>
                  <div className="text-sm text-muted-foreground">{t('ar', 'portal.lateFee')}</div>
                  <div className="font-medium text-amber-600">
                    {formatCurrency(Number(booking.lateFeeAmount))}
                  </div>
                </div>
              )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {t('ar', 'portal.equipment')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {booking.equipment.length === 0 ? (
              <p className="text-muted-foreground">{t('ar', 'portal.noEquipment')}</p>
            ) : (
              <div className="space-y-3">
                {booking.equipment.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <div className="font-medium">{item.equipment.sku}</div>
                      {item.equipment.model && (
                        <div className="text-sm text-muted-foreground">{item.equipment.model}</div>
                      )}
                      {item.equipment.category && (
                        <div className="text-sm text-muted-foreground">
                          {item.equipment.category.name}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline">
                      {t('ar', 'portal.quantity').replace('{count}', String(item.quantity))}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('ar', 'portal.quickActions')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <BookingActions
              bookingId={booking.id}
              status={booking.status}
              currentEndDate={booking.endDate.toISOString()}
              canCancel={canCancel}
              cancelNotAllowedMessage={cancelNotAllowedMessage}
              equipmentOptions={booking.equipment.map((be) => ({
                id: be.id,
                equipmentId: be.equipmentId,
                sku: be.equipment.sku,
                model: be.equipment.model,
              }))}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 border-t pt-2 md:grid-cols-3">
            {booking.contracts.length > 0 && (
              <Link href={`/portal/contracts/${booking.contracts[0].id}`}>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="ml-2 h-4 w-4" />
                  {t('ar', 'portal.viewContract')}
                </Button>
              </Link>
            )}
            {booking.status === 'PAYMENT_PENDING' && (
              <Button variant="default" className="w-full justify-start">
                <Receipt className="ml-2 h-4 w-4" />
                {t('ar', 'portal.payNow')}
              </Button>
            )}
            <Link href="/portal/invoices">
              <Button variant="outline" className="w-full justify-start">
                <Receipt className="ml-2 h-4 w-4" />
                {t('ar', 'portal.invoicesSection')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Payments */}
      {booking.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('ar', 'portal.paymentHistory')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {booking.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <div className="font-medium">{formatCurrency(payment.amount.toNumber())}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(payment.createdAt)}
                    </div>
                  </div>
                  <Badge variant={payment.status === 'SUCCESS' ? 'default' : 'secondary'}>
                    {payment.status === 'SUCCESS'
                      ? t('ar', 'portal.paymentPaid')
                      : payment.status === 'PENDING'
                        ? t('ar', 'portal.paymentPending')
                        : payment.status === 'PROCESSING'
                          ? t('ar', 'portal.paymentProcessing')
                          : payment.status === 'FAILED'
                            ? t('ar', 'portal.paymentFailed')
                            : payment.status === 'REFUNDED'
                              ? t('ar', 'portal.paymentRefunded')
                              : payment.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
