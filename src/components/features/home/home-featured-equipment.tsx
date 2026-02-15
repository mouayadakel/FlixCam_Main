/**
 * Homepage featured equipment grid – premium product cards with hover overlay,
 * quick action hints, brand labels, and polished pricing.
 */

'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useLocale } from '@/hooks/use-locale'
import { isExternalImageUrl } from '@/lib/utils/image.utils'
import { PublicContainer } from '@/components/public/public-container'
import { Button } from '@/components/ui/button'
import { ArrowRight, Eye } from 'lucide-react'

const EQUIPMENT_PLACEHOLDER_IMAGE = '/images/placeholder.jpg'

interface EquipmentItem {
  id: string
  sku: string | null
  model: string | null
  dailyPrice: number
  quantityAvailable: number | null
  category: { name: string; slug: string } | null
  brand: { name: string; slug: string } | null
  media: { url: string; type: string }[]
}

interface HomeFeaturedEquipmentProps {
  items: EquipmentItem[]
}

export function HomeFeaturedEquipment({ items }: HomeFeaturedEquipmentProps) {
  const { t } = useLocale()
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(() => new Set())
  const handleImageError = useCallback((itemId: string) => {
    setFailedImageIds((prev) => new Set(prev).add(itemId))
  }, [])

  return (
    <section className="bg-surface-light py-16 md:py-20 lg:py-24">
      <PublicContainer>
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-section-title text-text-heading">
              {t('home.featuredEquipment')}
            </h2>
            <p className="mt-2 text-body-main text-text-body">
              {t('home.heroSubtitle')}
            </p>
          </div>
          <Button
            variant="ghost"
            className="hidden sm:inline-flex items-center gap-1 text-brand-primary hover:text-brand-primary-hover hover:bg-brand-primary/5 font-semibold transition-colors"
            asChild
          >
            <Link href="/equipment">
              {t('common.viewAll')}
              <ArrowRight className="ms-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
          {items.slice(0, 4).map((item, index) => {
            const soldOut = (item.quantityAvailable ?? 0) <= 0
            return (
              <Link
                key={item.id}
                href={`/equipment/${item.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border-light/60 bg-white shadow-card transition-all duration-350 hover:-translate-y-1.5 hover:shadow-card-hover opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${0.1 * index}s` }}
              >
                <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-surface-light">
                  {failedImageIds.has(item.id) ? (
                    <div className="absolute inset-0 bg-surface-light" aria-hidden />
                  ) : (
                    <Image
                      src={item.media[0]?.url || EQUIPMENT_PLACEHOLDER_IMAGE}
                      alt={item.model ?? item.sku ?? item.id}
                      fill
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      unoptimized={!item.media[0]?.url || isExternalImageUrl(item.media[0]?.url)}
                      onError={() => handleImageError(item.id)}
                    />
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-300 group-hover:bg-black/30">
                    <span className="flex items-center gap-2 rounded-full bg-white/90 px-5 py-2.5 text-sm font-semibold text-text-heading opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 shadow-lg backdrop-blur-sm">
                      <Eye className="h-4 w-4" />
                      {t('common.viewDetails') ?? 'View Details'}
                    </span>
                  </div>
                  {/* Status badges */}
                  {soldOut && (
                    <span className="absolute top-3 end-3 rounded-lg bg-sold-out/90 px-3 py-1 text-label-small uppercase text-white backdrop-blur-sm">
                      {t('common.unavailable')}
                    </span>
                  )}
                  {!soldOut && index === 0 && (
                    <span className="absolute top-3 start-3 rounded-lg bg-brand-primary px-3 py-1 text-label-small uppercase text-white shadow-sm">
                      Featured
                    </span>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col p-4">
                  <p className="text-label-small uppercase tracking-wider text-text-muted">
                    {item.brand?.name ?? item.category?.name ?? '—'}
                  </p>
                  <p className="mt-1.5 truncate text-card-title text-text-heading group-hover:text-brand-primary transition-colors">
                    {item.model ?? item.sku ?? item.id}
                  </p>
                  <div className="mt-3 flex items-baseline gap-1.5 pt-3 border-t border-border-light/60">
                    <span className="text-price-tag text-brand-primary">
                      {item.dailyPrice > 0
                        ? `${Number(item.dailyPrice).toLocaleString()} SAR`
                        : '—'}
                    </span>
                    {item.dailyPrice > 0 && (
                      <span className="text-sm text-text-muted">/ {t('common.pricePerDay')}</span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
        {/* Mobile view all button */}
        <div className="mt-8 text-center sm:hidden">
          <Button
            variant="outline"
            className="border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white rounded-xl px-8 transition-all"
            asChild
          >
            <Link href="/equipment">
              {t('common.viewAll')}
              <ArrowRight className="ms-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </PublicContainer>
    </section>
  )
}
