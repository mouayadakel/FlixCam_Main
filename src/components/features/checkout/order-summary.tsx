/**
 * Sticky order summary for checkout – line items, subtotal, discount, VAT, deposit, total.
 * Optional hold timer when price is locked.
 */

'use client'

import { useLocale } from '@/hooks/use-locale'
import { useCartStore } from '@/lib/stores/cart.store'
import { cn } from '@/lib/utils'

const VAT_RATE = 0.15

export interface OrderSummaryProps {
  /** Optional: when the price hold expires (ISO string) to show "held for X:XX" */
  holdExpiresAt?: string | null
  /** Optional: deposit amount to display (from PricingService.calculateDeposit) */
  depositAmount?: number | null
  className?: string
}

function formatSar(value: number): string {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(s: string | null): string {
  if (!s) return '—'
  try {
    return new Intl.DateTimeFormat('en-SA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(s))
  } catch {
    return s
  }
}

export function OrderSummary({ holdExpiresAt, depositAmount, className }: OrderSummaryProps) {
  const { t } = useLocale()
  const items = useCartStore((s) => s.items)
  const subtotal = useCartStore((s) => s.subtotal)
  const discountAmount = useCartStore((s) => s.discountAmount)
  const total = useCartStore((s) => s.total)

  const vatAmount = Math.round((subtotal - discountAmount) * VAT_RATE * 100) / 100
  const deposit = depositAmount ?? 0
  const totalWithDeposit = total + deposit

  const heldForMinutes = holdExpiresAt
    ? Math.max(0, Math.ceil((new Date(holdExpiresAt).getTime() - Date.now()) / 60000))
    : null

  return (
    <div
      className={cn(
        'sticky top-24 rounded-lg border border-border-light bg-surface-light p-4 shadow-sm',
        className
      )}
    >
      <h3 className="mb-4 text-lg font-semibold text-text-heading">
        {t('checkout.orderSummary')}
      </h3>

      <ul className="mb-4 space-y-2 border-b border-border-light pb-4">
        {items.map((item) => (
          <li key={item.id} className="flex justify-between text-sm">
            <span className="text-text-heading">
              {item.itemType === 'EQUIPMENT' ? 'Equipment' : item.itemType}
              {item.quantity > 1 && ` × ${item.quantity}`}
              {item.startDate && item.endDate && (
                <span className="block text-xs text-text-muted">
                  {formatDate(item.startDate)} – {formatDate(item.endDate)}
                </span>
              )}
            </span>
            <span className="font-medium">{formatSar(item.subtotal)}</span>
          </li>
        ))}
      </ul>

      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-text-muted">{t('checkout.subtotal')}</dt>
          <dd>{formatSar(subtotal)}</dd>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-green-600">
            <dt>{t('checkout.discount')}</dt>
            <dd>-{formatSar(discountAmount)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-text-muted">{t('checkout.vat')}</dt>
          <dd>{formatSar(vatAmount)}</dd>
        </div>
        {deposit > 0 && (
          <div className="flex justify-between">
            <dt className="text-text-muted">{t('checkout.deposit')}</dt>
            <dd>{formatSar(deposit)}</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-border-light pt-2 font-semibold">
          <dt>{t('checkout.total')}</dt>
          <dd>{formatSar(deposit > 0 ? totalWithDeposit : total)}</dd>
        </div>
      </dl>

      {heldForMinutes !== null && heldForMinutes > 0 && (
        <p className="mt-4 text-xs text-text-muted">
          {t('checkout.heldFor').replace('{time}', `${heldForMinutes} min`)}
        </p>
      )}
    </div>
  )
}
