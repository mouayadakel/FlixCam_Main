import type { Metadata, Viewport } from 'next'
import { Cairo, Inter, IBM_Plex_Sans_Arabic } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Toaster } from '@/components/ui/toaster'
import { WebVitalsReporter } from '@/components/analytics/web-vitals'
import { CookieConsentBanner } from '@/components/analytics/cookie-consent'
import { OfflineBanner } from '@/components/mobile/offline-banner'
import { LocaleProvider } from '@/components/public/locale-provider'
import { LOCALE_INIT_SCRIPT } from '@/lib/i18n/cookie'
import { generateAlternatesMetadata } from '@/lib/seo/hreflang'

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-cairo',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
})

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-arabic',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#8CC63F',
}

export const metadata: Metadata = {
  title: {
    default: 'FlixCam.rent - Cinematic Equipment & Studio Rental',
    template: '%s | FlixCam.rent',
  },
  description: 'Rent professional cinematic equipment and studios in Riyadh, Saudi Arabia. Cameras, lenses, lighting, and more.',
  alternates: generateAlternatesMetadata('/'),
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://flixcam.rent'),
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
    statusBarStyle: 'default',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${cairo.variable} ${inter.variable} ${ibmPlexArabic.variable} font-arabic`}>
        <script dangerouslySetInnerHTML={{ __html: LOCALE_INIT_SCRIPT }} />
        <Providers>
          <LocaleProvider>
            {children}
            <Toaster />
            <WebVitalsReporter />
            <CookieConsentBanner />
            <OfflineBanner />
          </LocaleProvider>
        </Providers>
      </body>
    </html>
  )
}
