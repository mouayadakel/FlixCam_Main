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

export default async function PortalContractDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/portal/contracts')
  }

  const userId = session.user.id

  const contract = await prisma.contract.findFirst({
    where: {
      id: params.id,
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
            className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1"
          >
            <ArrowRight className="h-4 w-4" />
            العودة إلى العقود
          </Link>
          <h1 className="text-3xl font-bold">
            عقد #{contract.id.slice(0, 8)}
          </h1>
        </div>
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

      {/* Contract Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            معلومات العقد
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm text-muted-foreground">رقم الحجز</div>
            <div className="font-medium">
              #{contract.booking.bookingNumber}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">تاريخ الإنشاء</div>
            <div className="font-medium">{formatDate(contract.createdAt)}</div>
          </div>
          {contract.signedAt && (
            <div>
              <div className="text-sm text-muted-foreground">تاريخ التوقيع</div>
              <div className="font-medium">{formatDate(contract.signedAt)}</div>
            </div>
          )}
          <div>
            <div className="text-sm text-muted-foreground">الحالة</div>
            <div className="font-medium">
              {contract.signedAt
                ? 'موقع'
                : 'في انتظار التوقيع'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contract Content */}
      <Card>
        <CardHeader>
          <CardTitle>محتوى العقد</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none">
            {contract.contractContent ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: typeof contract.contractContent === 'string' 
                    ? contract.contractContent 
                    : (contract.contractContent as any)?.html || (contract.contractContent as any)?.text || '',
                }}
              />
            ) : (
              <p className="text-muted-foreground">
                لا يوجد محتوى للعقد
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>الإجراءات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {!contract.signedAt && (
              <Link href={`/portal/contracts/${contract.id}/sign`}>
                <Button>توقيع العقد</Button>
              </Link>
            )}
            <Button variant="outline">
              <Download className="h-4 w-4 ml-2" />
              تحميل PDF
            </Button>
            <Link href={`/portal/bookings/${contract.bookingId}`}>
              <Button variant="outline">عرض الحجز</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
