/**
 * @file portal/invoices/page.tsx
 * @description Client portal - My Invoices page
 * @module app/portal/invoices
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
import { Receipt, Download, CheckCircle, Clock } from 'lucide-react'

export default async function PortalInvoicesPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/portal/invoices')
  }

  const userId = session.user.id

  // Invoices are generated from bookings - fetch bookings with payment info
  const bookings = await prisma.booking.findMany({
    where: {
      customerId: userId,
      deletedAt: null,
      status: {
        in: ['CONFIRMED', 'ACTIVE', 'RETURNED', 'CLOSED'],
      },
    },
    include: {
      payments: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Transform bookings into invoice-like structure
  const invoices = bookings.map((booking) => ({
    id: booking.id,
    invoiceNumber: `INV-${booking.bookingNumber}`,
    bookingNumber: booking.bookingNumber,
    bookingId: booking.id,
    totalAmount: booking.totalAmount,
    createdAt: booking.createdAt,
    dueDate: booking.endDate,
    payments: booking.payments,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">فواتيري</h1>
        <p className="text-muted-foreground mt-2">
          عرض وتحميل جميع فواتيرك
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة الفواتير</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">لا توجد فواتير</p>
            </div>
          ) : (
            <div className="space-y-4">
              {invoices.map((invoice) => {
                const paidAmount = invoice.payments
                  .filter((p) => p.status === 'SUCCESS')
                  .reduce((sum, p) => sum + p.amount.toNumber(), 0)
                const isPaid = paidAmount >= invoice.totalAmount.toNumber()
                const isPartiallyPaid = paidAmount > 0 && !isPaid

                return (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Receipt className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium text-lg">
                          فاتورة #{invoice.invoiceNumber}
                        </span>
                        <Badge
                          variant={
                            isPaid
                              ? 'default'
                              : isPartiallyPaid
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {isPaid
                            ? 'مدفوعة'
                            : isPartiallyPaid
                            ? 'مدفوعة جزئياً'
                            : 'غير مدفوعة'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>
                          <span className="font-medium">الحجز:</span> #
                          {invoice.bookingNumber}
                        </div>
                        <div>
                          <span className="font-medium">المبلغ:</span>{' '}
                          {formatCurrency(invoice.totalAmount.toNumber())}
                        </div>
                        {isPartiallyPaid && (
                          <div>
                            <span className="font-medium">المدفوع:</span>{' '}
                            {formatCurrency(paidAmount)} /{' '}
                            {formatCurrency(invoice.totalAmount.toNumber())}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">تاريخ الإنشاء:</span>{' '}
                          {formatDate(invoice.createdAt)}
                        </div>
                        {invoice.dueDate && (
                          <div>
                            <span className="font-medium">تاريخ الاستحقاق:</span>{' '}
                            {formatDate(invoice.dueDate)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/portal/invoices/${invoice.id}`}>
                        <Button variant="outline" size="sm">
                          عرض التفاصيل
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 ml-2" />
                        تحميل
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
