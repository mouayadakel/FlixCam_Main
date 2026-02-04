/**
 * Public website layout (Phase 1.2, 1.5). Header + Footer + WhatsApp CTA.
 */

import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { PublicHeader } from '@/components/public/public-header'
import { PublicFooter } from '@/components/public/public-footer'
import { WhatsAppCta } from '@/components/public/whatsapp-cta'

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
      <PublicHeader />
      <main className="min-h-[calc(100vh-theme(spacing.14)-1px)] flex flex-col">
        {children}
      </main>
      <PublicFooter />
      <WhatsAppCta />
    </>
  )
}
