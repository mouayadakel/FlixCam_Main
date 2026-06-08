/**
 * Rental policies – from API (admin-managed) or static fallback.
 */

import type { Metadata } from 'next'
import { PoliciesPageClient } from './policies-page-client'
import { t } from '@/lib/i18n/translate'
import { getRequestLocale } from '@/lib/i18n/request-locale'
import { generateAlternatesMetadata } from '@/lib/seo/hreflang'

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getRequestLocale()
  return {
  title: t(locale, 'seo.policiesTitle'),
  description: t(locale, 'seo.policiesDescription'),
  alternates: generateAlternatesMetadata('/policies'),
  keywords: ['سياسات التأجير', 'rental policies', 'شروط الاستخدام', 'وديعة', 'تأمين'],
  }
}

export default function PoliciesPage() {
  return <PoliciesPageClient />
}
