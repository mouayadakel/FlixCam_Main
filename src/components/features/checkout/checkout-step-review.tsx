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

export function CheckoutStepReview() {
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
    router.push('/payment')
  }

  const canPay = termsAccepted && details && items.length > 0 && !lockLoading && !lockExpired

  if (!details) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
        <p>يرجى إكمال خطوة البيانات أولاً.</p>
        <Button variant="link" onClick={() => router.push('/checkout')}>
          العودة للطلبات
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <h2 className="font-semibold mb-3">{t('checkout.orderSummary')}</h2>
        <ul className="space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between">
              <span>
                {item.itemType} × {item.quantity}
                {item.startDate && (
                  <span className="text-muted-foreground ms-1">
                    ({item.startDate} – {item.endDate})
                  </span>
                )}
              </span>
              <span>{item.subtotal?.toLocaleString() ?? 0} SAR</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 pt-3 border-t space-y-1 text-sm">
          <div className="flex justify-between">
            <span>{t('cart.subtotal')}</span>
            <span>{subtotal.toLocaleString()} SAR</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-green-600 dark:text-green-400">
              <span>{t('cart.discount')}</span>
              <span>-{discountAmount.toLocaleString()} SAR</span>
            </div>
          )}
          <div className="flex justify-between font-semibold">
            <span>{t('cart.total')}</span>
            <span>{total.toLocaleString()} SAR</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="font-semibold mb-3">{t('checkout.contactSummary')}</h2>
        <p className="text-sm">{details.name}</p>
        <p className="text-sm text-muted-foreground" dir="ltr">
          {details.email}
        </p>
        <p className="text-sm text-muted-foreground" dir="ltr">
          {details.phone}
        </p>
        <p className="text-sm mt-2">
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
        <PriceLockNotice
          lockedAt={lockedAt}
          onExpired={() => setLockExpired(true)}
        />
      )}

      <div className="flex items-start gap-2">
        <Checkbox
          id="terms"
          checked={termsAccepted}
          onCheckedChange={(v) => setTermsAccepted(v === true)}
        />
        <label htmlFor="terms" className="text-sm leading-none cursor-pointer">
          {t('checkout.termsAccept')}{' '}
          <Link href="/policies" className="text-primary underline" target="_blank" rel="noopener">
            {t('checkout.termsLink')}
          </Link>
        </label>
      </div>

      <Button
        size="lg"
        className="w-full"
        disabled={!canPay}
        onClick={handlePayNow}
      >
        {t('checkout.payNow')} – {total.toLocaleString()} SAR
      </Button>
    </div>
  )
}
