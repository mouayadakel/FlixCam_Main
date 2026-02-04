'use client'

import { useLocale } from '@/hooks/use-locale'
import { EquipmentCatalog } from '@/components/features/equipment/equipment-catalog'

export function EquipmentCatalogClient() {
  const { t } = useLocale()

  return (
    <>
      <h1 className="text-2xl font-bold mb-6">{t('nav.equipment')}</h1>
      <EquipmentCatalog />
    </>
  )
}
