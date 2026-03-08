/**
 * Cart summary: line items, subtotal, discount, VAT, total, checkout CTA (Phase 3.1).
 */

'use client'

import Link from 'next/link'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import type { CartItem } from '@/lib/stores/cart.store'

const VAT_RATE = 0.15

interface CartSummaryProps {
  items: CartItem[]
  subtotal: number
  discountAmount: number
  total: number
  itemCount: number
  onStartCheckout?: () => void
}

function formatSar(value: number): string {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function CartSummary({
  items,
  subtotal,
  discountAmount,
  total,
  itemCount,
  onStartCheckout,
}: CartSummaryProps) {
  const { t } = useLocale()
  const vatAmount = Math.round((subtotal - discountAmount) * VAT_RATE * 100) / 100
  const totalWithVat = subtotal - discountAmount + vatAmount

  return (
    <div className="space-y-3 rounded-lg border border-border-light bg-card p-3 shadow-sm">
      <h3 className="text-sm font-semibold text-text-heading">{t('checkout.orderSummary')}</h3>
      <ul className="max-h-24 space-y-1 overflow-y-auto border-b border-border-light pb-3 text-xs">
        {items.map((item) => (
          <li key={item.id} className="flex justify-between gap-2">
            <span className="truncate text-text-muted">
              {item.equipmentName ?? item.kitName ?? item.studioName ?? item.itemType}
              {item.quantity > 1 && ` × ${item.quantity}`}
            </span>
            <span className="shrink-0 font-medium">{formatSar(item.subtotal)}</span>
          </li>
        ))}
      </ul>
      <dl className="space-y-1.5 text-xs">
        <div className="flex justify-between text-text-muted">
          <dt>{t('cart.subtotal')}</dt>
          <dd>{formatSar(subtotal)}</dd>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-green-600 dark:text-green-400">
            <dt>{t('cart.discount')}</dt>
            <dd>-{formatSar(discountAmount)}</dd>
          </div>
        )}
        <div className="flex justify-between text-text-muted">
          <dt>{t('checkout.vat')}</dt>
          <dd>{formatSar(vatAmount)}</dd>
        </div>
        <div className="flex justify-between border-t border-border-light pt-1.5 text-sm font-semibold text-text-heading">
          <dt>{t('cart.total')}</dt>
          <dd>{formatSar(totalWithVat)}</dd>
        </div>
      </dl>
      {onStartCheckout ? (
        <Button
          type="button"
          className="mt-3 w-full rounded-lg"
          size="sm"
          disabled={itemCount === 0}
          onClick={onStartCheckout}
        >
          {t('cart.checkout')}
        </Button>
      ) : (
        <Button asChild className="mt-3 w-full rounded-lg" size="sm" disabled={itemCount === 0}>
          <Link href="/checkout">{t('cart.checkout')}</Link>
        </Button>
      )}
    </div>
  )
}
