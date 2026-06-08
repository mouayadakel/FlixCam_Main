/**
 * Checkout Step 3: Review & Pay – redesigned to match payment spec.
 */

'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '@/hooks/use-locale'
import { EMBED_LTR } from '@/lib/i18n/bidi'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/lib/stores/cart.store'
import { useCheckoutStore } from '@/lib/stores/checkout.store'
import { PriceLockNotice } from './price-lock-notice'
import { InlineTapPayment } from './inline-tap-payment'
import { InlineMoyasarPayment } from './inline-moyasar-payment'
import { CheckoutProgressHeader } from './checkout-progress-header'
import { CheckoutPaymentMethodOption } from './checkout-payment-method-option'
import { CheckoutBookingSummaryCard } from './checkout-booking-summary-card'
import { formatSar as formatSarAmount } from '@/lib/utils/format.utils'
import { useVatRate } from '@/hooks/use-vat-rate'
import { useCheckoutDeposit } from '@/hooks/use-checkout-deposit'

interface AvailableGateway {
  slug: string
  displayName: string
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

type PaymentOption = 'moyasar_card' | 'moyasar_mada' | 'tabby' | 'tamara'

export function CheckoutStepReviewPay() {
  const { t, locale } = useLocale()
  const [lockedAt, setLockedAt] = useState<Date | null>(null)
  const [lockTtlMinutes, setLockTtlMinutes] = useState(120)
  const [lockExpired, setLockExpired] = useState(false)
  const [lockLoading, setLockLoading] = useState(true)
  const [payError, setPayError] = useState<string | null>(null)
  const [availableGateways, setAvailableGateways] = useState<AvailableGateway[]>([])
  const [selectedPaymentOption, setSelectedPaymentOption] = useState<PaymentOption>('moyasar_card')
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const smsConfirmationOptIn = useCheckoutStore((s) => s.smsConfirmationOptIn)
  const setSmsConfirmationOptIn = useCheckoutStore((s) => s.setSmsConfirmationOptIn)
  const whatsappConfirmationOptIn = useCheckoutStore((s) => s.whatsappConfirmationOptIn)
  const setWhatsappConfirmationOptIn = useCheckoutStore((s) => s.setWhatsappConfirmationOptIn)
  const [couponCodeInput, setCouponCodeInput] = useState('')
  const [couponFeedback, setCouponFeedback] = useState<string | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)

  const {
    items,
    subtotal,
    discountAmount,
    total,
    couponCode,
    fetchCart,
    applyCoupon,
    removeCoupon,
    error: cartError,
  } = useCartStore()
  const details = useCheckoutStore((s) => s.details)
  const setStep = useCheckoutStore((s) => s.setStep)
  const formValues = useCheckoutStore((s) => s.formValues)
  const setPaymentMethod = useCheckoutStore((s) => s.setPaymentMethod)

  const { vatRate } = useVatRate()
  const { depositAmount } = useCheckoutDeposit(items.length > 0)

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  useEffect(() => {
    fetch('/api/checkout/available-gateways')
      .then((r) => r.json())
      .then((data) => setAvailableGateways(data.gateways || []))
      .catch(() => setAvailableGateways([]))
  }, [])

  useEffect(() => {
    if (couponCode) {
      setCouponCodeInput(couponCode)
    }
  }, [couponCode])

  useEffect(() => {
    const availableSlugs = new Set(availableGateways.map((gateway) => gateway.slug))
    if (selectedPaymentOption === 'moyasar_card' || selectedPaymentOption === 'moyasar_mada') {
      setPaymentMethod(availableSlugs.has('moyasar') ? 'moyasar' : availableGateways[0]?.slug || 'tap')
      return
    }

    if (availableSlugs.has(selectedPaymentOption)) {
      setPaymentMethod(selectedPaymentOption)
      return
    }

    if (availableSlugs.has('tap')) {
      setPaymentMethod('tap')
      return
    }

    setPaymentMethod(availableGateways[0]?.slug || 'tap')
  }, [availableGateways, selectedPaymentOption, setPaymentMethod])

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

  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim()) return
    setCouponLoading(true)
    setCouponFeedback(null)
    try {
      await applyCoupon(couponCodeInput.trim())
      setCouponFeedback('Coupon applied successfully')
    } catch (error) {
      setCouponFeedback(error instanceof Error ? error.message : 'Failed to apply coupon')
    } finally {
      setCouponLoading(false)
    }
  }

  const vatAmount = Math.round((subtotal - discountAmount) * vatRate * 100) / 100
  // `total` from cart = subtotal − discount (ex-VAT). Amount to collect matches OrderSummary: net + VAT.
  const totalWithVat = Math.round((total + vatAmount) * 100) / 100

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

  const payButtonClass = ''
  const availableSlugs = new Set(availableGateways.map((gateway) => gateway.slug))
  const selectedGateway =
    selectedPaymentOption === 'moyasar_card' || selectedPaymentOption === 'moyasar_mada'
      ? availableSlugs.has('moyasar')
        ? 'moyasar'
        : availableSlugs.has('tap')
          ? 'tap'
          : availableGateways[0]?.slug || 'tap'
      : availableSlugs.has(selectedPaymentOption)
        ? selectedPaymentOption
        : availableSlugs.has('tap')
          ? 'tap'
          : availableGateways[0]?.slug || 'tap'

  return (
    <div className="space-y-6 bg-[#F9FAFB] pb-24 lg:pb-0">
      <CheckoutProgressHeader />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className="space-y-6 lg:col-span-3">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#111827]">Select Payment Option</h2>
              <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setStep(1)}>
                {t('checkout.editReceiver')}
              </Button>
            </div>
            <p className="mb-4 text-sm text-[#6B7280]">All transactions are secure and encrypted</p>

            <div className="space-y-3">
              <CheckoutPaymentMethodOption
                id="moyasar_card"
                label="Credit Card (Moyasar)"
                helper="Secure card payment"
                logos={[
                  { src: '/payment-logos/visa.svg', alt: 'Visa' },
                  { src: '/payment-logos/mastercard.svg', alt: 'Mastercard' },
                ]}
                checked={selectedPaymentOption === 'moyasar_card'}
                onChange={() => setSelectedPaymentOption('moyasar_card')}
              />
              <CheckoutPaymentMethodOption
                id="moyasar_mada"
                label="Mada (ميسر)"
                helper="Saudi local cards"
                logos={[{ src: '/payment-logos/mada.svg', alt: 'Mada' }]}
                checked={selectedPaymentOption === 'moyasar_mada'}
                onChange={() => setSelectedPaymentOption('moyasar_mada')}
              />
              <CheckoutPaymentMethodOption
                id="tabby"
                label="Tabby (Split in 4)"
                helper={availableSlugs.has('tabby') ? 'Pay later with Tabby' : 'Via available gateway'}
                logos={[{ src: '/payment-logos/tabby.svg', alt: 'Tabby' }]}
                checked={selectedPaymentOption === 'tabby'}
                onChange={() => setSelectedPaymentOption('tabby')}
              />
              <CheckoutPaymentMethodOption
                id="tamara"
                label="Tamara (Split in 3/4)"
                helper={availableSlugs.has('tamara') ? 'Pay later with Tamara' : 'Via available gateway'}
                logos={[{ src: '/payment-logos/tamara.svg', alt: 'Tamara' }]}
                checked={selectedPaymentOption === 'tamara'}
                onChange={() => setSelectedPaymentOption('tamara')}
              />
            </div>

            {(selectedPaymentOption === 'moyasar_card' || selectedPaymentOption === 'moyasar_mada') && (
              <div className="mt-4 rounded-xl border border-[#E5E7EB] bg-[#FBFBFF] p-4">
                <div className={payButtonClass}>
                  <InlineMoyasarPayment
                    totalAmount={totalWithVat}
                    onError={setPayError}
                    canSubmit={agreeToTerms}
                    blockedSubmitMessage={t('checkout.legalRequired')}
                  />
                </div>
              </div>
            )}

            {(selectedPaymentOption === 'tabby' || selectedPaymentOption === 'tamara') && (
              <div className="mt-4">
                <InlineTapPayment
                  totalAmount={totalWithVat}
                  onError={setPayError}
                  gateway={selectedGateway}
                  className={payButtonClass}
                  canSubmit={agreeToTerms}
                  blockedSubmitMessage={t('checkout.legalRequired')}
                />
              </div>
            )}

            <div className="mt-5 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
              <p className="text-sm font-medium text-[#111827]">{receiverName}</p>
              <p className="text-sm text-[#6B7280]" dir={EMBED_LTR}>
                {details.phone}
              </p>
              <p className="text-sm text-[#6B7280]">
                {details.deliveryMethod === 'PICKUP'
                  ? t('checkout.deliveryPickup')
                  : t('checkout.deliveryDelivery')}
                {details.deliveryAddress && (
                  <span>
                    {' - '}
                    {details.deliveryAddress.city}, {details.deliveryAddress.street}
                  </span>
                )}
              </p>
            </div>

            {!lockLoading && (
              <div className="mt-4">
                <PriceLockNotice
                  lockedAt={lockedAt}
                  lockTtlSeconds={lockTtlMinutes * 60}
                  onExpired={() => setLockExpired(true)}
                  onRefresh={lockPrice}
                />
              </div>
            )}

            <label className="mt-4 flex items-start gap-2 text-sm text-[#6B7280]">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-[#D1D5DB] accent-[#5A31F4]"
                checked={agreeToTerms}
                onChange={(event) => setAgreeToTerms(event.target.checked)}
              />
              <span>By clicking this, I agree to Terms &amp; Conditions and Privacy Policy</span>
            </label>

            <label className="mt-3 flex items-start gap-2 text-sm text-[#6B7280]">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-[#D1D5DB] accent-[#5A31F4]"
                checked={smsConfirmationOptIn}
                onChange={(event) => setSmsConfirmationOptIn(event.target.checked)}
              />
              <span>{t('checkout.smsConfirmationOptIn')}</span>
            </label>

            <label className="mt-3 flex items-start gap-2 text-sm text-[#6B7280]">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-[#D1D5DB] accent-[#5A31F4]"
                checked={whatsappConfirmationOptIn}
                onChange={(event) => setWhatsappConfirmationOptIn(event.target.checked)}
              />
              <span>{t('checkout.whatsappConfirmationOptIn')}</span>
            </label>

            {payError && (
              <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {payError}
              </p>
            )}

            {availableGateways.length === 0 && (
              <p className="mt-4 text-sm text-amber-600">
                Payment gateways are temporarily unavailable. Please try again.
              </p>
            )}
          </div>
        </section>

        <aside className="lg:col-span-2">
          <CheckoutBookingSummaryCard
            items={items}
            subtotal={subtotal}
            tax={vatAmount}
            total={totalWithVat}
            depositAmount={depositAmount}
            couponCodeInput={couponCodeInput}
            onCouponCodeInputChange={setCouponCodeInput}
            onApplyCoupon={handleApplyCoupon}
            onClearCoupon={() => {
              void removeCoupon()
            }}
            hasAppliedCoupon={Boolean(couponCode)}
            couponFeedback={couponFeedback || cartError}
            isApplyingCoupon={couponLoading}
            formatSar={(v) => formatSarAmount(v, locale)}
            formatDate={formatDate}
            itemTypeLabels={ITEM_TYPE_LABELS}
          />
        </aside>
      </div>

      {lockExpired && (
        <p className="text-sm text-amber-600">
          Price hold expired. Refresh your payment session before continuing.
        </p>
      )}
    </div>
  )
}
