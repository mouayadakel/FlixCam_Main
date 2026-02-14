/**
 * Vendor bookings page – bookings involving vendor's equipment
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils/format.utils'

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'مسودة',
  CONFIRMED: 'مؤكد',
  ACTIVE: 'نشط',
  RETURNED: 'مرتجع',
  CLOSED: 'مغلق',
  CANCELLED: 'ملغي',
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">الحجوزات على معداتي</h1>
        <p className="text-muted-foreground mt-1">
          الحجوزات التي تشمل معداتك المدرجة
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة الحجوزات</CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">
              لا توجد حجوزات بعد
            </p>
          ) : (
            <div className="space-y-4">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">#{b.bookingNumber}</span>
                      <Badge variant="outline">{STATUS_LABELS[b.status] || b.status}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {formatDate(b.startDate)} – {formatDate(b.endDate)}
                    </div>
                    <div className="text-sm mt-1">
                      {b.equipment
                        .map((be) => be.equipment.model || be.equipment.sku)
                        .join(', ')}
                    </div>
                    {b.customer && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {b.customer.name || b.customer.email}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
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
