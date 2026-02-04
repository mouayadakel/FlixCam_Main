/**
 * @file portal/documents/page.tsx
 * @description Client portal - Documents hub (contracts + invoices + PDF links). Phase 4.4.
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/db/prisma'
import { formatDate, formatCurrency } from '@/lib/utils/format.utils'
import { FileText, Receipt, Download } from 'lucide-react'

export default async function PortalDocumentsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/portal/documents')
  }

  const userId = session.user.id

  const [contracts, bookingsWithPayments] = await Promise.all([
    prisma.contract.findMany({
      where: {
        booking: { customerId: userId, deletedAt: null },
        deletedAt: null,
      },
      include: {
        booking: {
          select: { id: true, bookingNumber: true, startDate: true, endDate: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.booking.findMany({
      where: {
        customerId: userId,
        deletedAt: null,
        status: { in: ['CONFIRMED', 'ACTIVE', 'RETURNED', 'CLOSED'] },
      },
      include: {
        payments: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const invoiceItems = bookingsWithPayments.map((b) => ({
    id: b.id,
    label: `فاتورة حجز #${b.bookingNumber}`,
    bookingNumber: b.bookingNumber,
    totalAmount: b.totalAmount,
    createdAt: b.createdAt,
    dueDate: b.endDate,
    payments: b.payments,
  }))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">المستندات</h1>
        <p className="text-muted-foreground mt-2">
          العقود والفواتير والملفات المتعلقة بحجوزاتك
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            العقود
          </CardTitle>
          <CardDescription>عقود الحجز والتوقيع الإلكتروني</CardDescription>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">لا توجد عقود</p>
          ) : (
            <ul className="space-y-3">
              {contracts.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div>
                    <span className="font-medium">عقد حجز #{c.booking.bookingNumber}</span>
                    <span className="text-muted-foreground text-sm mr-2">
                      — {formatDate(c.createdAt)}
                      {c.signedAt && ` · موقع ${formatDate(c.signedAt)}`}
                    </span>
                  </div>
                  <Link href={`/portal/contracts/${c.id}`}>
                    <Button variant="outline" size="sm">
                      {c.signedAt ? 'عرض' : 'توقيع'}
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <Link href="/portal/contracts">
              <Button variant="secondary" size="sm">
                عرض كل العقود
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            الفواتير
          </CardTitle>
          <CardDescription>فواتير الحجز والمدفوعات</CardDescription>
        </CardHeader>
        <CardContent>
          {invoiceItems.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">لا توجد فواتير</p>
          ) : (
            <ul className="space-y-3">
              {invoiceItems.map((inv) => {
                const paid = inv.payments
                  .filter((p) => p.status === 'SUCCESS')
                  .reduce((s, p) => s + p.amount.toNumber(), 0)
                const isPaid = paid >= inv.totalAmount.toNumber()
                return (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div>
                      <span className="font-medium">{inv.label}</span>
                      <span className="text-muted-foreground text-sm mr-2">
                        — {formatCurrency(inv.totalAmount.toNumber())}
                        {isPaid ? ' · مدفوعة' : ''}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/portal/invoices/${inv.id}`}>
                        <Button variant="outline" size="sm">
                          عرض
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 ml-1" />
                        PDF
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          <div className="mt-4">
            <Link href="/portal/invoices">
              <Button variant="secondary" size="sm">
                عرض كل الفواتير
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
