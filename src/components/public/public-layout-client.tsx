/**
 * @file public-layout-client.tsx
 * @description Client wrapper for public layout: AuthModalProvider + AuthModal
 * @module components/public
 */

'use client'

import type { ReactNode } from 'react'
import type { PublicFeatureFlags } from '@/lib/utils/public-feature-flags'
import { AuthModalProvider } from '@/components/auth/auth-modal-provider'
import { AuthModal } from '@/components/auth/auth-modal'
import { PublicHeader } from '@/components/public/public-header'
import { PublicFooter } from '@/components/public/public-footer'
import { WhatsAppCta } from '@/components/public/whatsapp-cta'

interface PublicLayoutClientProps {
  children: ReactNode
  flags: PublicFeatureFlags
}

export function PublicLayoutClient({ children, flags }: PublicLayoutClientProps) {
  const hiddenRoutes = new Set<string>()
  if (!flags.enableBuildKit) hiddenRoutes.add('/build-your-kit')
  if (!flags.enableEquipmentCatalog) hiddenRoutes.add('/equipment')
  if (!flags.enableStudios) hiddenRoutes.add('/studios')
  if (!flags.enablePackages) hiddenRoutes.add('/packages')
  if (!flags.enableHowItWorks) hiddenRoutes.add('/how-it-works')
  if (!flags.enableSupport) hiddenRoutes.add('/support')

  return (
    <AuthModalProvider>
      <PublicHeader hiddenRoutes={hiddenRoutes} />
      {/* Top padding compensates for removed category bar so content vertical position feels like before */}
      <main
        id="main-content"
        className="min-h-[calc(100vh-theme(spacing.14)-1px)] flex flex-col pt-4 md:pt-10"
      >
        {children}
      </main>
      <PublicFooter hiddenRoutes={hiddenRoutes} />
      {flags.enableWhatsAppCta && <WhatsAppCta />}
      <AuthModal />
    </AuthModalProvider>
  )
}
