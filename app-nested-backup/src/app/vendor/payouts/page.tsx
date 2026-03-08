/**
 * Vendor payouts page
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils/format.utils'
import { t } from '@/lib/i18n/translate'

function getPayoutStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: t('ar', 'vendor.statusPending'),
    PROCESSING: t('ar', 'vendor.statusProcessing'),
    PAID: t('ar', 'vendor.statusPaid'),
    FAILED: t('ar', 'vendor.statusFailed'),
  }
  return map[status] || status
}

export default async function VendorPayoutsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?callbackUrl=/vendor/payouts')

  const vendor = await prisma.vendor.findFirst({
    where: { userId: session.user.id, deletedAt: null, status: 'APPROVED' },
  })
  if (!vendor) redirect('/login?error=VendorAccessDenied')

  const payouts = await prisma.vendorPayout.findMany({
    where: { vendorId: vendor.id },
    orderBy: { createdAt: 'desc' },
  })

  const [pendingSum, paidSum] = await Promise.all([
    prisma.vendorPayout.aggregate({
      where: { vendorId: vendor.id, status: 'PENDING' },
      _sum: { netAmount: true },
      _count: true,
    }),
    prisma.vendorPayout.aggregate({
      where: { vendorId: vendor.id, status: 'PAID' },
      _sum: { netAmount: true },
      _count: true,
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('ar', 'vendor.payoutsPage')}</h1>
        <p className="mt-1 text-muted-foreground">{t('ar', 'vendor.payoutsDesc')}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('ar', 'vendor.pendingPayout')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(Number(pendingSum._sum.netAmount ?? 0))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {pendingSum._count} {t('ar', 'vendor.paymentUnit')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('ar', 'vendor.paidOut')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(Number(paidSum._sum.netAmount ?? 0))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {paidSum._count} {t('ar', 'vendor.paymentUnit')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('ar', 'vendor.payoutsHistory')}</CardTitle>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              {t('ar', 'vendor.noPayoutsYet')}
            </p>
          ) : (
            <div className="space-y-4">
              {payouts.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          p.status === 'PAID'
                            ? 'default'
                            : p.status === 'FAILED'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {getPayoutStatusLabel(p.status)}
                      </Badge>
                      {p.bookingId && (
                        <span className="text-sm text-muted-foreground">
                          {t('ar', 'vendor.bookingHash').replace('{id}', p.bookingId.slice(0, 8))}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {formatDate(p.createdAt)}
                      {p.paidAt &&
                        ` • ${t('ar', 'vendor.paidAt').replace('{date}', formatDate(p.paidAt))}`}
                    </div>
                  </div>
                  <div className="text-end">
                    <div className="font-medium">{formatCurrency(Number(p.netAmount))}</div>
                    <div className="text-xs text-muted-foreground">
                      {t('ar', 'vendor.grossMinusCommission')
                        .replace('{gross}', formatCurrency(Number(p.grossAmount)))
                        .replace('{commission}', formatCurrency(Number(p.commissionAmount)))}
                    </div>
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
