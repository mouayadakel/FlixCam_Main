/**
 * Vendor equipment detail/edit page
 */

import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/format.utils'
import { VendorEquipmentEditForm } from './vendor-equipment-edit-form'

export default async function VendorEquipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?callbackUrl=/vendor/equipment')

  const vendor = await prisma.vendor.findFirst({
    where: { userId: session.user.id, deletedAt: null, status: 'APPROVED' },
  })
  if (!vendor) redirect('/login?error=VendorAccessDenied')

  const { id } = await params
  const equipment = await prisma.equipment.findFirst({
    where: { id, vendorId: vendor.id, deletedAt: null },
    include: {
      category: { select: { id: true, name: true } },
      brand: { select: { id: true, name: true } },
      media: { where: { deletedAt: null } },
    },
  })

  if (!equipment) notFound()

  const customFields = (equipment.customFields as Record<string, unknown>) || {}
  const status = (customFields.vendorSubmissionStatus as string) || 'approved'

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/vendor/equipment"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="h-4 w-4" />
          العودة للمعدات
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">{equipment.model || equipment.sku}</h1>
          <Badge
            variant={
              status === 'approved'
                ? 'default'
                : status === 'rejected'
                  ? 'destructive'
                  : 'secondary'
            }
          >
            {status === 'pending_review'
              ? 'قيد المراجعة'
              : status === 'approved'
                ? 'معتمد'
                : 'مرفوض'}
          </Badge>
          {!equipment.isActive && <Badge variant="outline">غير نشط</Badge>}
        </div>
        <p className="mt-1 text-muted-foreground">
          {equipment.category?.name} {equipment.brand?.name && `• ${equipment.brand.name}`}
        </p>
      </div>

      {status !== 'approved' && (
        <Card>
          <CardHeader>
            <CardTitle>تعديل المعدات</CardTitle>
            <p className="text-sm text-muted-foreground">
              يمكنك تعديل التفاصيل حتى تتم الموافقة من الإدارة
            </p>
          </CardHeader>
          <CardContent>
            <VendorEquipmentEditForm equipment={equipment} />
          </CardContent>
        </Card>
      )}

      {status === 'approved' && (
        <Card>
          <CardHeader>
            <CardTitle>معلومات المعدات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">SKU</span>
                <p className="font-medium">{equipment.sku}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">السعر اليومي</span>
                <p className="font-medium">{formatCurrency(Number(equipment.dailyPrice))}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              للمعدات المعتمدة، يرجى التواصل مع الإدارة لأي تعديلات.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
