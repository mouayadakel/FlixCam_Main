/**
 * @file portal/invoices/page.tsx
 * @description Client portal — list invoices from Invoice model (customer-scoped).
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils/format.utils'
import { Receipt, Download } from 'lucide-react'
import { t } from '@/lib/i18n/translate'
import { getRequestLocale } from '@/lib/i18n/request-locale'

export default async function PortalInvoicesPage() {
  const session = await auth()
  const { locale } = await getRequestLocale()

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/portal/invoices')
  }

  const userId = session.user.id

  const rows = await prisma.invoice.findMany({
    where: {
      customerId: userId,
      deletedAt: null,
    },
    include: {
      booking: { select: { bookingNumber: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t(locale, 'portal.myInvoices')}</h1>
        <p className="mt-2 text-muted-foreground">{t(locale, 'portal.myInvoicesDesc')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t(locale, 'portal.invoicesList')}</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">{t(locale, 'portal.noInvoices')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rows.map((invoice) => {
                const total = invoice.totalAmount.toNumber()
                const paid = invoice.paidAmount.toNumber()
                const remaining = invoice.remainingAmount.toNumber()
                const isPaid = remaining <= 0.009 || invoice.status === 'PAID'
                const isPartiallyPaid = paid > 0 && !isPaid

                return (
                  <div
                    key={invoice.id}
                    className="flex flex-col gap-3 rounded-lg border p-4 transition-colors hover:bg-neutral-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-3">
                        <Receipt className="h-5 w-5 text-muted-foreground" />
                        <span className="text-lg font-medium">
                          {t(locale, 'portal.invoiceHash').replace(
                            '{number}',
                            invoice.invoiceNumber
                          )}
                        </span>
                        <Badge
                          variant={isPaid ? 'default' : isPartiallyPaid ? 'secondary' : 'outline'}
                        >
                          {isPaid
                            ? t(locale, 'portal.paid')
                            : isPartiallyPaid
                              ? t(locale, 'portal.partiallyPaid')
                              : t(locale, 'portal.unpaid')}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {invoice.booking?.bookingNumber && (
                          <div>
                            <span className="font-medium">{t(locale, 'portal.booking')}:</span> #
                            {invoice.booking.bookingNumber}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">{t(locale, 'portal.amount')}:</span>{' '}
                          {formatCurrency(total)}
                        </div>
                        {isPartiallyPaid && (
                          <div>
                            <span className="font-medium">{t(locale, 'portal.paidAmount')}:</span>{' '}
                            {formatCurrency(paid)} / {formatCurrency(total)}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">{t(locale, 'portal.createdDate')}:</span>{' '}
                          {formatDate(invoice.createdAt)}
                        </div>
                        <div>
                          <span className="font-medium">{t(locale, 'portal.dueDate')}:</span>{' '}
                          {formatDate(invoice.dueDate)}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/portal/invoices/${invoice.id}`}>
                        <Button variant="outline" size="sm">
                          {t(locale, 'portal.viewDetails')}
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener noreferrer">
                          <Download className="ms-2 h-4 w-4" />
                          {t(locale, 'portal.download')}
                        </a>
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
