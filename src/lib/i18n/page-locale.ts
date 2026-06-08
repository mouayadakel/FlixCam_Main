/**
 * Shared helpers for server-rendered public pages (ar + en launch).
 */

import type { Metadata } from 'next'
import { t } from '@/lib/i18n/translate'
import { getRequestLocale } from '@/lib/i18n/request-locale'
import { generateAlternatesMetadata } from '@/lib/seo/hreflang'

export { getRequestLocale }

export async function buildPublicPageMetadata(
  path: string,
  titleKey: string,
  descriptionKey: string,
  keywords?: string[]
): Promise<Metadata> {
  const { locale } = await getRequestLocale()
  return {
    title: t(locale, titleKey),
    description: t(locale, descriptionKey),
    alternates: generateAlternatesMetadata(path),
    ...(keywords ? { keywords } : {}),
  }
}
