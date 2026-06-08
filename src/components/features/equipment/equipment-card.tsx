'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useLocale } from '@/hooks/use-locale'
import { isExternalImageUrl } from '@/lib/utils/image.utils'
import { SaveEquipmentButton } from './save-equipment-button'
import { CompareButton } from './compare-button'
import { Eye, ImageOff } from 'lucide-react'
import { getLocalizedName } from '@/lib/i18n/content-helper'

const EQUIPMENT_PLACEHOLDER_IMAGE = '/images/equipment-placeholder.svg'

export interface EquipmentCardItem {
  id: string
  sku: string | null
  model: string | null
  nameEn?: string | null
  nameZh?: string | null
  slug?: string | null
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

function equipmentHref(item: EquipmentCardItem): string {
  return `/equipment/${item.slug ?? item.id}`
}

function formatPrice(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    maximumFractionDigits: 2,
  }).format(amount)
}

export function EquipmentCard({ item, layout = 'grid' }: EquipmentCardProps) {
  const { t, locale } = useLocale()
  const [imageSrc, setImageSrc] = useState(item.media[0]?.url || EQUIPMENT_PLACEHOLDER_IMAGE)
  const [imageFailed, setImageFailed] = useState(false)
  const detailHref = equipmentHref(item)

  useEffect(() => {
    setImageSrc(item.media[0]?.url || EQUIPMENT_PLACEHOLDER_IMAGE)
    setImageFailed(false)
  }, [item.id, item.media[0]?.url])

  const handleImageError = useCallback(() => {
    setImageSrc((current) => {
      if (current === EQUIPMENT_PLACEHOLDER_IMAGE) {
        setImageFailed(true)
        return current
      }
      return EQUIPMENT_PLACEHOLDER_IMAGE
    })
  }, [])

  const displayName = getLocalizedName(item as any, locale) || item.model || item.sku || item.id

  const compareEquipment = useMemo(
    () => ({
      id: item.id,
      name: displayName,
      slug: item.slug ?? item.id,
      image: item.media[0]?.url ?? null,
      dailyPrice: item.dailyPrice,
      category: item.category,
    }),
    [item, displayName]
  )

  const priceLabel =
    item.dailyPrice > 0 ? `${formatPrice(item.dailyPrice, locale)} SAR` : '—'

  if (layout === 'list') {
    return (
      <article className="group flex gap-4 rounded-2xl border border-border-light/60 bg-white p-4 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-primary/10 hover:shadow-card-hover">
        <Link
          href={detailHref}
          className="relative h-28 w-36 shrink-0 overflow-hidden rounded-xl bg-surface-light"
        >
          {imageFailed ? (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-surface-light text-text-muted"
              aria-hidden
            >
              <ImageOff className="h-6 w-6 opacity-50" />
              <span className="text-[10px]">No image</span>
            </div>
          ) : (
            <Image
              src={imageSrc}
              alt={item.model ?? item.sku ?? item.id}
              fill
              className="object-contain bg-surface-light transition-transform duration-300 group-hover:scale-105"
              style={{ objectFit: 'contain' }}
              sizes="144px"
              onError={handleImageError}
            />
          )}
        </Link>
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <Link href={detailHref} className="block min-w-0">
            <p className="text-label-small uppercase tracking-wider text-text-muted">
              {item.brand?.name ?? item.category?.name ?? '—'}
            </p>
            <p className="mt-1 truncate font-semibold text-text-heading transition-colors group-hover:text-brand-primary">
              {displayName}
            </p>
            {item.vendor && (
              <p className="mt-0.5 text-xs text-muted-foreground">by {item.vendor.companyName}</p>
            )}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-price-tag text-brand-primary">{priceLabel}</span>
              {item.dailyPrice > 0 && (
                <span className="text-sm text-text-muted">/ {t('common.pricePerDay')}</span>
              )}
            </div>
            <CompareButton equipment={compareEquipment} className="mt-1" />
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border-light/60 bg-white shadow-card transition-all duration-350 hover:-translate-y-1.5 hover:border-brand-primary/10 hover:shadow-card-hover">
      <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-surface-light">
        <div className="absolute end-3 top-3 z-20">
          <SaveEquipmentButton equipmentId={item.id} />
        </div>
        <Link href={detailHref} className="relative block h-full w-full">
          {imageFailed ? (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface-light text-text-muted"
              aria-hidden
            >
              <ImageOff className="h-10 w-10 opacity-50" />
              <span className="text-xs">No image</span>
            </div>
          ) : (
            <Image
              src={imageSrc}
              alt={item.model ?? item.sku ?? item.id}
              fill
              className="object-contain bg-surface-light transition-transform duration-500 ease-out group-hover:scale-105"
              style={{ objectFit: 'contain' }}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              onError={handleImageError}
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-300 group-hover:bg-black/25">
            <span className="flex translate-y-2 items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-text-heading opacity-0 shadow-lg backdrop-blur-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              <Eye className="h-4 w-4" />
              {t('common.bookNow')}
            </span>
          </div>
        </Link>
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-4">
        <Link href={detailHref} className="block min-w-0">
          <p className="text-label-small uppercase tracking-wider text-text-muted">
            {item.brand?.name ?? item.category?.name ?? '—'}
          </p>
          <p className="mt-1.5 truncate text-card-title text-text-heading transition-colors group-hover:text-brand-primary">
            {displayName}
          </p>
          {item.vendor && (
            <p className="mt-0.5 text-xs text-muted-foreground">by {item.vendor.companyName}</p>
          )}
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border-light/60 pt-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-price-tag text-brand-primary">{priceLabel}</span>
            {item.dailyPrice > 0 && (
              <span className="text-sm text-text-muted">/ {t('common.pricePerDay')}</span>
            )}
          </div>
          <CompareButton equipment={compareEquipment} />
        </div>
      </div>
    </article>
  )
}
