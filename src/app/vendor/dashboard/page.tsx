/**
 * Vendor dashboard – overview stats, recent bookings, earnings summary
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  Package,
  Calendar,
  DollarSign,
  TrendingUp,
  ArrowLeft,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format.utils'
import { VendorDashboardClient } from './vendor-dashboard-client'

export default async function VendorDashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?callbackUrl=/vendor/dashboard')

  const vendor = await prisma.vendor.findFirst({
    where: { userId: session.user.id, deletedAt: null, status: 'APPROVED' },
  })
  if (!vendor) redirect('/login?error=VendorAccessDenied')

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [equipmentCount, activeRentalsCount, monthEarnings, allTimeEarnings, recentBookings] =
    await Promise.all([
      prisma.equipment.count({
        where: { vendorId: vendor.id, deletedAt: null, isActive: true },
      }),
      prisma.bookingEquipment.count({
        where: {
          equipment: { vendorId: vendor.id },
          booking: {
            status: { in: ['CONFIRMED', 'ACTIVE'] },
            deletedAt: null,
          },
        },
      }),
      prisma.vendorPayout.aggregate({
        where: { vendorId: vendor.id, createdAt: { gte: startOfMonth } },
        _sum: { netAmount: true },
      }),
      prisma.vendorPayout.aggregate({
        where: { vendorId: vendor.id },
        _sum: { netAmount: true },
      }),
      prisma.booking.findMany({
        where: {
          equipment: { some: { equipment: { vendorId: vendor.id } } },
          deletedAt: null,
        },
        include: {
          equipment: {
            where: { equipment: { vendorId: vendor.id } },
            include: { equipment: { select: { sku: true, model: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

  const monthNet = Number(monthEarnings._sum.netAmount ?? 0)
  const allTimeNet = Number(allTimeEarnings._sum.netAmount ?? 0)

  const monthlyData: { month: string; gross: number; net: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
    const payouts = await prisma.vendorPayout.findMany({
      where: { vendorId: vendor.id, createdAt: { gte: d, lte: next } },
    })
    const gross = payouts.reduce((s, p) => s + Number(p.grossAmount), 0)
    const net = payouts.reduce((s, p) => s + Number(p.netAmount), 0)
    monthlyData.push({ month: d.toISOString().slice(0, 7), gross, net })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">لوحة تحكم المورد</h1>
        <p className="text-muted-foreground mt-2">
          مرحباً، {vendor.companyName}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المعدات المدرجة</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{equipmentCount}</div>
            <p className="text-xs text-muted-foreground mt-1">معدات نشطة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">التأجيرات النشطة</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeRentalsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">الآن</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">أرباح هذا الشهر</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(monthNet)}</div>
            <p className="text-xs text-muted-foreground mt-1">صافي بعد العمولة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الأرباح</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(allTimeNet)}</div>
            <p className="text-xs text-muted-foreground mt-1">كل الوقت</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>الأرباح الشهرية</CardTitle>
          </CardHeader>
          <CardContent>
            <VendorDashboardClient monthlyData={monthlyData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>أحدث الحجوزات</CardTitle>
            <Link href="/vendor/bookings">
              <Button variant="ghost" size="sm">
                عرض الكل
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد حجوزات بعد</p>
            ) : (
              <div className="space-y-3">
                {recentBookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <span className="font-medium">#{b.bookingNumber}</span>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(b.startDate)} – {formatDate(b.endDate)}
                      </div>
                      <div className="text-xs">
                        {b.equipment
                          .map((be) => be.equipment.model || be.equipment.sku)
                          .join(', ')}
                      </div>
                    </div>
                    <span className="text-sm font-medium">
                      {formatCurrency(Number(b.totalAmount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>إجراءات سريعة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Link href="/vendor/equipment/new">
              <Button>
                <ArrowLeft className="h-4 w-4 ml-2" />
                إضافة معدات جديدة
              </Button>
            </Link>
            <Link href="/vendor/equipment">
              <Button variant="outline">عرض المعدات</Button>
            </Link>
            <Link href="/vendor/payouts">
              <Button variant="outline">عرض المدفوعات</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
