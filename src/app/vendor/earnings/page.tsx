/**
 * Vendor earnings page
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/format.utils'
import { VendorEarningsClient } from './vendor-earnings-client'

export default async function VendorEarningsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?callbackUrl=/vendor/earnings')

  const vendor = await prisma.vendor.findFirst({
    where: { userId: session.user.id, deletedAt: null, status: 'APPROVED' },
  })
  if (!vendor) redirect('/login?error=VendorAccessDenied')

  const payouts = await prisma.vendorPayout.findMany({
    where: { vendorId: vendor.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const totals = payouts.reduce(
    (acc, p) => ({
      gross: acc.gross + Number(p.grossAmount),
      commission: acc.commission + Number(p.commissionAmount),
      net: acc.net + Number(p.netAmount),
    }),
    { gross: 0, commission: 0, net: 0 }
  )

  const now = new Date()
  const monthlyData: { month: string; gross: number; net: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
    const monthPayouts = payouts.filter(
      (p) =>
        new Date(p.createdAt) >= d && new Date(p.createdAt) <= next
    )
    const gross = monthPayouts.reduce((s, p) => s + Number(p.grossAmount), 0)
    const net = monthPayouts.reduce((s, p) => s + Number(p.netAmount), 0)
    monthlyData.push({ month: d.toISOString().slice(0, 7), gross, net })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">الأرباح</h1>
        <p className="text-muted-foreground mt-1">
          ملخص أرباحك وعمولة المنصة
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.gross)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">عمولة المنصة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.commission)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              نسبة {Number(vendor.commissionRate)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">صافي أرباحك</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.net)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الأرباح الشهرية</CardTitle>
        </CardHeader>
        <CardContent>
          <VendorEarningsClient monthlyData={monthlyData} />
        </CardContent>
      </Card>
    </div>
  )
}
