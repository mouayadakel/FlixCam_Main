/**
 * Checkout Step 3: Summary, terms, price lock, Pay now (Phase 3.4).
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useCartStore } from '@/lib/stores/cart.store'
import { useCheckoutStore } from '@/lib/stores/checkout.store'
import { PriceLockNotice } from './price-lock-notice'

const ITEM_TYPE_LABELS: Record<string, string> = {
  EQUIPMENT: 'معدة',
  STUDIO: 'استوديو',
  ADDON: 'إضافة',
  PACKAGE: 'باقة',
}

function formatSar(value: number): string {
  return `${value.toLocaleString('ar-SA')} ر.س`
}

interface CheckoutStepReviewProps {
  /** When provided, "Pay Now" advances to payment step (5) instead of redirecting to /payment */
  onAdvanceToPayment?: () => void
}

export function CheckoutStepReview({ onAdvanceToPayment }: CheckoutStepReviewProps) {
  const { t } = useLocale()
  const router = useRouter()
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [lockedAt, setLockedAt] = useState<Date | null>(null)
  const [lockExpired, setLockExpired] = useState(false)
  const [lockLoading, setLockLoading] = useState(true)

  const { items, subtotal, discountAmount, total, fetchCart } = useCartStore()
  const details = useCheckoutStore((s) => s.details)

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

  const handlePayNow = () => {
    if (onAdvanceToPayment) {
      onAdvanceToPayment()
    } else {
      router.push('/payment')
    }
  }

  const canPay = termsAccepted && details && items.length > 0 && !lockLoading && !lockExpired

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

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-3 font-semibold">{t('checkout.orderSummary')}</h2>
        <ul className="space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between">
              <span>
                {(item as any).name || ITEM_TYPE_LABELS[item.itemType] || item.itemType}
                {item.quantity > 1 && ` × ${item.quantity}`}
                {item.startDate && (
                  <span className="block text-xs text-muted-foreground">
                    {item.startDate} – {item.endDate}
                  </span>
                )}
              </span>
              <span className="font-medium">{formatSar(item.subtotal ?? 0)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <span>{t('cart.subtotal')}</span>
            <span>{formatSar(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-green-600 dark:text-green-400">
              <span>{t('cart.discount')}</span>
              <span>-{formatSar(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold">
            <span>{t('cart.total')}</span>
            <span>{formatSar(total)}</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-3 font-semibold">{t('checkout.contactSummary')}</h2>
        <p className="text-sm">{details.name}</p>
        <p className="text-sm text-muted-foreground" dir="ltr">
          {details.email}
        </p>
        <p className="text-sm text-muted-foreground" dir="ltr">
          {details.phone}
        </p>
        <p className="mt-2 text-sm">
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

      {!lockLoading && (
        <PriceLockNotice lockedAt={lockedAt} onExpired={() => setLockExpired(true)} />
      )}

      <div className="flex items-start gap-2">
        <Checkbox
          id="terms"
          checked={termsAccepted}
          onCheckedChange={(v) => setTermsAccepted(v === true)}
        />
        <label htmlFor="terms" className="cursor-pointer text-sm leading-none">
          {t('checkout.termsAccept')}{' '}
          <Link href="/policies" className="text-primary underline" target="_blank" rel="noopener">
            {t('checkout.termsLink')}
          </Link>
        </label>
      </div>

      <Button size="lg" className="w-full" disabled={!canPay} onClick={handlePayNow}>
        {t('checkout.payNow')} – {formatSar(total)}
      </Button>
    </div>
  )
}
