/**
 * Equipment card for kit wizard – thumbnail, brand, price, select state, quantity controls.
 */

'use client'

import Image from 'next/image'
import { useLocale } from '@/hooks/use-locale'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Check, Minus, Plus } from 'lucide-react'

const EQUIPMENT_PLACEHOLDER = '/images/placeholder.jpg'

export interface KitEquipmentItem {
  id: string
  model: string | null
  sku: string
  dailyPrice: number
  category: { name: string; slug: string } | null
  brand: { name: string; slug: string } | null
  media: { url: string; type: string }[]
}

interface KitEquipmentCardProps {
  item: KitEquipmentItem
  selectedQty?: number
  onToggle: () => void
  onQtyChange: (qty: number) => void
}

function formatSar(value: number): string {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function KitEquipmentCard({
  item,
  selectedQty = 0,
  onToggle,
  onQtyChange,
}: KitEquipmentCardProps) {
  const { t } = useLocale()
  const isSelected = selectedQty > 0

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-2xl border bg-white shadow-card transition-all duration-300',
        'hover:shadow-card-hover',
        isSelected
          ? 'border-brand-primary/40 ring-2 ring-brand-primary ring-offset-2'
          : 'border-border-light/60 hover:border-brand-primary/20'
      )}
    >
      <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-surface-light">
        <Image
          src={item.media[0]?.url || EQUIPMENT_PLACEHOLDER}
          alt={item.model ?? item.sku ?? item.id}
          fill
          className="object-cover transition-transform duration-300 hover:scale-105"
          sizes="(max-width: 640px) 100vw, 50vw"
          unoptimized={!item.media[0]?.url}
        />
        {isSelected && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-brand-primary/20 transition-opacity"
            aria-hidden
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary text-white shadow-lg">
              <Check className="h-5 w-5" />
            </span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4">
        <p className="text-label-small uppercase tracking-wider text-text-muted">
          {item.brand?.name ?? item.category?.name ?? '—'}
        </p>
        <p className="mt-1 truncate text-card-title text-text-heading">
          {item.model ?? item.sku}
        </p>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-price-tag text-brand-primary">
            {item.dailyPrice > 0 ? formatSar(item.dailyPrice) : '—'}
          </span>
          {item.dailyPrice > 0 && (
            <span className="text-sm text-text-muted">/ {t('kit.perDay')}</span>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          {isSelected ? (
            <>
              <div className="flex items-center rounded-lg border border-border-light bg-surface-light">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-r-none"
                  onClick={() => onQtyChange(Math.max(1, selectedQty - 1))}
                  aria-label={t('kit.remove')}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span
                  className="flex h-8 min-w-[2rem] items-center justify-center px-2 text-sm font-medium"
                  aria-label={t('kit.qty')}
                >
                  {selectedQty}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-l-none"
                  onClick={() => onQtyChange(selectedQty + 1)}
                  aria-label={t('kit.add')}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-text-muted"
                onClick={onToggle}
              >
                {t('kit.remove')}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              className="w-full bg-brand-primary hover:bg-brand-primary-hover"
              onClick={onToggle}
            >
              {t('kit.add')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
