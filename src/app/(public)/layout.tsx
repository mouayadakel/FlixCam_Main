/**
 * Public website layout (Phase 1.2, 1.5). Header + Footer + WhatsApp CTA.
 */

import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicLayoutClient } from '@/components/public/public-layout-client'

const BASE_URL = process.env.NEXTAUTH_URL || process.env.APP_URL || 'https://flixcam.rent'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'FlixCam.rent – تأجير معدات سينمائية واستوديوهات | الرياض',
    template: '%s | FlixCam.rent',
  },
  description:
    'احجز معدات تصوير سينمائي واستوديوهات في الرياض. كاميرات، إضاءة، صوت، واستوديوهات احترافية.',
  openGraph: {
    title: 'FlixCam.rent – تأجير معدات سينمائية واستوديوهات',
    description: 'احجز معدات تصوير واستوديوهات في الرياض.',
    url: BASE_URL,
    siteName: 'FlixCam.rent',
    locale: 'ar_SA',
    type: 'website',
  },
}
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Link
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-brand-primary focus:text-white focus:rounded-public-button focus:outline-none"
      >
        Skip to main content
      </Link>
      <PublicLayoutClient>{children}</PublicLayoutClient>
    </>
  )
}
