import type { Metadata, Viewport } from 'next'
import { Cairo, Inter, IBM_Plex_Sans_Arabic } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Toaster } from '@/components/ui/toaster'
import { WebVitalsReporter } from '@/components/analytics/web-vitals'
import { CookieConsentBanner } from '@/components/analytics/cookie-consent'
import { OfflineBanner } from '@/components/mobile/offline-banner'
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register'
import { LocaleProvider } from '@/components/public/locale-provider'
import { LOCALE_INIT_SCRIPT } from '@/lib/i18n/cookie'
import { generateAlternatesMetadata } from '@/lib/seo/hreflang'
import { GOOGLE_TAG_MANAGER_INLINE_SCRIPT, rootLayoutGtmContainerId } from '@/lib/analytics/gtm-config'

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-cairo',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-arabic',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#A3E635',
}

export const metadata: Metadata = {
  title: {
    default: 'FlixCam.rent - Cinematic Equipment & Studio Rental',
    template: '%s | FlixCam.rent',
  },
  description: 'Rent professional cinematic equipment and studios in Riyadh, Saudi Arabia. Cameras, lenses, lighting, and more.',
  alternates: generateAlternatesMetadata('/'),
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://flixcam.rent'
  ),
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
  other: {
    'domain-verification': 'b32f12bac7aad7d6d60c86d9fa4291c8199aa02f6ca4313fb7aa24fc91fe0dd8',
    'mobile-web-app-capable': 'yes',
  },
  icons: {
    icon: [
      { url: '/icon', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-icon', sizes: '180x180', type: 'image/png' },
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/icon',
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'ar_SA',
    siteName: 'FlixCam.rent',
    title: 'FlixCam.rent - Cinematic Equipment & Studio Rental',
    description: 'Rent professional cinematic equipment and studios in Riyadh, Saudi Arabia.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'FlixCam.rent' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FlixCam.rent - Cinematic Equipment & Studio Rental',
    description: 'Rent professional cinematic equipment and studios in Riyadh.',
    images: ['/og-image.png'],
  },
  appleWebApp: {
    capable: true,
    title: 'FlixCam',
    statusBarStyle: 'black-translucent',
  },
  robots: {
    index: true,
    follow: true,
  },
}

// ✅ ARABIC DEFAULT — RTL & LANG AUDIT PASSED
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gtmId = rootLayoutGtmContainerId()
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        {/* Google Tag Manager */}
        <script dangerouslySetInnerHTML={{ __html: GOOGLE_TAG_MANAGER_INLINE_SCRIPT }} />
        {/* End Google Tag Manager */}
      </head>
      <body className={`${cairo.variable} ${inter.variable} ${ibmPlexArabic.variable} font-arabic`}>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            title="Google Tag Manager"
            src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}
        <script dangerouslySetInnerHTML={{ __html: LOCALE_INIT_SCRIPT }} />
        <Providers>
          <LocaleProvider>
            {children}
            <Toaster />
            <WebVitalsReporter />
            <CookieConsentBanner />
            <OfflineBanner />
            <ServiceWorkerRegister />
          </LocaleProvider>
        </Providers>
      </body>
    </html>
  )
}
