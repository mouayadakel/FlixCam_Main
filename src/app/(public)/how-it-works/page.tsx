/**
 * How it works – 5 steps with short descriptions.
 * Guarded by enable_how_it_works feature flag.
 */

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { t } from '@/lib/i18n/translate'
import { getRequestLocale } from '@/lib/i18n/request-locale'
import { generateAlternatesMetadata } from '@/lib/seo/hreflang'

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getRequestLocale()
  return {
  title: t(locale, 'seo.howItWorksTitle'),
  description: t(locale, 'seo.howItWorksDescription'),
  alternates: generateAlternatesMetadata('/how-it-works'),
  keywords: ['كيف أحجز', 'تأجير معدات', 'خطوات الحجز', 'how to rent', 'FlixCam'],
  }
}

import { FeatureFlagService } from '@/lib/services/feature-flag.service'
import { HowItWorksClient } from './how-it-works-client'

export default async function HowItWorksPage() {
  const enabled = await FeatureFlagService.isEnabled('enable_how_it_works')
  if (!enabled) redirect('/')
  return <HowItWorksClient />
}
