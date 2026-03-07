/**
 * Rental policies – from API (admin-managed) or static fallback.
 */

import type { Metadata } from 'next'
import { PoliciesPageClient } from './policies-page-client'
import { t } from '@/lib/i18n/translate'
import { generateAlternatesMetadata } from '@/lib/seo/hreflang'

export const metadata: Metadata = {
  title: t('ar', 'seo.policiesTitle'),
  description: t('ar', 'seo.policiesDescription'),
  alternates: generateAlternatesMetadata('/policies'),
  keywords: ['سياسات التأجير', 'rental policies', 'شروط الاستخدام', 'وديعة', 'تأمين'],
}

export default function PoliciesPage() {
  return <PoliciesPageClient />
}
