/**
 * Equipment card for catalog – modern product card with hover overlay,
 * quick view hint, brand labels, availability badges, and polished pricing.
 */

'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useLocale } from '@/hooks/use-locale'
import { cn } from '@/lib/utils'
import { AvailabilityBadge, getAvailabilityStatus } from './availability-badge'
import { SaveEquipmentButton } from './save-equipment-button'
import { Eye } from 'lucide-react'

const EQUIPMENT_PLACEHOLDER_IMAGE = '/images/placeholder.jpg'

export interface EquipmentCardItem {
  id: string
  sku: string | null
  model: string | null
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
  const { t } = useLocale()
  const availabilityStatus = getAvailabilityStatus(item.quantityAvailable, true)

  if (layout === 'list') {
    return (
      <Link
        href={`/equipment/${item.id}`}
        className="group flex gap-4 rounded-2xl border border-border-light/60 bg-white p-4 shadow-card transition-all duration-300 hover:shadow-card-hover hover:border-brand-primary/10 hover:-translate-y-0.5"
      >
        <div className="relative h-28 w-36 shrink-0 overflow-hidden rounded-xl bg-surface-light">
          <Image
            src={item.media[0]?.url || EQUIPMENT_PLACEHOLDER_IMAGE}
            alt={item.model ?? item.sku ?? item.id}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="144px"
            unoptimized={!item.media[0]?.url}
          />
        </div>
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <p className="text-label-small uppercase tracking-wider text-text-muted">
            {item.brand?.name ?? item.category?.name ?? '—'}
          </p>
          <p className="mt-1 font-semibold truncate text-text-heading group-hover:text-brand-primary transition-colors">
            {item.model ?? item.sku}
          </p>
          {item.vendor && (
            <p className="mt-0.5 text-xs text-muted-foreground">by {item.vendor.companyName}</p>
          )}
          <div className="mt-2 flex items-baseline gap-1.5">
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
        <AvailabilityBadge
          status={availabilityStatus}
          quantityAvailable={item.quantityAvailable ?? 0}
          className="shrink-0 self-start"
        />
      </Link>
    )
  }

  return (
    <Link
      href={`/equipment/${item.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border-light/60 bg-white shadow-card transition-all duration-350 hover:-translate-y-1.5 hover:shadow-card-hover hover:border-brand-primary/10"
    >
      <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-surface-light">
        {/* Save button */}
        <div className="absolute top-3 right-3 z-10">
          <SaveEquipmentButton equipmentId={item.id} />
        </div>
        <Image
          src={item.media[0]?.url || EQUIPMENT_PLACEHOLDER_IMAGE}
          alt={item.model ?? item.sku ?? item.id}
          fill
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          unoptimized={!item.media[0]?.url}
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-300 group-hover:bg-black/25">
          <span className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-text-heading opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 shadow-lg backdrop-blur-sm">
            <Eye className="h-4 w-4" />
            {t('common.viewDetails') ?? 'View'}
          </span>
        </div>
        {/* Availability badge */}
        <span className="absolute top-3 end-3">
          <AvailabilityBadge
            status={availabilityStatus}
            quantityAvailable={item.quantityAvailable ?? 0}
          />
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-4">
        <p className="text-label-small uppercase tracking-wider text-text-muted">
          {item.brand?.name ?? item.category?.name ?? '—'}
        </p>
        <p className="mt-1.5 truncate text-card-title text-text-heading group-hover:text-brand-primary transition-colors">
          {item.model ?? item.sku ?? item.id}
        </p>
        {item.vendor && (
          <p className="mt-0.5 text-xs text-muted-foreground">by {item.vendor.companyName}</p>
        )}
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
}
