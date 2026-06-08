/**
 * Public website layout (Phase 1.2, 1.5). Header + Footer + WhatsApp CTA.
 */

import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getRequestLocale } from '@/lib/i18n/request-locale'
import { t } from '@/lib/i18n/translate'
import { getPublicFeatureFlags } from '@/lib/utils/public-feature-flags'
import { PublicLayoutClient } from '@/components/public/public-layout-client'
import { generateAlternatesMetadata } from '@/lib/seo/hreflang'
import { getPublicMarketingTrackingConfig } from '@/lib/services/marketing-settings.service'

const BASE_URL = process.env.NEXTAUTH_URL || process.env.APP_URL || 'https://flixcam.rent'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'FlixCam.rent – تأجير معدات سينمائية واستوديوهات | الرياض',
    template: '%s | FlixCam.rent',
  },
  description:
    'احجز معدات تصوير سينمائي واستوديوهات في الرياض. كاميرات، إضاءة، صوت، واستوديوهات احترافية.',
  alternates: generateAlternatesMetadata('/'),
  openGraph: {
    title: 'FlixCam.rent – تأجير معدات سينمائية واستوديوهات',
    description: 'احجز معدات تصوير واستوديوهات في الرياض.',
    url: BASE_URL,
    siteName: 'FlixCam.rent',
    locale: 'ar_SA',
    type: 'website',
  },
}
const DEFAULT_PUBLIC_FLAGS = {
  enableBuildKit: true,
  enableEquipmentCatalog: true,
  enableStudios: true,
  enablePackages: true,
  enableHowItWorks: true,
  enableSupport: true,
  enableWhatsAppCta: true,
}

export default async function PublicLayout({ children }: { children: ReactNode }) {
  let flags = DEFAULT_PUBLIC_FLAGS
  let tracking = await getPublicMarketingTrackingConfig()
  const { locale } = await getRequestLocale()
  try {
    flags = await getPublicFeatureFlags()
  } catch {
    /* defaults */
  }
  return (
    <>
      <Link
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-public-button focus:bg-brand-primary focus:px-4 focus:py-2 focus:text-white focus:outline-none"
      >
        {t(locale, 'blog.skipToContent')}
      </Link>
      <PublicLayoutClient flags={flags} tracking={tracking}>
        {children}
      </PublicLayoutClient>
    </>
  )
}
