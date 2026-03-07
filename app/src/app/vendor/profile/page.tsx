/**
 * Vendor profile page – company info, bank details
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { VendorProfileForm } from './vendor-profile-form'

export default async function VendorProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?callbackUrl=/vendor/profile')

  const vendor = await prisma.vendor.findFirst({
    where: { userId: session.user.id, deletedAt: null, status: 'APPROVED' },
  })
  if (!vendor) redirect('/login?error=VendorAccessDenied')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">الملف الشخصي</h1>
        <p className="mt-1 text-muted-foreground">معلومات الشركة والبنك لاستلام المدفوعات</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>معلومات الشركة</CardTitle>
        </CardHeader>
        <CardContent>
          <VendorProfileForm
            vendor={{
              id: vendor.id,
              companyName: vendor.companyName,
              companyNameAr: vendor.companyNameAr ?? '',
              description: vendor.description ?? '',
              phone: vendor.phone ?? '',
              bankName: vendor.bankName ?? '',
              iban: vendor.iban ?? '',
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
