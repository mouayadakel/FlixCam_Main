/**
 * Vendor payouts page
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils/format.utils'

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'معلق',
  PROCESSING: 'قيد المعالجة',
  PAID: 'مدفوع',
  FAILED: 'فشل',
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
        <h1 className="text-3xl font-bold">المدفوعات</h1>
        <p className="text-muted-foreground mt-1">
          سجل مدفوعاتك من المنصة
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">معلق الدفع</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(Number(pendingSum._sum.netAmount ?? 0))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingSum._count} دفعة
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">تم الدفع</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(Number(paidSum._sum.netAmount ?? 0))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {paidSum._count} دفعة
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>سجل المدفوعات</CardTitle>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">
              لا توجد مدفوعات بعد
            </p>
          ) : (
            <div className="space-y-4">
              {payouts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
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
                        {STATUS_LABELS[p.status] || p.status}
                      </Badge>
                      {p.bookingId && (
                        <span className="text-sm text-muted-foreground">
                          حجز #{p.bookingId.slice(0, 8)}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {formatDate(p.createdAt)}
                      {p.paidAt && ` • تم الدفع: ${formatDate(p.paidAt)}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(Number(p.netAmount))}</div>
                    <div className="text-xs text-muted-foreground">
                      إجمالي {formatCurrency(Number(p.grossAmount))} – عمولة{' '}
                      {formatCurrency(Number(p.commissionAmount))}
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
