/**
 * @file portal/contracts/[id]/page.tsx
 * @description Client portal - Contract viewing page
 * @module app/portal/contracts
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
import { formatDate } from '@/lib/utils/format.utils'
import { ArrowRight, FileText, Download } from 'lucide-react'
import { notFound } from 'next/navigation'
import { t } from '@/lib/i18n/translate'
import { getRequestLocale } from '@/lib/i18n/request-locale'
import { sanitizeContractHtml } from '@/lib/utils/sanitize'

export default async function PortalContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const { locale } = await getRequestLocale()

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/portal/contracts')
  }

  const userId = session.user.id
  const { id } = await params

  const contract = await prisma.contract.findFirst({
    where: {
      id,
      booking: {
        customerId: userId,
        deletedAt: null,
      },
      deletedAt: null,
    },
    include: {
      booking: {
        include: {
          equipment: {
            include: {
              equipment: {
                include: {
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
      },
    },
  })

  if (!contract) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/portal/contracts"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowRight className="h-4 w-4" />
            {t(locale, 'portal.backToContracts')}
          </Link>
          <h1 className="text-3xl font-bold">
            {t(locale, 'portal.contractHash').replace('{id}', contract.id.slice(0, 8))}
          </h1>
        </div>
        <Badge variant={contract.signedAt ? 'default' : 'secondary'}>
          {contract.signedAt ? t(locale, 'portal.signed') : t(locale, 'portal.awaitingSignature')}
        </Badge>
      </div>

      {/* Contract Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t(locale, 'portal.contractInfo')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm text-muted-foreground">{t(locale, 'portal.bookingNumber')}</div>
            <div className="font-medium">#{contract.booking.bookingNumber}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">{t(locale, 'portal.createdDate')}</div>
            <div className="font-medium">{formatDate(contract.createdAt)}</div>
          </div>
          {contract.signedAt && (
            <div>
              <div className="text-sm text-muted-foreground">{t(locale, 'portal.signedDate')}</div>
              <div className="font-medium">{formatDate(contract.signedAt)}</div>
            </div>
          )}
          <div>
            <div className="text-sm text-muted-foreground">{t(locale, 'portal.status')}</div>
            <div className="font-medium">
              {contract.signedAt ? t(locale, 'portal.signed') : t(locale, 'portal.awaitingSignature')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contract Content */}
      <Card>
        <CardHeader>
          <CardTitle>{t(locale, 'portal.contractContent')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none">
            {contract.contractContent ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: sanitizeContractHtml(
                    typeof contract.contractContent === 'string'
                      ? contract.contractContent
                      : (contract.contractContent as Record<string, string>)?.html ||
                        (contract.contractContent as Record<string, string>)?.text ||
                        ''
                  ),
                }}
              />
            ) : (
              <p className="text-muted-foreground">{t(locale, 'portal.noContractContent')}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t(locale, 'portal.actions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {!contract.signedAt && (
              <Link href={`/portal/contracts/${contract.id}/sign`}>
                <Button>{t(locale, 'portal.signContract')}</Button>
              </Link>
            )}
            <Button variant="outline">
              <Download className="ms-2 h-4 w-4" />
              {t(locale, 'portal.downloadPDF')}
            </Button>
            <Link href={`/portal/bookings/${contract.bookingId}`}>
              <Button variant="outline">{t(locale, 'portal.viewBooking')}</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
