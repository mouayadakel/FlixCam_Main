'use client'

import { useLocale } from '@/hooks/use-locale'
import { EquipmentCatalog } from '@/components/features/equipment/equipment-catalog'
import Link from 'next/link'
import { ChevronRight, Package } from 'lucide-react'

export function EquipmentCatalogClient() {
  const { t } = useLocale()

  return (
    <>
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-4 flex items-center gap-1.5 text-sm text-text-muted"
      >
        <Link href="/" className="transition-colors hover:text-text-heading">
          {t('nav.home')}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-text-heading">{t('nav.equipment')}</span>
      </nav>

      {/* Page heading */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/10">
          <Package className="h-5 w-5 text-brand-primary" />
        </div>
        <h1 className="text-section-title text-text-heading">{t('nav.equipment')}</h1>
      </div>

      <EquipmentCatalog />
    </>
  )
}
