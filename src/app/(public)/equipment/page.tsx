/**
 * Equipment catalog page (Phase 2.2): Grid, filters, cards, skeleton, pagination.
 * Guarded by enable_equipment_catalog feature flag.
 */

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { t } from '@/lib/i18n/translate'
import { getRequestLocale } from '@/lib/i18n/request-locale'
import { generateAlternatesMetadata } from '@/lib/seo/hreflang'
import { getMarketingSettingsMap } from '@/lib/services/marketing-settings.service'
import { buildPublicMetadata } from '@/lib/seo/build-metadata'

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getRequestLocale()
  const db = await getMarketingSettingsMap()
  
  const titleAr = db.get('equipment_seo_title_ar') || t(locale, 'seo.equipmentTitle')
  const titleEn = db.get('equipment_seo_title_en') || t('en', 'seo.equipmentTitle')
  const descAr = db.get('equipment_seo_description_ar') || t(locale, 'seo.equipmentDescription')
  const descEn = db.get('equipment_seo_description_en') || t('en', 'seo.equipmentDescription')

  return buildPublicMetadata({
    title: titleAr,
    description: descAr,
    path: '/equipment',
    alternates: generateAlternatesMetadata('/equipment'),
  })
}
import { Suspense } from 'react'
import { FeatureFlagService } from '@/lib/services/feature-flag.service'
import { EquipmentCatalogClient } from './equipment-catalog-client'

export default async function EquipmentCatalogPage() {
  const { locale } = await getRequestLocale()
  const enabled = await FeatureFlagService.isEnabled('enable_equipment_catalog')
  if (!enabled) redirect('/')
  return (
    <main className="mx-auto w-full max-w-public-container px-4 py-8 sm:px-6 md:py-12 lg:px-8">
      <Suspense fallback={<EquipmentCatalogFallback />}>
        <EquipmentCatalogClient />
      </Suspense>
    </main>
  )
}

function EquipmentCatalogFallback() {
  return (
    <div className="space-y-6">
      {/* Title skeleton */}
      <div className="h-9 w-56 animate-pulse rounded-xl bg-muted" />
      <div className="h-5 w-40 animate-pulse rounded-lg bg-muted/60" />

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Sidebar skeleton */}
        <div className="hidden w-72 shrink-0 lg:block">
          <div className="space-y-4 rounded-2xl border border-border-light/40 bg-white p-5 shadow-card">
            <div className="h-5 w-24 animate-pulse rounded bg-muted" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-muted/60" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-muted/60" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-muted/60" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-muted/60" />
          </div>
        </div>

        {/* Grid skeleton */}
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-border-light/40 bg-white shadow-card"
            >
              <div className="aspect-[4/3] animate-pulse bg-muted" />
              <div className="space-y-3 p-4">
                <div className="h-4 w-3/4 animate-pulse rounded-lg bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded-lg bg-muted/60" />
                <div className="h-5 w-1/3 animate-pulse rounded-lg bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
