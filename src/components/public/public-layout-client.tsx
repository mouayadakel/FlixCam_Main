/**
 * @file public-layout-client.tsx
 * @description Client wrapper for public layout: AuthModalProvider + AuthModal
 * @module components/public
 */

'use client'

import type { ReactNode } from 'react'
import type { PublicFeatureFlags } from '@/lib/utils/public-feature-flags'
import type { PublicMarketingTrackingConfig } from '@/lib/services/marketing-settings.service'
import { rootLayoutGtmContainerId } from '@/lib/analytics/gtm-config'
import { PublicTrackingScripts } from '@/components/analytics/public-tracking-scripts'
import { RouteChangeTracker } from '@/components/analytics/route-change-tracker'
import { AuthModalProvider } from '@/components/auth/auth-modal-provider'
import { AuthModal } from '@/components/auth/auth-modal'
import { PublicHeader } from '@/components/public/public-header'
import { PublicFooter } from '@/components/public/public-footer'
import { WhatsAppCta } from '@/components/public/whatsapp-cta'
import { CompareBar } from '@/components/features/equipment/compare-bar'
import { MobileNavBar } from '@/components/mobile/mobile-nav-bar'
import { PublicChatWidget } from '@/components/public/public-chat-widget'
import { PersonalizationProvider } from '@/components/analytics/personalization-provider'
import { CookieConsentBanner } from '@/components/analytics/cookie-consent-banner'

function envTrackingFallback(): PublicMarketingTrackingConfig {
  return {
    gtmId: rootLayoutGtmContainerId(),
    ga4Id: (
      process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ||
      process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
      ''
    ).trim(),
    gscVerification: (process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '').trim(),
    metaPixelId: (process.env.NEXT_PUBLIC_META_PIXEL_ID || '').trim(),
    tiktokPixelId: (process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || '').trim(),
    snapchatPixelId: (process.env.NEXT_PUBLIC_SNAPCHAT_PIXEL_ID || '').trim(),
    pinterestTagId: (process.env.NEXT_PUBLIC_PINTEREST_TAG_ID || '').trim(),
    twitterPixelId: (process.env.NEXT_PUBLIC_TWITTER_PIXEL_ID || '').trim(),
    clarityId: (process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || '').trim(),
    googleAdsId: (process.env.GOOGLE_ADS_CONVERSION_ID || '').trim(),
    googleAdsLabel: (process.env.GOOGLE_ADS_CONVERSION_LABEL || '').trim(),
  }
}

interface PublicLayoutClientProps {
  children: ReactNode
  flags: PublicFeatureFlags
  /** Merged DB + env from server; omitted pages use env-only fallback */
  tracking?: PublicMarketingTrackingConfig
}

export function PublicLayoutClient({ children, flags, tracking }: PublicLayoutClientProps) {
  const cfg = tracking ?? envTrackingFallback()
  const hiddenRoutes = new Set<string>()
  if (!flags.enableBuildKit) hiddenRoutes.add('/build-your-kit')
  if (!flags.enableEquipmentCatalog) hiddenRoutes.add('/equipment')
  if (!flags.enableStudios) hiddenRoutes.add('/studios')
  if (!flags.enablePackages) hiddenRoutes.add('/packages')
  if (!flags.enableHowItWorks) hiddenRoutes.add('/how-it-works')
  if (!flags.enableSupport) hiddenRoutes.add('/support')

  return (
    <PersonalizationProvider>
      <AuthModalProvider>
        <PublicTrackingScripts {...cfg} />
        <RouteChangeTracker ga4Id={cfg.ga4Id} skipWhenGtm={Boolean(cfg.gtmId)} />
        <PublicHeader hiddenRoutes={hiddenRoutes} />
        {/* Bottom padding for mobile nav bar */}
        <main
          id="main-content"
          className="flex min-h-[calc(100vh-theme(spacing.14)-1px)] flex-col pb-[64px] lg:pb-0"
        >
          {children}
        </main>
        <PublicFooter hiddenRoutes={hiddenRoutes} />
        <MobileNavBar />
        <WhatsAppCta />
        <PublicChatWidget />
        <CompareBar />
        <AuthModal />
        <CookieConsentBanner />
      </AuthModalProvider>
    </PersonalizationProvider>
  )
}
