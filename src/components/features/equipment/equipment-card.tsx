/**
 * Equipment card for catalog (Phase 2.2).
 */

import Link from 'next/link'
import Image from 'next/image'
import { useLocale } from '@/hooks/use-locale'

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
  const available = (item.quantityAvailable ?? 0) > 0

  if (layout === 'list') {
    return (
      <Link
        href={`/equipment/${item.id}`}
        className="flex gap-4 rounded-lg border bg-card p-3 hover:shadow-md transition-shadow"
      >
        <div className="relative h-24 w-32 shrink-0 rounded-md overflow-hidden bg-muted">
          {item.media[0]?.url ? (
            <Image
              src={item.media[0].url}
              alt={item.model ?? item.sku ?? item.id}
              fill
              className="object-cover"
              sizes="128px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
              No image
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{item.model ?? item.sku}</p>
          <p className="text-sm text-muted-foreground">
            {item.dailyPrice > 0
              ? `${Number(item.dailyPrice).toLocaleString()} SAR / ${t('common.pricePerDay')}`
              : '—'}
          </p>
        </div>
        <span
          className={`shrink-0 text-xs font-medium px-2 py-1 rounded ${
            available ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted text-muted-foreground'
          }`}
        >
          {available ? t('common.available') : t('common.unavailable')}
        </span>
      </Link>
    )
  }

  return (
    <Link
      href={`/equipment/${item.id}`}
      className="group rounded-lg border bg-card overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="aspect-[4/3] relative bg-muted">
        {item.media[0]?.url ? (
          <Image
            src={item.media[0].url}
            alt={item.model ?? item.sku ?? item.id}
            fill
            className="object-cover group-hover:scale-105 transition-transform"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
            No image
          </div>
        )}
        <span
          className={`absolute top-2 end-2 text-xs font-medium px-2 py-1 rounded ${
            available ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted text-muted-foreground'
          }`}
        >
          {available ? t('common.available') : t('common.unavailable')}
        </span>
      </div>
      <div className="p-3">
        <p className="font-medium truncate">{item.model ?? item.sku}</p>
        <p className="text-sm text-muted-foreground">
          {item.dailyPrice > 0
            ? `${Number(item.dailyPrice).toLocaleString()} SAR / ${t('common.pricePerDay')}`
            : '—'}
        </p>
      </div>
    </Link>
  )
}
