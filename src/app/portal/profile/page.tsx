/**
 * @file portal/profile/page.tsx
 * @description Client portal - Profile page (Phase 4.4)
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PortalProfileForm } from '@/components/features/portal/portal-profile-form'
import { t } from '@/lib/i18n/translate'

export default async function PortalProfilePage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/portal/profile')
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('ar', 'portal.profile')}</h1>
        <p className="mt-2 text-muted-foreground">{t('ar', 'portal.profileDesc')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('ar', 'portal.personalInfo')}</CardTitle>
          <CardDescription>{t('ar', 'portal.personalInfoDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <PortalProfileForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('ar', 'portal.twoFA')}</CardTitle>
          <CardDescription>{t('ar', 'portal.twoFADesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('ar', 'portal.twoFAComingSoon')}</p>
        </CardContent>
      </Card>
    </div>
  )
}
