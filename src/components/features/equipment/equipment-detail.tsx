/**
 * Equipment detail: gallery, price, availability, CTA (Phase 2.3).
 */

'use client'

import Link from 'next/link'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { EquipmentGallery } from './equipment-gallery'
import { EquipmentPriceBlock } from './equipment-price-block'
import { EquipmentCard } from './equipment-card'
import type { EquipmentCardItem } from './equipment-card'

interface EquipmentDetailProps {
  equipment: {
    id: string
    sku: string
    model: string | null
    dailyPrice: number
    weeklyPrice: number | null
    monthlyPrice: number | null
    quantityAvailable: number | null
    category: { name: string; slug: string } | null
    brand: { name: string; slug: string } | null
    media: { id: string; url: string; type: string }[]
  }
  recommendations: EquipmentCardItem[]
}

export function EquipmentDetail({ equipment, recommendations }: EquipmentDetailProps) {
  const { t } = useLocale()
  const available = (equipment.quantityAvailable ?? 0) > 0

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <EquipmentGallery
          media={equipment.media}
          alt={equipment.model ?? equipment.sku}
        />
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">{equipment.model ?? equipment.sku}</h1>
          {(equipment.category ?? equipment.brand) && (
            <p className="text-sm text-muted-foreground">
              {[equipment.brand?.name, equipment.category?.name].filter(Boolean).join(' · ')}
            </p>
          )}
          <span
            className={`inline-block text-sm font-medium px-2 py-1 rounded ${
              available ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted text-muted-foreground'
            }`}
          >
            {available ? t('common.available') : t('common.unavailable')}
          </span>
          <EquipmentPriceBlock
            dailyPrice={equipment.dailyPrice}
            weeklyPrice={equipment.weeklyPrice}
            monthlyPrice={equipment.monthlyPrice}
          />
          <Button asChild size="lg" disabled={!available}>
            <Link href="/cart">{t('common.addToCart')}</Link>
          </Button>
        </div>
      </div>

      {recommendations.length > 0 && (
        <section className="border-t pt-8">
          <h2 className="text-xl font-semibold mb-4">{t('common.recommendations')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recommendations.map((item) => (
              <EquipmentCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
