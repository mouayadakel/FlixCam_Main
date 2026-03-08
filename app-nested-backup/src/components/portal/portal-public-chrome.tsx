/**
 * Portal layout with public site chrome: same header, footer, and theme.
 * Keeps portal sidebar + content; removes duplicate portal header in favor of PublicHeader.
 */

'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import type { PublicFeatureFlags } from '@/lib/utils/public-feature-flags'
import { AuthModalProvider } from '@/components/auth/auth-modal-provider'
import { AuthModal } from '@/components/auth/auth-modal'
import { PublicHeader } from '@/components/public/public-header'
import { PublicFooter } from '@/components/public/public-footer'
import { WhatsAppCta } from '@/components/public/whatsapp-cta'
import { PortalSidebar } from '@/components/layouts/portal-sidebar'
import { PortalMobileNav } from '@/components/layouts/portal-mobile-nav'

interface PortalPublicChromeProps {
  children: ReactNode
  flags: PublicFeatureFlags
}

function hiddenRoutesFromFlags(flags: PublicFeatureFlags): Set<string> {
  const hidden = new Set<string>()
  if (!flags.enableBuildKit) hidden.add('/build-your-kit')
  if (!flags.enableEquipmentCatalog) hidden.add('/equipment')
  if (!flags.enableStudios) hidden.add('/studios')
  if (!flags.enablePackages) hidden.add('/packages')
  if (!flags.enableHowItWorks) hidden.add('/how-it-works')
  if (!flags.enableSupport) hidden.add('/support')
  return hidden
}

export function PortalPublicChrome({ children, flags }: PortalPublicChromeProps) {
  const hiddenRoutes = hiddenRoutesFromFlags(flags)

  return (
    <AuthModalProvider>
      <Link
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-public-button focus:bg-brand-primary focus:px-4 focus:py-2 focus:text-white focus:outline-none"
      >
        تخطي إلى المحتوى الرئيسي
      </Link>
      <PublicHeader hiddenRoutes={hiddenRoutes} />
      <main
        id="main-content"
        className="flex min-h-[calc(100vh-72px-1px)] flex-col bg-background pb-[64px] lg:pb-0"
      >
        <div className="flex min-h-full w-full flex-1" dir="rtl">
          <aside className="hidden lg:block">
            <PortalSidebar />
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="animate-fade-in flex-1 px-4 py-6 pb-24 lg:px-6 lg:py-8 lg:pb-8">
              {children}
            </div>
          </div>
        </div>
      </main>
      <PublicFooter hiddenRoutes={hiddenRoutes} />
      <PortalMobileNav />
      {flags.enableWhatsAppCta && <WhatsAppCta />}
      <AuthModal />
    </AuthModalProvider>
  )
}
