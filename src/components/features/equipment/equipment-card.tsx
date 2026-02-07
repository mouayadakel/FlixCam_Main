/**
 * Equipment card for catalog – design cards.product:
 * image, vendor_label, title, price; sold_out badge; hover lift.
 */

'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useLocale } from '@/hooks/use-locale'
import { cn } from '@/lib/utils'

export interface EquipmentCardItem {
  id: string
  sku: string | null
  model: string | null
  dailyPrice: number
  quantityAvailable: number | null
  category: { name: string; slug: string } | null
  brand: { name: string; slug: string } | null
  media: { url: string; type: string }[]
}

interface EquipmentCardProps {
  item: EquipmentCardItem
  layout?: 'grid' | 'list'
}

export function EquipmentCard({ item, layout = 'grid' }: EquipmentCardProps) {
  const { t } = useLocale()
  const soldOut = (item.quantityAvailable ?? 0) <= 0

  if (layout === 'list') {
    return (
      <Link
        href={`/equipment/${item.id}`}
        className="flex gap-4 rounded-public-card border border-border-light bg-white p-3 transition-[box-shadow,transform] hover:shadow-card-hover motion-reduce:transition-none [@media(pointer:fine)]:hover:-translate-y-0.5"
      >
        <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-public-card bg-surface-light">
          {item.media[0]?.url ? (
            <Image
              src={item.media[0].url}
              alt={item.model ?? item.sku ?? item.id}
              fill
              className="object-cover"
              sizes="128px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-text-muted text-xs">
              No image
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-label-small uppercase tracking-wide text-text-muted">
            {item.brand?.name ?? item.category?.name ?? '—'}
          </p>
          <p className="font-medium truncate text-text-heading">
            {item.model ?? item.sku}
          </p>
          <p className="text-price-tag text-text-heading">
            {item.dailyPrice > 0
              ? `${Number(item.dailyPrice).toLocaleString()} SAR / ${t('common.pricePerDay')}`
              : '—'}
          </p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded px-2 py-1 text-label-small uppercase',
            soldOut
              ? 'bg-sold-out text-white'
              : 'bg-surface-light text-text-body'
          )}
        >
          {soldOut ? t('common.unavailable') : t('common.available')}
        </span>
      </Link>
    )
  }

  return (
    <Link
      href={`/equipment/${item.id}`}
      className="group flex flex-col overflow-hidden rounded-public-card border border-border-light bg-white transition-[box-shadow,transform] hover:shadow-card-hover motion-reduce:transition-none [@media(pointer:fine)]:hover:-translate-y-0.5"
    >
      <div className="relative aspect-[4/3] shrink-0 bg-surface-light">
        {item.media[0]?.url ? (
          <Image
            src={item.media[0].url}
            alt={item.model ?? item.sku ?? item.id}
            fill
            className="object-cover transition-transform duration-200 group-hover:scale-[1.02] motion-reduce:group-hover:scale-100"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-text-muted text-sm">
            No image
          </div>
        )}
        {soldOut && (
          <span className="absolute top-2 end-2 rounded bg-sold-out px-2 py-1 text-label-small uppercase text-white">
            {t('common.unavailable')}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-3">
        <p className="text-label-small uppercase tracking-wide text-text-muted">
          {item.brand?.name ?? item.category?.name ?? '—'}
        </p>
        <p className="mt-1 truncate text-card-title text-text-heading">
          {item.model ?? item.sku ?? item.id}
        </p>
        <p className="mt-1 text-price-tag text-text-heading">
          {item.dailyPrice > 0
            ? `${Number(item.dailyPrice).toLocaleString()} SAR / ${t('common.pricePerDay')}`
            : '—'}
        </p>
      </div>
    </Link>
  )
}
