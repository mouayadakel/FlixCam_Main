/**
 * Vendor new equipment submission page
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { VendorEquipmentForm } from './vendor-equipment-form'

export default async function VendorEquipmentNewPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?callbackUrl=/vendor/equipment/new')

  const vendor = await prisma.vendor.findFirst({
    where: { userId: session.user.id, deletedAt: null, status: 'APPROVED' },
  })
  if (!vendor) redirect('/login?error=VendorAccessDenied')

  const categories = await prisma.category.findMany({
    where: { deletedAt: null, parentId: null },
    include: {
      children: { where: { deletedAt: null } },
    },
  })
  const brands = await prisma.brand.findMany({
    where: { deletedAt: null },
  })

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
        <h1 className="text-3xl font-bold">إضافة معدات جديدة</h1>
        <p className="mt-1 text-muted-foreground">سيتم مراجعة الإدراج من قبل الإدارة قبل النشر</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>تفاصيل المعدات</CardTitle>
          <p className="text-sm text-muted-foreground">الإدارة ستحدد السعر بعد الموافقة</p>
        </CardHeader>
        <CardContent>
          <VendorEquipmentForm categories={categories} brands={brands} vendorId={vendor.id} />
        </CardContent>
      </Card>
    </div>
  )
}
