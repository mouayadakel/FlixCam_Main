/**
 * Full FAQ page – all questions from /api/public/faq.
 */

import type { Metadata } from 'next'
import { PublicContainer } from '@/components/public/public-container'
import { FaqPageClient } from './faq-page-client'
import { t } from '@/lib/i18n/translate'
import { getRequestLocale } from '@/lib/i18n/request-locale'
import { generateAlternatesMetadata } from '@/lib/seo/hreflang'

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getRequestLocale()
  return {
  title: t(locale, 'seo.faqTitle'),
  description: t(locale, 'seo.faqDescription'),
  alternates: generateAlternatesMetadata('/faq'),
  keywords: ['أسئلة شائعة', 'تأجير معدات', 'FAQ', 'دعم العملاء', 'FlixCam'],
  }
}

export default function FaqPage() {
  return (
    <main className="min-h-screen py-10 md:py-14">
      <PublicContainer className="max-w-3xl">
        <FaqPageClient />
      </PublicContainer>
    </main>
  )
}
