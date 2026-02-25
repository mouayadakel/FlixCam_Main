/**
 * @file portal/invoices/[id]/page.tsx
 * @description Client portal - Invoice detail page
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
import { ArrowRight, Receipt, Download, CreditCard } from 'lucide-react'
import { notFound } from 'next/navigation'

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

  // Invoice is generated from booking - fetch booking with payment info
  const booking = await prisma.booking.findFirst({
    where: {
      id,
      customerId: userId,
      deletedAt: null,
    },
    include: {
      payments: {
        orderBy: {
          createdAt: 'desc',
        },
      },
      equipment: {
        include: {
          equipment: {
            select: {
              sku: true,
              model: true,
              category: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!booking) {
    notFound()
  }

  // Transform booking into invoice structure
  const invoice = {
    id: booking.id,
    invoiceNumber: `INV-${booking.bookingNumber}`,
    bookingNumber: booking.bookingNumber,
    bookingId: booking.id,
    totalAmount: booking.totalAmount,
    createdAt: booking.createdAt,
    dueDate: booking.endDate,
    payments: booking.payments,
    items: booking.equipment.map((item) => ({
      description: `${item.equipment.sku} - ${item.equipment.model || ''}`,
      quantity: item.quantity,
      amount: booking.totalAmount.toNumber() / booking.equipment.length, // Simplified
    })),
  }

  const paidAmount = invoice.payments
    .filter((p) => p.status === 'SUCCESS')
    .reduce((sum, p) => sum + p.amount.toNumber(), 0)
  const isPaid = paidAmount >= invoice.totalAmount.toNumber()
  const isPartiallyPaid = paidAmount > 0 && !isPaid
  const remainingAmount = invoice.totalAmount.toNumber() - paidAmount

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
          {isPaid ? 'مدفوعة' : isPartiallyPaid ? 'مدفوعة جزئياً' : 'غير مدفوعة'}
        </Badge>
      </div>

      {/* Invoice Information */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              معلومات الفاتورة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">رقم الحجز</div>
              <div className="font-medium">#{invoice.bookingNumber}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">تاريخ الإنشاء</div>
              <div className="font-medium">{formatDate(invoice.createdAt)}</div>
            </div>
            {invoice.dueDate && (
              <div>
                <div className="text-sm text-muted-foreground">تاريخ الاستحقاق</div>
                <div className="font-medium">{formatDate(invoice.dueDate)}</div>
              </div>
            )}
            <div>
              <div className="text-sm text-muted-foreground">المبلغ الإجمالي</div>
              <div className="text-lg font-medium">
                {formatCurrency(invoice.totalAmount.toNumber())}
              </div>
            </div>
            {isPartiallyPaid && (
              <>
                <div>
                  <div className="text-sm text-muted-foreground">المدفوع</div>
                  <div className="font-medium text-success-600">{formatCurrency(paidAmount)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">المتبقي</div>
                  <div className="font-medium text-error-600">
                    {formatCurrency(remainingAmount)}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>سجل الدفعات</CardTitle>
          </CardHeader>
          <CardContent>
            {invoice.payments.length === 0 ? (
              <p className="text-muted-foreground">لا توجد دفعات</p>
            ) : (
              <div className="space-y-3">
                {invoice.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <div className="font-medium">{formatCurrency(payment.amount.toNumber())}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(payment.createdAt)}
                      </div>
                    </div>
                    <Badge variant={payment.status === 'SUCCESS' ? 'default' : 'secondary'}>
                      {payment.status === 'SUCCESS'
                        ? 'مدفوع'
                        : payment.status === 'PENDING'
                          ? 'قيد الانتظار'
                          : payment.status === 'PROCESSING'
                            ? 'قيد المعالجة'
                            : payment.status === 'FAILED'
                              ? 'فشل'
                              : payment.status === 'REFUNDED'
                                ? 'مسترد'
                                : payment.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invoice Items */}
      {invoice.items && invoice.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>بنود الفاتورة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invoice.items.map((item, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <div className="font-medium">{item.description || `بند ${index + 1}`}</div>
                    {item.quantity && (
                      <div className="text-sm text-muted-foreground">الكمية: {item.quantity}</div>
                    )}
                  </div>
                  <div className="font-medium">{formatCurrency(item.amount)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>الإجراءات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {!isPaid && (
              <Button>
                <CreditCard className="ml-2 h-4 w-4" />
                دفع الآن
              </Button>
            )}
            <Button variant="outline">
              <Download className="ml-2 h-4 w-4" />
              تحميل PDF
            </Button>
            <Link href={`/portal/bookings/${invoice.bookingId}`}>
              <Button variant="outline">عرض الحجز</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
