/**
 * @file portal/contracts/page.tsx
 * @description Client portal - My Contracts page
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
import { FileText, CheckCircle, Clock } from 'lucide-react'
import { t } from '@/lib/i18n/translate'

export default async function PortalContractsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/portal/contracts')
  }

  const userId = session.user.id

  const contracts = await prisma.contract.findMany({
    where: {
      booking: {
        customerId: userId,
        deletedAt: null,
      },
      deletedAt: null,
    },
    include: {
      booking: {
        select: {
          id: true,
          bookingNumber: true,
          startDate: true,
          endDate: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('ar', 'portal.myContracts')}</h1>
        <p className="mt-2 text-muted-foreground">{t('ar', 'portal.myContractsDesc')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('ar', 'portal.contractsList')}</CardTitle>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">{t('ar', 'portal.noContracts')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {contracts.map((contract) => (
                <div
                  key={contract.id}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-neutral-50"
                >
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <span className="text-lg font-medium">
                        {t('ar', 'portal.contractHash').replace('{id}', contract.id.slice(0, 8))}
                      </span>
                      <Badge variant={contract.signedAt ? 'default' : 'secondary'}>
                        {contract.signedAt
                          ? t('ar', 'portal.signed')
                          : t('ar', 'portal.awaitingSignature')}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">{t('ar', 'portal.booking')}:</span> #
                        {contract.booking.bookingNumber}
                      </div>
                      <div>
                        <span className="font-medium">{t('ar', 'portal.createdDate')}:</span>{' '}
                        {formatDate(contract.createdAt)}
                      </div>
                      {contract.signedAt && (
                        <div>
                          <span className="font-medium">{t('ar', 'portal.signedDate')}:</span>{' '}
                          {formatDate(contract.signedAt)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/portal/contracts/${contract.id}`}>
                      <Button variant="outline" size="sm">
                        {!contract.signedAt
                          ? t('ar', 'portal.signContract')
                          : t('ar', 'portal.viewContract')}
                      </Button>
                    </Link>
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
