/**
 * Checkout Step 5: Final confirmation – summary, contact, submit to payment.
 */

'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/lib/stores/cart.store'
import { useCheckoutStore } from '@/lib/stores/checkout.store'
import { PriceLockNotice } from './price-lock-notice'
import { useState, useEffect } from 'react'

interface CheckoutStepConfirmProps {
  depositAmount?: number | null
}

export function CheckoutStepConfirm({ depositAmount }: CheckoutStepConfirmProps) {
  const { t } = useLocale()
  const router = useRouter()
  const items = useCartStore((s) => s.items)
  const total = useCartStore((s) => s.total)
  const details = useCheckoutStore((s) => s.details)
  const holdExpiresAt = useCheckoutStore((s) => s.holdExpiresAt)
  const [lockedAt, setLockedAt] = useState<Date | null>(null)
  const [lockExpired, setLockExpired] = useState(false)

  useEffect(() => {
    if (holdExpiresAt) setLockedAt(new Date(holdExpiresAt))
  }, [holdExpiresAt])

  const handlePayNow = () => {
    router.push('/payment')
  }

  const canPay = !!details && items.length > 0 && !lockExpired

  if (!details) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
        <p>Please complete the previous steps first.</p>
        <Button variant="link" onClick={() => router.push('/checkout')}>
          Back to checkout
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
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

      <PriceLockNotice lockedAt={lockedAt} onExpired={() => setLockExpired(true)} />

      <Button size="lg" className="w-full" disabled={!canPay} onClick={handlePayNow}>
        {t('checkout.payNow')} – {total.toLocaleString()} SAR
      </Button>
    </div>
  )
}
