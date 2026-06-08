/**
 * @file portal/invoices/[id]/page.tsx
 * @description Client portal — invoice detail (Invoice + line items; customer ownership enforced in query).
 */

import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils/format.utils'
import { ArrowRight, Receipt, Download, CreditCard } from 'lucide-react'

export default async function PortalInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/portal/invoices')
  }

  const userId = session.user.id
  const { id } = await params

  const invoice = await prisma.invoice.findFirst({
    where: {
      id,
      customerId: userId,
      deletedAt: null,
    },
    include: {
      lineItems: { orderBy: { sortOrder: 'asc' } },
      booking: {
        select: {
          id: true,
          bookingNumber: true,
        },
      },
      payments: {
        where: { deletedAt: null },
        include: {
          payment: {
            select: {
              id: true,
              amount: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: { paidAt: 'desc' },
      },
    },
  })

  if (!invoice) {
    notFound()
  }

  const totalAmount = invoice.totalAmount.toNumber()
  const paidAmount = invoice.paidAmount.toNumber()
  const remainingAmount = invoice.remainingAmount.toNumber()
  const isPaid = remainingAmount <= 0.009 || invoice.status === 'PAID'
  const isPartiallyPaid = paidAmount > 0 && !isPaid

  const statusAr =
    invoice.status === 'PAID'
      ? 'مدفوعة'
      : invoice.status === 'PARTIALLY_PAID'
        ? 'مدفوعة جزئياً'
        : invoice.status === 'OVERDUE'
          ? 'متأخرة'
          : invoice.status === 'DRAFT'
            ? 'مسودة'
            : invoice.status === 'CANCELLED'
              ? 'ملغاة'
              : invoice.status === 'SENT'
                ? 'مُرسلة'
                : String(invoice.status)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/portal/invoices"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowRight className="h-4 w-4" />
            العودة إلى الفواتير
          </Link>
          <h1 className="text-3xl font-bold">فاتورة #{invoice.invoiceNumber}</h1>
        </div>
        <Badge variant={isPaid ? 'default' : isPartiallyPaid ? 'secondary' : 'outline'}>
          {statusAr}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              معلومات الفاتورة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {invoice.booking?.bookingNumber && (
              <div>
                <div className="text-sm text-muted-foreground">رقم الحجز</div>
                <div className="font-medium">#{invoice.booking.bookingNumber}</div>
              </div>
            )}
            <div>
              <div className="text-sm text-muted-foreground">تاريخ الإصدار</div>
              <div className="font-medium">{formatDate(invoice.issueDate)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">تاريخ الاستحقاق</div>
              <div className="font-medium">{formatDate(invoice.dueDate)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">المبلغ الإجمالي</div>
              <div className="text-lg font-medium">{formatCurrency(totalAmount)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">المدفوع</div>
              <div className="font-medium">{formatCurrency(paidAmount)}</div>
            </div>
            {!isPaid && (
              <div>
                <div className="text-sm text-muted-foreground">المتبقي</div>
                <div className="font-medium text-destructive">{formatCurrency(remainingAmount)}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>سجل الدفعات</CardTitle>
          </CardHeader>
          <CardContent>
            {invoice.payments.length === 0 ? (
              <p className="text-muted-foreground">لا توجد دفعات مسجلة على الفاتورة</p>
            ) : (
              <div className="space-y-3">
                {invoice.payments.map((ip) => {
                  const p = ip.payment
                  return (
                    <div
                      key={ip.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <div className="font-medium">{formatCurrency(p.amount.toNumber())}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(p.createdAt)}
                        </div>
                      </div>
                      <Badge variant={p.status === 'SUCCESS' ? 'default' : 'secondary'}>
                        {p.status === 'SUCCESS'
                          ? 'مدفوع'
                          : p.status === 'PENDING'
                            ? 'قيد الانتظار'
                            : p.status}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {invoice.lineItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>بنود الفاتورة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invoice.lineItems.map((line) => (
                <div
                  key={line.id}
                  className="flex flex-col gap-1 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="font-medium">{line.description}</div>
                    <div className="text-sm text-muted-foreground">
                      الكمية: {Number(line.quantity)} × {formatCurrency(Number(line.unitPrice))}
                      {line.rentalDays != null && line.rentalDays > 0
                        ? ` × ${line.rentalDays} يوم`
                        : ''}
                    </div>
                  </div>
                  <div className="font-medium">{formatCurrency(line.lineTotalWithVat.toNumber())}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>الإجراءات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            {!isPaid && invoice.booking?.id && (
              <Button asChild>
                <Link href={`/checkout/moyasar/${invoice.booking.id}`}>
                  <CreditCard className="ms-2 h-4 w-4" />
                  دفع الآن
                </Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener noreferrer">
                <Download className="ms-2 h-4 w-4" />
                تحميل PDF
              </a>
            </Button>
            {invoice.booking?.id && (
              <Link href={`/portal/bookings/${invoice.booking.id}`}>
                <Button variant="outline">عرض الحجز</Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
