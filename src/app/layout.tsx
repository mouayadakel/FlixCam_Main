import type { Metadata } from 'next'
import { Cairo, Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Toaster } from '@/components/ui/toaster'
import { WebVitalsReporter } from '@/components/analytics/web-vitals'
import { CookieConsentBanner } from '@/components/analytics/cookie-consent'
import { LocaleProvider } from '@/components/public/locale-provider'
import { LOCALE_INIT_SCRIPT } from '@/lib/i18n/cookie'

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

export const metadata: Metadata = {
  title: 'FlixCam.rent - Cinematic Equipment & Studio Rental',
  description: 'Rent professional cinematic equipment and studios in Riyadh, Saudi Arabia',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${cairo.variable} ${inter.variable} font-arabic`}>
        <script
          dangerouslySetInnerHTML={{ __html: LOCALE_INIT_SCRIPT }}
        />
        <Providers>
          <LocaleProvider>
            {children}
            <Toaster />
            <WebVitalsReporter />
            <CookieConsentBanner />
          </LocaleProvider>
        </Providers>
      </body>
    </html>
  )
}
