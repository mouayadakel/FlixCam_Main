/**
 * Checkout Step 3: Review & Pay – summary, promo code, price breakdown, inline TAP.
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCartStore } from '@/lib/stores/cart.store'
import { useCheckoutStore } from '@/lib/stores/checkout.store'
import { PriceLockNotice } from './price-lock-notice'
import { InlineTapPayment } from './inline-tap-payment'

const VAT_RATE = 0.15

function formatSar(value: number): string {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(s: string | Date | null | undefined): string {
  if (!s) return '—'
  try {
    const d = typeof s === 'string' ? new Date(s) : s
    return new Intl.DateTimeFormat('en-SA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d)
  } catch {
    return '—'
  }
}

const ITEM_TYPE_LABELS: Record<string, string> = {
  EQUIPMENT: 'Equipment',
  STUDIO: 'Studio',
  ADDON: 'Add-on',
  PACKAGE: 'Package',
}

export function CheckoutStepReviewPay() {
  const { t } = useLocale()
  const router = useRouter()
  const [promoCode, setPromoCode] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [lockedAt, setLockedAt] = useState<Date | null>(null)
  const [lockExpired, setLockExpired] = useState(false)
  const [lockLoading, setLockLoading] = useState(true)
  const [payError, setPayError] = useState<string | null>(null)

  const { items, subtotal, discountAmount, total, fetchCart } = useCartStore()
  const details = useCheckoutStore((s) => s.details)
  const formValues = useCheckoutStore((s) => s.formValues)
  const addons = useCheckoutStore((s) => s.addons)

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  useEffect(() => {
    let cancelled = false
    async function lock() {
      setLockLoading(true)
      try {
        const res = await fetch('/api/checkout/lock-price', { method: 'POST' })
        if (res.ok) {
          const data = await res.json()
          if (!cancelled && data.lockedAt) setLockedAt(new Date(data.lockedAt))
        }
      } finally {
        if (!cancelled) setLockLoading(false)
      }
    }
    lock()
    return () => {
      cancelled = true
    }
  }, [])

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return
    setPromoLoading(true)
    setPromoError(null)
    try {
      const res = await fetch('/api/cart/coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPromoError(data.error || t('checkout.invalidPromo'))
      } else {
        await fetchCart()
      }
    } finally {
      setPromoLoading(false)
    }
  }

  const vatAmount = Math.round((subtotal - discountAmount) * VAT_RATE * 100) / 100

  if (!details) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
        <p>{t('checkout.completePrevious')}</p>
        <Button variant="link" onClick={() => router.push('/checkout')}>
          {t('checkout.backToCheckout')}
        </Button>
      </div>
    )
  }

  const receiverName =
    (formValues.receiver_name as string) ||
    (formValues.receiver_type === 'myself' ? details.name : '') ||
    details.name

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-3 font-semibold">{t('checkout.receiverSummary')}</h2>
        <p className="text-sm font-medium">{receiverName}</p>
        <p className="text-sm text-muted-foreground" dir="ltr">
          {details.phone}
        </p>
        <p className="text-sm">
          {details.deliveryMethod === 'PICKUP'
            ? t('checkout.deliveryPickup')
            : t('checkout.deliveryDelivery')}
          {details.deliveryAddress && (
            <span className="text-muted-foreground">
              {' – '}
              {details.deliveryAddress.city}, {details.deliveryAddress.street}
            </span>
          )}
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-3 font-semibold">{t('checkout.orderSummary')}</h2>
        <ul className="space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between">
              <span>
                {(item as { name?: string }).name ||
                  ITEM_TYPE_LABELS[item.itemType] ||
                  item.itemType}
                {item.quantity > 1 && ` × ${item.quantity}`}
                {(item.startDate || item.endDate) && (
                  <span className="block text-xs text-muted-foreground">
                    {formatDate(item.startDate)} – {formatDate(item.endDate)}
                  </span>
                )}
              </span>
              <span className="font-medium">{formatSar(item.subtotal ?? 0)}</span>
            </li>
          ))}
        </ul>
        {addons.technician && (
          <div className="mt-2 flex justify-between text-sm">
            <span>{t('checkout.addTechnician')}</span>
            <span className="font-medium">
              {addons.deliveryFee != null ? formatSar(addons.deliveryFee) : '—'}
            </span>
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-2 font-semibold">{t('checkout.promoCode')}</h3>
        <div className="flex gap-2">
          <Input
            placeholder={t('checkout.promoPlaceholder')}
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            disabled={promoLoading}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleApplyPromo}
            disabled={promoLoading || !promoCode.trim()}
          >
            {promoLoading ? '...' : t('checkout.applyPromo')}
          </Button>
        </div>
        {discountAmount > 0 && (
          <p className="mt-2 text-sm font-medium text-green-600 dark:text-green-400">
            {t('checkout.youSaved')} {formatSar(discountAmount)} SAR
          </p>
        )}
        {promoError && (
          <p className="mt-1 text-sm text-destructive">{promoError}</p>
        )}
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-3 font-semibold">{t('checkout.priceBreakdown')}</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t('checkout.subtotal')}</dt>
            <dd>{formatSar(subtotal)}</dd>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-green-600 dark:text-green-400">
              <dt>{t('checkout.discount')}</dt>
              <dd>-{formatSar(discountAmount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t('checkout.vat')}</dt>
            <dd>{formatSar(vatAmount)}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2 font-semibold">
            <dt>{t('checkout.total')}</dt>
            <dd>{formatSar(total)}</dd>
          </div>
        </dl>
      </div>

      {!lockLoading && (
        <PriceLockNotice lockedAt={lockedAt} onExpired={() => setLockExpired(true)} />
      )}

      {payError && (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {payError}
        </p>
      )}

      <InlineTapPayment
        totalAmount={total}
        onError={setPayError}
      />
    </div>
  )
}
