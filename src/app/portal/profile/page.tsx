/**
 * @file portal/profile/page.tsx
 * @description Client portal - Profile page (Phase 4.4)
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PortalProfileForm } from '@/components/features/portal/portal-profile-form'

export default async function PortalProfilePage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/portal/profile')
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">الملف الشخصي</h1>
        <p className="text-muted-foreground mt-2">
          تحديث بياناتك الشخصية
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>البيانات الشخصية</CardTitle>
          <CardDescription>
            الاسم، البريد الإلكتروني، ورقم الهاتف. البريد لا يمكن تغييره من هنا.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PortalProfileForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>المصادقة الثنائية (2FA)</CardTitle>
          <CardDescription>
            تفعيل المصادقة الثنائية يزيد أمان حسابك. (قريباً)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            هذه الميزة قيد التطوير. يمكنك تفعيلها لاحقاً من هذه الصفحة.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
