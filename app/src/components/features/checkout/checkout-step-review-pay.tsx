/**
 * Checkout Step 3: Review & Pay – summary, promo code, price breakdown, payment gateway choice, pay.
 */

'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/lib/stores/cart.store'
import { useCheckoutStore } from '@/lib/stores/checkout.store'
import { PriceLockNotice } from './price-lock-notice'
import { InlineTapPayment } from './inline-tap-payment'

interface AvailableGateway {
  slug: string
  displayName: string
  sortOrder: number
}

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
  const [lockedAt, setLockedAt] = useState<Date | null>(null)
  const [lockTtlMinutes, setLockTtlMinutes] = useState(120)
  const [lockExpired, setLockExpired] = useState(false)
  const [lockLoading, setLockLoading] = useState(true)
  const [payError, setPayError] = useState<string | null>(null)
  const [availableGateways, setAvailableGateways] = useState<AvailableGateway[]>([])

  const { items, subtotal, discountAmount, total, fetchCart } = useCartStore()
  const details = useCheckoutStore((s) => s.details)
  const setStep = useCheckoutStore((s) => s.setStep)
  const formValues = useCheckoutStore((s) => s.formValues)
  const addons = useCheckoutStore((s) => s.addons)
  const paymentMethod = useCheckoutStore((s) => s.paymentMethod)
  const setPaymentMethod = useCheckoutStore((s) => s.setPaymentMethod)

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  useEffect(() => {
    fetch('/api/checkout/available-gateways')
      .then((r) => r.json())
      .then((data) => {
        const list = data.gateways || []
        setAvailableGateways(list)
        if (list.length === 1 && !paymentMethod) {
          setPaymentMethod(list[0].slug)
        } else if (list.length > 0 && !paymentMethod) {
          setPaymentMethod(list[0].slug)
        }
      })
      .catch(() => setAvailableGateways([]))
  }, [])

  const lockPrice = async () => {
    setLockLoading(true)
    try {
      const res = await fetch('/api/checkout/lock-price', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setLockedAt(new Date(data.lockedAt))
        setLockTtlMinutes(data.lockTtlMinutes ?? 120)
      }
    } finally {
      setLockLoading(false)
    }
  }

  useEffect(() => {
    lockPrice()
  }, [])

  const vatAmount = Math.round((subtotal - discountAmount) * VAT_RATE * 100) / 100

  if (!details) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
        <p>{t('checkout.completePrevious')}</p>
        <Button variant="link" onClick={() => setStep(1)}>
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
    <div className="space-y-6 pb-24 lg:pb-0">
      <div className="rounded-lg border bg-card p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{t('checkout.receiverSummary')}</h2>
          <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setStep(1)}>
            {t('checkout.editReceiver')}
          </Button>
        </div>
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
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{t('checkout.orderSummary')}</h2>
          <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setStep(2)}>
            {t('checkout.editAddons')}
          </Button>
        </div>
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
        <PriceLockNotice
          lockedAt={lockedAt}
          lockTtlSeconds={lockTtlMinutes * 60}
          onExpired={() => setLockExpired(true)}
          onRefresh={lockPrice}
        />
      )}

      {availableGateways.length > 1 && (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-3 font-semibold">{t('checkout.sectionPayment')}</h3>
          <p className="mb-3 text-sm text-muted-foreground">
            {t('checkout.paymentMethods')}
          </p>
          <div className="flex flex-wrap gap-2">
            {availableGateways.map((gw) => (
              <button
                key={gw.slug}
                type="button"
                onClick={() => setPaymentMethod(gw.slug)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  paymentMethod === gw.slug
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:bg-muted'
                }`}
              >
                {gw.displayName}
              </button>
            ))}
          </div>
        </div>
      )}

      {payError && (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {payError}
        </p>
      )}

      <div className="fixed bottom-0 start-0 end-0 z-20 flex gap-3 border-t bg-background p-4 lg:static lg:border-0 lg:p-0">
        <Button variant="outline" size="lg" onClick={() => setStep(2)}>
          {t('common.back')}
        </Button>
        <div className="flex-1">
          <InlineTapPayment
            totalAmount={total}
            onError={setPayError}
            gateway={paymentMethod || undefined}
          />
        </div>
      </div>
    </div>
  )
}
