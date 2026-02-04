/**
 * Single cart item row (Phase 3.1).
 */

'use client'

import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import type { CartItem } from '@/lib/stores/cart.store'

interface CartItemRowProps {
  item: CartItem
  onUpdateQuantity: (itemId: string, quantity: number) => void
  onRemove: (itemId: string) => void
}

const ITEM_TYPE_LABEL: Record<string, string> = {
  EQUIPMENT: 'Equipment',
  STUDIO: 'Studio',
  PACKAGE: 'Package',
  KIT: 'Kit',
}

export function CartItemRow({ item, onUpdateQuantity, onRemove }: CartItemRowProps) {
  const { t } = useLocale()

  const label = ITEM_TYPE_LABEL[item.itemType] ?? item.itemType
  const canEditQty = item.itemType === 'EQUIPMENT' || item.itemType === 'KIT'

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">
          {item.quantity} × {item.dailyRate != null ? `${item.dailyRate.toLocaleString()} SAR` : '—'}
        </p>
        {!item.isAvailable && (
          <p className="text-sm text-amber-600 dark:text-amber-400">{t('common.unavailable')}</p>
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
