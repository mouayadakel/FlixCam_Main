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

export default async function PortalBookingsPage({
  searchParams,
}: {
  searchParams: { status?: string; search?: string }
}) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/portal/bookings')
  }

  const userId = session.user.id
  const statusFilter = searchParams.status
  const searchQuery = searchParams.search

  // Build where clause
  const where: any = {
    customerId: userId,
    deletedAt: null,
  }

  if (statusFilter && statusFilter !== 'all') {
    where.status = statusFilter as BookingStatus
  }

  if (searchQuery) {
    where.OR = [
      { bookingNumber: { contains: searchQuery, mode: 'insensitive' } },
    ]
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
      <div>
        <h1 className="text-3xl font-bold">حجوزاتي</h1>
        <p className="text-muted-foreground mt-2">
          عرض وإدارة جميع حجوزاتك
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>البحث والتصفية</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="text"
                name="search"
                placeholder="البحث برقم الحجز..."
                defaultValue={searchQuery || ''}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <select
              name="status"
              defaultValue={statusFilter || 'all'}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">جميع الحالات</option>
              <option value="DRAFT">مسودة</option>
              <option value="CONFIRMED">مؤكد</option>
              <option value="ACTIVE">نشط</option>
              <option value="RETURNED">مرتجع</option>
              <option value="CLOSED">مغلق</option>
              <option value="CANCELLED">ملغي</option>
            </select>
            <Button type="submit">تصفية</Button>
          </form>
        </CardContent>
      </Card>

      {/* Bookings List */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الحجوزات</CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">لا توجد حجوزات</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium text-lg">
                        حجز #{booking.bookingNumber}
                      </span>
                      {getStatusBadge(booking.status)}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>
                        <span className="font-medium">التواريخ:</span> من{' '}
                        {formatDate(booking.startDate)} إلى{' '}
                        {formatDate(booking.endDate)}
                      </div>
                      <div>
                        <span className="font-medium">المبلغ:</span>{' '}
                        {formatCurrency(booking.totalAmount.toNumber())}
                      </div>
                      <div>
                        <span className="font-medium">المعدات:</span>{' '}
                        {booking.equipment.length} عنصر
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/portal/bookings/${booking.id}`}>
                      <Button variant="outline" size="sm">
                        عرض التفاصيل
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
