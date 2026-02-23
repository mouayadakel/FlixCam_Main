/**
 * Equipment card for catalog – modern product card with hover overlay,
 * quick view hint, brand labels, availability badges, and polished pricing.
 */

'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useLocale } from '@/hooks/use-locale'
import { isExternalImageUrl } from '@/lib/utils/image.utils'
import { cn } from '@/lib/utils'
import { SaveEquipmentButton } from './save-equipment-button'
import { Eye } from 'lucide-react'
import { getLocalizedName } from '@/lib/i18n/content-helper'

const EQUIPMENT_PLACEHOLDER_IMAGE = '/images/placeholder.jpg'

export interface EquipmentCardItem {
  id: string
  sku: string | null
  model: string | null
  nameEn?: string | null
  nameZh?: string | null
  dailyPrice: number
  quantityAvailable: number | null
  category: { name: string; slug: string } | null
  brand: { name: string; slug: string } | null
  media: { url: string; type: string }[]
  vendor?: { companyName: string } | null
}

interface EquipmentCardProps {
  item: EquipmentCardItem
  layout?: 'grid' | 'list'
}

export function EquipmentCard({ item, layout = 'grid' }: EquipmentCardProps) {
  const { t, locale } = useLocale()
  const [imageFailed, setImageFailed] = useState(false)
  const handleImageError = useCallback(() => setImageFailed(true), [])

  // Get localized name, fallback to model or SKU
  const displayName = getLocalizedName(item as any, locale) || item.model || item.sku || item.id

  if (layout === 'list') {
    return (
      <Link
        href={`/equipment/${item.id}`}
        className="group flex gap-4 rounded-2xl border border-border-light/60 bg-white p-4 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-primary/10 hover:shadow-card-hover"
      >
        <div className="relative h-28 w-36 shrink-0 overflow-hidden rounded-xl bg-surface-light">
          {imageFailed ? (
            <div className="absolute inset-0 bg-surface-light" aria-hidden />
          ) : (
            <Image
              src={item.media[0]?.url || EQUIPMENT_PLACEHOLDER_IMAGE}
              alt={item.model ?? item.sku ?? item.id}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="144px"
              unoptimized={!item.media[0]?.url || isExternalImageUrl(item.media[0]?.url)}
              onError={handleImageError}
            />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <p className="text-label-small uppercase tracking-wider text-text-muted">
            {item.brand?.name ?? item.category?.name ?? '—'}
          </p>
          <p className="mt-1 truncate font-semibold text-text-heading transition-colors group-hover:text-brand-primary">
            {displayName}
          </p>
          {item.vendor && (
            <p className="mt-0.5 text-xs text-muted-foreground">by {item.vendor.companyName}</p>
          )}
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-price-tag text-brand-primary">
              {item.dailyPrice > 0 ? `${Number(item.dailyPrice).toLocaleString()} SAR` : '—'}
            </span>
            {item.dailyPrice > 0 && (
              <span className="text-sm text-text-muted">/ {t('common.pricePerDay')}</span>
            )}
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link
      href={`/equipment/${item.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border-light/60 bg-white shadow-card transition-all duration-350 hover:-translate-y-1.5 hover:border-brand-primary/10 hover:shadow-card-hover"
    >
      <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-surface-light">
        {/* Save button */}
        <div className="absolute right-3 top-3 z-10">
          <SaveEquipmentButton equipmentId={item.id} />
        </div>
        {imageFailed ? (
          <div className="absolute inset-0 bg-surface-light" aria-hidden />
        ) : (
          <Image
            src={item.media[0]?.url || EQUIPMENT_PLACEHOLDER_IMAGE}
            alt={item.model ?? item.sku ?? item.id}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            unoptimized={!item.media[0]?.url || isExternalImageUrl(item.media[0]?.url)}
            onError={handleImageError}
          />
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-300 group-hover:bg-black/25">
          <span className="flex translate-y-2 items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-text-heading opacity-0 shadow-lg backdrop-blur-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <Eye className="h-4 w-4" />
            {t('common.bookNow')}
          </span>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-4">
        <p className="text-label-small uppercase tracking-wider text-text-muted">
          {item.brand?.name ?? item.category?.name ?? '—'}
        </p>
        <p className="mt-1.5 truncate text-card-title text-text-heading transition-colors group-hover:text-brand-primary">
          {displayName}
        </p>
        {item.vendor && (
          <p className="mt-0.5 text-xs text-muted-foreground">by {item.vendor.companyName}</p>
        )}
        <div className="mt-3 flex items-baseline gap-1.5 border-t border-border-light/60 pt-3">
          <span className="text-price-tag text-brand-primary">
            {item.dailyPrice > 0 ? `${Number(item.dailyPrice).toLocaleString()} SAR` : '—'}
          </span>
          {item.dailyPrice > 0 && (
            <span className="text-sm text-text-muted">/ {t('common.pricePerDay')}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
