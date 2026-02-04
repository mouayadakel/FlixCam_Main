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
        <h1 className="text-3xl font-bold">عقودي</h1>
        <p className="text-muted-foreground mt-2">
          عرض وإدارة جميع عقودك
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة العقود</CardTitle>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">لا توجد عقود</p>
            </div>
          ) : (
            <div className="space-y-4">
              {contracts.map((contract) => (
                <div
                  key={contract.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium text-lg">
                        عقد #{contract.id.slice(0, 8)}
                      </span>
                      <Badge
                        variant={
                          contract.signedAt
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {contract.signedAt
                          ? 'موقع'
                          : 'في انتظار التوقيع'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>
                        <span className="font-medium">الحجز:</span> #
                        {contract.booking.bookingNumber}
                      </div>
                      <div>
                        <span className="font-medium">تاريخ الإنشاء:</span>{' '}
                        {formatDate(contract.createdAt)}
                      </div>
                      {contract.signedAt && (
                        <div>
                          <span className="font-medium">تاريخ التوقيع:</span>{' '}
                          {formatDate(contract.signedAt)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/portal/contracts/${contract.id}`}>
                      <Button variant="outline" size="sm">
                        {!contract.signedAt
                          ? 'توقيع العقد'
                          : 'عرض العقد'}
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
