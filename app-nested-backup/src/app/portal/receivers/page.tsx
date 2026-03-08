/**
 * Portal – Saved receivers management (CRUD + set default).
 */

import Link from 'next/link'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { ReceiversList } from '@/components/features/portal/receivers-list'
import { t } from '@/lib/i18n/translate'

export default async function PortalReceiversPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/portal/receivers')
  }

  return (
    <div className="max-w-2xl space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm">
        <ol className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
          <li>
            <Link
              href="/portal/dashboard"
              className="transition-colors hover:text-foreground focus-visible:rounded-public-button focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t('ar', 'portal.dashboard')}
            </Link>
          </li>
          <li className="flex items-center gap-1.5">
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            <span className="text-foreground font-medium" aria-current="page">
              {t('ar', 'portal.receivers')}
            </span>
          </li>
        </ol>
      </nav>

      <div>
        <h1 className="font-header-nav text-section-title text-foreground">
          {t('ar', 'portal.receivers')}
        </h1>
        <p className="mt-2 text-body-main text-muted-foreground">
          {t('ar', 'portal.receiversDesc')}
        </p>
      </div>

      <ReceiversList />
    </div>
  )
}
