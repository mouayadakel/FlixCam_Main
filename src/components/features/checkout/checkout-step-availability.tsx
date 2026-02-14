/**
 * Checkout Step 2: Availability lock – per-item availability, create 15-min hold.
 */

'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/lib/stores/cart.store'
import { useCheckoutStore } from '@/lib/stores/checkout.store'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

interface CheckoutStepAvailabilityProps {
  onSuccess: () => void
}

export function CheckoutStepAvailability({ onSuccess }: CheckoutStepAvailabilityProps) {
  const { t } = useLocale()
  const items = useCartStore((s) => s.items)
  const dates = useCheckoutStore((s) => s.dates)
  const setHold = useCheckoutStore((s) => s.setHold)
  const holdExpiresAt = useCheckoutStore((s) => s.holdExpiresAt)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startDate = dates?.startDate ?? items[0]?.startDate
  const endDate = dates?.endDate ?? items[0]?.endDate

  const handleLockPrice = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/checkout/lock-price', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to lock price')
      if (data.lockedUntil) setHold(data.cartId ?? null, data.lockedUntil)
      onSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to lock price')
    } finally {
      setLoading(false)
    }
  }

  if (!startDate || !endDate) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
        <p>{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <p className="mb-4 text-sm text-text-muted">
        {t('checkout.startDate')}: {startDate} – {t('checkout.endDate')}: {endDate}
      </p>
      <ul className="mb-4 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between text-sm">
            <span>
              {item.itemType} × {item.quantity}
            </span>
            {item.isAvailable === true && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-4 w-4" /> {t('common.available')}
              </span>
            )}
            {item.isAvailable === false && (
              <span className="flex items-center gap-1 text-destructive">
                <XCircle className="h-4 w-4" /> {t('common.unavailable')}
              </span>
            )}
            {item.isAvailable === undefined && <span className="text-muted-foreground">—</span>}
          </li>
        ))}
      </ul>
      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
      <Button
        size="lg"
        className="w-full"
        disabled={loading || items.some((i) => i.isAvailable === false)}
        onClick={handleLockPrice}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : holdExpiresAt ? (
          t('common.next')
        ) : (
          t('checkout.priceLockNotice')
        )}
      </Button>
    </div>
  )
}
