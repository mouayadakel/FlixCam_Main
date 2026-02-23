/**
 * Vendor earnings page
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/format.utils'
import { VendorEarningsClient } from './vendor-earnings-client'
import { t } from '@/lib/i18n/translate'

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
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

  const thisMonthPayouts = payouts.filter((p) => new Date(p.createdAt) >= startOfThisMonth)
  const lastMonthPayouts = payouts.filter(
    (p) => new Date(p.createdAt) >= startOfLastMonth && new Date(p.createdAt) <= endOfLastMonth
  )

  const thisMonthNet = thisMonthPayouts.reduce((s, p) => s + Number(p.netAmount), 0)
  const lastMonthNet = lastMonthPayouts.reduce((s, p) => s + Number(p.netAmount), 0)
  const growthPct = lastMonthNet > 0 ? ((thisMonthNet - lastMonthNet) / lastMonthNet) * 100 : 0
  const monthlyData: { month: string; gross: number; net: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
    const monthPayouts = payouts.filter(
      (p) => new Date(p.createdAt) >= d && new Date(p.createdAt) <= next
    )
    const gross = monthPayouts.reduce((s, p) => s + Number(p.grossAmount), 0)
    const net = monthPayouts.reduce((s, p) => s + Number(p.netAmount), 0)
    monthlyData.push({ month: d.toISOString().slice(0, 7), gross, net })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('ar', 'vendor.earningsPage')}</h1>
        <p className="mt-1 text-muted-foreground">{t('ar', 'vendor.earningsSummaryDesc')}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('ar', 'vendor.totalGrossRevenue')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.gross)}</div>
            <p className="mt-1 text-xs text-muted-foreground">{t('ar', 'vendor.allTime')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('ar', 'vendor.platformCommission')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.commission)}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('ar', 'vendor.commissionRate').replace(
                '{rate}',
                String(Number(vendor.commissionRate))
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('ar', 'vendor.netEarnings')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.net)}</div>
            <p className="mt-1 text-xs text-muted-foreground">{t('ar', 'vendor.allTime')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('ar', 'vendor.thisMonth')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(thisMonthNet)}</div>
            <p className={`mt-1 text-xs ${growthPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {growthPct >= 0 ? '+' : ''}
              {t('ar', 'vendor.vsLastMonth').replace('{pct}', growthPct.toFixed(1))}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('ar', 'vendor.monthlyEarnings')}</CardTitle>
        </CardHeader>
        <CardContent>
          <VendorEarningsClient monthlyData={monthlyData} />
        </CardContent>
      </Card>
    </div>
  )
}
