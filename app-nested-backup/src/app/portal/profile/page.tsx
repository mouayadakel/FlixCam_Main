/**
 * @file portal/profile/page.tsx
 * @description Client portal - Profile page with public site theme (cards, typography, spacing).
 */

import Link from 'next/link'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PortalProfileForm } from '@/components/features/portal/portal-profile-form'
import { t } from '@/lib/i18n/translate'
import { ChevronLeft } from 'lucide-react'

export default async function PortalProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{ complete?: string; returnTo?: string }>
}) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/portal/profile')
  }

  const resolved = searchParams ? await searchParams : {}
  const returnTo = typeof resolved?.returnTo === 'string' ? resolved.returnTo : undefined

  return (
    <div className="max-w-2xl space-y-8">
      {/* Breadcrumb / back */}
      <nav aria-label="Breadcrumb" className="text-sm">
        <ol className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
          <li>
            <Link
              href="/portal/dashboard"
              className="transition-colors hover:text-foreground focus-visible:rounded-public-button focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              لوحة التحكم
            </Link>
          </li>
          <li className="flex items-center gap-1.5">
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            <span className="text-foreground font-medium" aria-current="page">
              {t('ar', 'portal.profile')}
            </span>
          </li>
        </ol>
      </nav>

      <div>
        <h1 className="font-header-nav text-section-title text-foreground">
          {t('ar', 'portal.profile')}
        </h1>
        <p className="mt-2 text-body-main text-muted-foreground">
          {t('ar', 'portal.profileDesc')}
        </p>
      </div>

      <Card className="rounded-public-card border-border bg-card shadow-card transition-shadow hover:shadow-card-hover">
        <CardHeader className="p-6">
          <CardTitle className="text-card-title text-foreground">
            {t('ar', 'portal.personalInfo')}
          </CardTitle>
          <CardDescription className="text-body-main text-muted-foreground">
            {t('ar', 'portal.personalInfoDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <PortalProfileForm returnTo={returnTo} />
        </CardContent>
      </Card>

      <Card className="rounded-public-card border-border bg-card shadow-card transition-shadow hover:shadow-card-hover">
        <CardHeader className="p-6">
          <CardTitle className="text-card-title text-foreground">
            {t('ar', 'portal.twoFA')}
          </CardTitle>
          <CardDescription className="text-body-main text-muted-foreground">
            {t('ar', 'portal.twoFADesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <p className="text-body-main text-muted-foreground">
            {t('ar', 'portal.twoFAComingSoon')}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
