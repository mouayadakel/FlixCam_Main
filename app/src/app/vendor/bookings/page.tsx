/**
 * Vendor bookings page – bookings involving vendor's equipment
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils/format.utils'
import { AlertTriangle } from 'lucide-react'
import { t } from '@/lib/i18n/translate'

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    DRAFT: t('ar', 'portal.statusDraft'),
    CONFIRMED: t('ar', 'portal.statusConfirmed'),
    ACTIVE: t('ar', 'portal.statusActive'),
    RETURNED: t('ar', 'portal.statusReturned'),
    CLOSED: t('ar', 'portal.statusClosed'),
    CANCELLED: t('ar', 'portal.statusCancelled'),
  }
  return map[status] || status
}

export default async function VendorBookingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?callbackUrl=/vendor/bookings')

  const vendor = await prisma.vendor.findFirst({
    where: { userId: session.user.id, deletedAt: null, status: 'APPROVED' },
  })
  if (!vendor) redirect('/login?error=VendorAccessDenied')

  const bookings = await prisma.booking.findMany({
    where: {
      equipment: { some: { equipment: { vendorId: vendor.id } } },
      deletedAt: null,
    },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      equipment: {
        where: { equipment: { vendorId: vendor.id } },
        include: {
          equipment: { select: { id: true, sku: true, model: true, dailyPrice: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const now = new Date()
  const lateReturns = bookings.filter((b) => b.status === 'ACTIVE' && new Date(b.endDate) < now)
  const activeCount = bookings.filter((b) => b.status === 'ACTIVE').length
  const confirmedCount = bookings.filter((b) => b.status === 'CONFIRMED').length
  const totalRevenue = bookings
    .filter((b) => b.status !== 'CANCELLED')
    .reduce((s, b) => s + Number(b.totalAmount), 0)

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold">{t('ar', 'vendor.myEquipmentBookings')}</h1>
        <p className="mt-1 text-muted-foreground">{t('ar', 'vendor.myEquipmentBookingsDesc')}</p>
      </div>

      {lateReturns.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="font-medium text-red-800">
              {t('ar', 'vendor.lateReturns').replace('{count}', String(lateReturns.length))}
            </p>
            <p className="text-sm text-red-700">{t('ar', 'vendor.lateReturnsDesc')}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pb-3 pt-4">
            <p className="text-sm text-muted-foreground">{t('ar', 'vendor.totalBookings')}</p>
            <p className="text-2xl font-bold">{bookings.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-3 pt-4">
            <p className="text-sm text-muted-foreground">{t('ar', 'vendor.active')}</p>
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-3 pt-4">
            <p className="text-sm text-muted-foreground">{t('ar', 'vendor.confirmed')}</p>
            <p className="text-2xl font-bold text-blue-600">{confirmedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-3 pt-4">
            <p className="text-sm text-muted-foreground">{t('ar', 'vendor.totalRevenue')}</p>
            <p className="text-xl font-bold">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('ar', 'vendor.bookingsList')}</CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              {t('ar', 'vendor.noBookingsYet')}
            </p>
          ) : (
            <div className="space-y-4">
              {bookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">#{b.bookingNumber}</span>
                      <Badge variant="outline">{getStatusLabel(b.status)}</Badge>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {formatDate(b.startDate)} – {formatDate(b.endDate)}
                    </div>
                    <div className="mt-1 text-sm">
                      {b.equipment.map((be) => be.equipment.model || be.equipment.sku).join(', ')}
                    </div>
                    {b.customer && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {b.customer.name || b.customer.email}
                      </div>
                    )}
                  </div>
                  <div className="text-end">
                    <div className="font-medium">{formatCurrency(Number(b.totalAmount))}</div>
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
