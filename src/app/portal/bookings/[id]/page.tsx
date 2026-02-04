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

const CANCELLATION_HOURS_BEFORE_START = 48

export default async function PortalBookingDetailPage({
  params,
}: {
  params: { id: string }
}) {
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
      ? `الإلغاء مسموح قبل ${CANCELLATION_HOURS_BEFORE_START} ساعة على الأقل من تاريخ البداية.`
      : undefined

  function getStatusBadge(status: BookingStatus) {
    const statusConfig: Record<BookingStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      DRAFT: { label: 'مسودة', variant: 'outline' },
      RISK_CHECK: { label: 'فحص المخاطر', variant: 'outline' },
      PAYMENT_PENDING: { label: 'انتظار الدفع', variant: 'secondary' },
      CONFIRMED: { label: 'مؤكد', variant: 'default' },
      ACTIVE: { label: 'نشط', variant: 'default' },
      RETURNED: { label: 'مرتجع', variant: 'secondary' },
      CLOSED: { label: 'مغلق', variant: 'outline' },
      CANCELLED: { label: 'ملغي', variant: 'destructive' },
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
            className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1"
          >
            <ArrowRight className="h-4 w-4" />
            العودة إلى الحجوزات
          </Link>
          <h1 className="text-3xl font-bold">
            حجز #{booking.bookingNumber}
          </h1>
        </div>
        {getStatusBadge(booking.status)}
      </div>

      {/* Booking Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              معلومات الحجز
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">تاريخ البداية</div>
              <div className="font-medium">{formatDate(booking.startDate)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">تاريخ النهاية</div>
              <div className="font-medium">{formatDate(booking.endDate)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">المبلغ الإجمالي</div>
              <div className="font-medium text-lg">
                {formatCurrency(booking.totalAmount.toNumber())}
              </div>
            </div>
            {booking.depositAmount && (
              <div>
                <div className="text-sm text-muted-foreground">العهدة</div>
                <div className="font-medium">
                  {formatCurrency(booking.depositAmount.toNumber())}
                </div>
              </div>
            )}
            {'actualReturnDate' in booking && booking.actualReturnDate && (
              <div>
                <div className="text-sm text-muted-foreground">تاريخ الإرجاع الفعلي</div>
                <div className="font-medium">{formatDate(booking.actualReturnDate)}</div>
              </div>
            )}
            {'lateFeeAmount' in booking && booking.lateFeeAmount && Number(booking.lateFeeAmount) > 0 && (
              <div>
                <div className="text-sm text-muted-foreground">رسوم التأخير (150%)</div>
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
              المعدات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {booking.equipment.length === 0 ? (
              <p className="text-muted-foreground">لا توجد معدات</p>
            ) : (
              <div className="space-y-3">
                {booking.equipment.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">
                        {item.equipment.sku}
                      </div>
                      {item.equipment.model && (
                        <div className="text-sm text-muted-foreground">
                          {item.equipment.model}
                        </div>
                      )}
                      {item.equipment.category && (
                        <div className="text-sm text-muted-foreground">
                          {item.equipment.category.name}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline">الكمية: {item.quantity}</Badge>
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
          <CardTitle>إجراءات سريعة</CardTitle>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t">
            {booking.contracts.length > 0 && (
              <Link href={`/portal/contracts/${booking.contracts[0].id}`}>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 ml-2" />
                  عرض العقد
                </Button>
              </Link>
            )}
            {booking.status === 'PAYMENT_PENDING' && (
              <Button variant="default" className="w-full justify-start">
                <Receipt className="h-4 w-4 ml-2" />
                دفع الآن
              </Button>
            )}
            <Link href="/portal/invoices">
              <Button variant="outline" className="w-full justify-start">
                <Receipt className="h-4 w-4 ml-2" />
                الفواتير
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Payments */}
      {booking.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>سجل الدفعات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {booking.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">
                      {formatCurrency(payment.amount.toNumber())}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(payment.createdAt)}
                    </div>
                  </div>
                  <Badge
                    variant={
                      payment.status === 'SUCCESS' ? 'default' : 'secondary'
                    }
                  >
                    {payment.status === 'SUCCESS' 
                      ? 'مدفوع' 
                      : payment.status === 'PENDING'
                      ? 'قيد الانتظار'
                      : payment.status === 'PROCESSING'
                      ? 'قيد المعالجة'
                      : payment.status === 'FAILED'
                      ? 'فشل'
                      : payment.status === 'REFUNDED'
                      ? 'مسترد'
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
