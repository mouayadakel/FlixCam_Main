/**
 * Single cart item row (Phase 3.1).
 */

'use client'

import Link from 'next/link'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import type { CartItem } from '@/lib/stores/cart.store'

interface CartItemRowProps {
  item: CartItem
  onUpdateQuantity: (itemId: string, quantity: number) => void
  onRemove: (itemId: string) => void
}

function getItemTypeLabel(itemType: string, t: (key: string) => string): string {
  const map: Record<string, string> = {
    EQUIPMENT: t('common.typeEquipment'),
    STUDIO: t('common.typeStudio'),
    PACKAGE: t('common.typePackage'),
    KIT: t('common.typeKit'),
  }
  return map[itemType] ?? itemType
}

function formatStudioSlot(startDate: string | null, endDate: string | null): string {
  if (!startDate || !endDate) return '—'
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '—'
  const dateStr = start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const timeStr = `${start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
  return `${dateStr} • ${timeStr}`
}

export function CartItemRow({ item, onUpdateQuantity, onRemove }: CartItemRowProps) {
  const { t } = useLocale()

  const label = getItemTypeLabel(item.itemType, t)
  const canEditQty = item.itemType === 'EQUIPMENT' || item.itemType === 'KIT'
  const isStudio = item.itemType === 'STUDIO'
  const studioName = isStudio ? (item.studioName ?? 'Studio') : null
  const studioSlot = isStudio ? formatStudioSlot(item.startDate, item.endDate) : null
  const editStudioUrl =
    isStudio && item.studioSlug && item.startDate && item.endDate
      ? (() => {
          const start = new Date(item.startDate)
          const end = new Date(item.endDate)
          const dateStr = start.toISOString().slice(0, 10)
          const durationHours = Math.max(
            1,
            Math.round((end.getTime() - start.getTime()) / (60 * 60 * 1000))
          )
          return `/studios/${item.studioSlug}?date=${dateStr}&start=${item.startDate}&duration=${durationHours}`
        })()
      : null

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
      <div>
        <p className="font-medium">{isStudio && studioName ? studioName : label}</p>
        {isStudio && studioSlot && <p className="text-sm text-muted-foreground">{studioSlot}</p>}
        {!isStudio && (
          <p className="text-sm text-muted-foreground">
            {item.quantity} ×{' '}
            {item.dailyRate != null ? `${item.dailyRate.toLocaleString()} SAR` : '—'}
          </p>
        )}
        {isStudio && (
          <p className="text-sm text-muted-foreground">
            {item.quantity} × {item.subtotal.toLocaleString()} SAR
          </p>
        )}
        {!item.isAvailable && (
          <p className="text-sm text-amber-600 dark:text-amber-400">{t('common.unavailable')}</p>
        )}
        {editStudioUrl && (
          <Link
            href={editStudioUrl}
            className="text-sm text-primary underline underline-offset-2 hover:no-underline"
          >
            {t('common.viewDetails')}
          </Link>
        )}
      </div>
      <div className="flex items-center gap-2">
        {canEditQty && (
          <input
            type="number"
            min={1}
            value={item.quantity}
            onChange={(e) => onUpdateQuantity(item.id, parseInt(e.target.value, 10) || 1)}
            className="w-16 rounded border px-2 py-1 text-sm"
            aria-label={t('cart.quantity')}
          />
        )}
        <span className="font-medium">{item.subtotal.toLocaleString()} SAR</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(item.id)}
          aria-label={t('cart.remove')}
        >
          {t('cart.remove')}
        </Button>
      </div>
    </div>
  )
}
