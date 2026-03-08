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
import { t } from '@/lib/i18n/translate'

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
    label: t('ar', 'portal.bookingInvoiceHash').replace('{number}', b.bookingNumber),
    bookingNumber: b.bookingNumber,
    totalAmount: b.totalAmount,
    createdAt: b.createdAt,
    dueDate: b.endDate,
    payments: b.payments,
  }))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{t('ar', 'portal.documents')}</h1>
        <p className="mt-2 text-muted-foreground">{t('ar', 'portal.documentsDesc')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('ar', 'portal.contractsSection')}
          </CardTitle>
          <CardDescription>{t('ar', 'portal.contractsSectionDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">
              {t('ar', 'portal.noContracts')}
            </p>
          ) : (
            <ul className="space-y-3">
              {contracts.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
                >
                  <div>
                    <span className="font-medium">
                      {t('ar', 'portal.bookingContractHash').replace(
                        '{number}',
                        c.booking.bookingNumber
                      )}
                    </span>
                    <span className="me-2 text-sm text-muted-foreground">
                      — {formatDate(c.createdAt)}
                      {c.signedAt && ` · ${t('ar', 'portal.signed')} ${formatDate(c.signedAt)}`}
                    </span>
                  </div>
                  <Link href={`/portal/contracts/${c.id}`}>
                    <Button variant="outline" size="sm">
                      {c.signedAt ? t('ar', 'portal.view') : t('ar', 'portal.sign')}
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <Link href="/portal/contracts">
              <Button variant="secondary" size="sm">
                {t('ar', 'portal.viewAllContracts')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {t('ar', 'portal.invoicesSection')}
          </CardTitle>
          <CardDescription>{t('ar', 'portal.invoicesSectionDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {invoiceItems.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">{t('ar', 'portal.noInvoices')}</p>
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
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
                  >
                    <div>
                      <span className="font-medium">{inv.label}</span>
                      <span className="me-2 text-sm text-muted-foreground">
                        — {formatCurrency(inv.totalAmount.toNumber())}
                        {isPaid ? ` · ${t('ar', 'portal.paid')}` : ''}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/portal/invoices/${inv.id}`}>
                        <Button variant="outline" size="sm">
                          {t('ar', 'portal.view')}
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm">
                        <Download className="ms-1 h-4 w-4" />
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
                {t('ar', 'portal.viewAllInvoices')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
