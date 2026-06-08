/**
 * Cart page (Phase 3.1): list, summary, coupon.
 * Single-page flow: cart items + renter information on the same page.
 * CartStudioSync reads ?studio=&date=&start=&duration=&package=&addOn= and adds studio to cart.
 */

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useLocale } from '@/hooks/use-locale'
import { CartUrlSync } from '@/components/features/cart/cart-studio-sync'
import { ShoppingCartList } from '@/components/features/cart/shopping-cart-list'
import { useCartStore } from '@/lib/stores/cart.store'
import { CheckoutStepReceiver } from '@/components/features/checkout/checkout-step-receiver'
import { CheckoutPaymentMethodOption } from '@/components/features/checkout/checkout-payment-method-option'
import { CheckoutBookingSummaryCard } from '@/components/features/checkout/checkout-booking-summary-card'
import { Button } from '@/components/ui/button'
import { InlineMoyasarPayment } from '@/components/features/checkout/inline-moyasar-payment'
import { InlineTapPayment } from '@/components/features/checkout/inline-tap-payment'
import { useCheckoutStore } from '@/lib/stores/checkout.store'
import { cn } from '@/lib/utils'
import { payableGrandTotalSar } from '@/lib/utils/checkout-totals'
import { useVatRate } from '@/hooks/use-vat-rate'
import { useCheckoutDeposit } from '@/hooks/use-checkout-deposit'
import { formatSar } from '@/lib/utils/format.utils'

export default function CartPage() {
  const { t, locale, dir, isRtl } = useLocale()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [payError, setPayError] = useState<string | null>(null)
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [selectedPaymentOption, setSelectedPaymentOption] = useState<
    'credit_card' | 'tabby' | 'tamara'
  >('credit_card')
  const [availableGateways, setAvailableGateways] = useState<Array<{ slug: string; displayName: string }>>([])
  const [couponCodeInput, setCouponCodeInput] = useState('')
  const [couponFeedback, setCouponFeedback] = useState<string | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const setPaymentMethod = useCheckoutStore((s) => s.setPaymentMethod)
  const smsConfirmationOptIn = useCheckoutStore((s) => s.smsConfirmationOptIn)
  const setSmsConfirmationOptIn = useCheckoutStore((s) => s.setSmsConfirmationOptIn)
  const whatsappConfirmationOptIn = useCheckoutStore((s) => s.whatsappConfirmationOptIn)
  const setWhatsappConfirmationOptIn = useCheckoutStore((s) => s.setWhatsappConfirmationOptIn)

  const {
    id: cartId,
    items,
    subtotal,
    discountAmount,
    total,
    couponCode,
    fetchCart,
    applyCoupon,
    removeCoupon,
    updateItem,
    removeItem,
    error: cartError,
    isLoading: cartLoading,
  } = useCartStore()

  const { vatRate } = useVatRate()
  const { depositAmount } = useCheckoutDeposit(items.length > 0)

  const dlCartViewSig = useRef('')
  const dlBeginCheckoutSent = useRef(false)
  const dlLastPaymentKey = useRef('')

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  useEffect(() => {
    fetch('/api/checkout/available-gateways')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { gateways?: Array<{ slug: string; displayName: string }> } | null) => {
        setAvailableGateways(data?.gateways ?? [])
      })
      .catch(() => setAvailableGateways([]))
  }, [])

  useEffect(() => {
    if (couponCode) setCouponCodeInput(couponCode)
  }, [couponCode])

  useEffect(() => {
    const slugs = new Set(availableGateways.map((gateway) => gateway.slug))
    if (selectedPaymentOption === 'credit_card') {
      setPaymentMethod(slugs.has('moyasar') ? 'moyasar' : availableGateways[0]?.slug || 'tap')
      return
    }
    if (selectedPaymentOption === 'tabby') {
      setPaymentMethod(slugs.has('tabby') ? 'tabby' : availableGateways[0]?.slug || 'tap')
      return
    }
    if (selectedPaymentOption === 'tamara') {
      setPaymentMethod(slugs.has('tamara') ? 'tamara' : availableGateways[0]?.slug || 'tap')
    }
  }, [availableGateways, selectedPaymentOption, setPaymentMethod])

  useEffect(() => {
    const slugs = new Set(availableGateways.map((gateway) => gateway.slug))
    const isSelectedAvailable =
      (selectedPaymentOption === 'credit_card' && (slugs.has('moyasar') || slugs.has('tap'))) ||
      (selectedPaymentOption === 'tabby' && slugs.has('tabby')) ||
      (selectedPaymentOption === 'tamara' && slugs.has('tamara'))
    if (isSelectedAvailable) return
    if (slugs.has('moyasar')) {
      setSelectedPaymentOption('credit_card')
      return
    }
    if (slugs.has('tap')) {
      setSelectedPaymentOption('credit_card')
      return
    }
    if (slugs.has('tabby')) {
      setSelectedPaymentOption('tabby')
      return
    }
    if (slugs.has('tamara')) {
      setSelectedPaymentOption('tamara')
    }
  }, [availableGateways, selectedPaymentOption])

  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim()) return
    setCouponLoading(true)
    setCouponFeedback(null)
    try {
      await applyCoupon(couponCodeInput.trim())
      setCouponFeedback(locale === 'ar' ? 'تم تطبيق القسيمة بنجاح' : 'Coupon applied successfully')
    } catch (error) {
      setCouponFeedback(error instanceof Error ? error.message : t('cart.invalidCoupon'))
    } finally {
      setCouponLoading(false)
    }
  }

  const vatAmount = useMemo(
    () => Math.round((subtotal - discountAmount) * vatRate * 100) / 100,
    [subtotal, discountAmount, vatRate]
  )
  /** `total` from store is ex-VAT; grand total includes VAT (same as server payment). */
  const totalWithVat = useMemo(() => payableGrandTotalSar(total, vatRate), [total, vatRate])
  const slugs = useMemo(() => new Set(availableGateways.map((gateway) => gateway.slug)), [availableGateways])
  const selectedGateway =
    selectedPaymentOption === 'credit_card'
      ? slugs.has('moyasar')
        ? 'moyasar'
        : availableGateways[0]?.slug || 'tap'
      : selectedPaymentOption === 'tabby'
        ? slugs.has('tabby')
          ? 'tabby'
          : availableGateways[0]?.slug || 'tap'
        : slugs.has('tamara')
          ? 'tamara'
          : availableGateways[0]?.slug || 'tap'

  useEffect(() => {
    if (!items.length) {
      dlBeginCheckoutSent.current = false
    }
  }, [items.length])

  useEffect(() => {
    if (cartLoading || !items.length) return
    const sig = `${cartId ?? ''}:${items.map((item) => `${item.id}:${item.quantity}`).join('|')}:${total}`
    if (dlCartViewSig.current === sig) return
    dlCartViewSig.current = sig
    void import('@/lib/analytics/ecommerce-data-layer').then(({ pushViewCart }) => {
      pushViewCart(items, total)
    })
  }, [cartLoading, cartId, items, total])

  useEffect(() => {
    if (status !== 'authenticated' || cartLoading || !items.length) return
    if (dlBeginCheckoutSent.current) return
    dlBeginCheckoutSent.current = true
    void import('@/lib/analytics/ecommerce-data-layer').then(({ pushBeginCheckout }) => {
      pushBeginCheckout(items, total, couponCode)
    })
  }, [status, cartLoading, items, total, couponCode])

  useEffect(() => {
    if (status !== 'authenticated' || cartLoading || !items.length) return
    const key = `${selectedGateway}:${selectedPaymentOption}`
    if (dlLastPaymentKey.current === key) return
    dlLastPaymentKey.current = key
    const { items: li, total: lt, couponCode: coupon } = useCartStore.getState()
    if (!li.length) return
    void import('@/lib/analytics/ecommerce-data-layer').then(({ pushAddPaymentInfo }) => {
      pushAddPaymentInfo({
        cartLines: li,
        valueExVat: lt,
        paymentType: selectedGateway,
        coupon,
      })
    })
  }, [status, cartLoading, items.length, selectedGateway, selectedPaymentOption])

  const numberingLocale = locale === 'ar' ? 'ar-SA' : 'en-SA'
  const dateLocale = locale === 'ar' ? 'ar-SA' : 'en-SA'
  const summaryOnRight = isRtl

  return (
    <>
    <main dir={dir} className="min-h-screen bg-[#F3F4F6] py-6 lg:py-10">
      <CartUrlSync />
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 p-4 lg:flex-row lg:p-8">
        <div
          className={cn(
            'flex w-full flex-col gap-6 lg:min-w-0 lg:flex-1',
            summaryOnRight
              ? 'lg:pr-[min(28rem,calc(40vw+1.5rem))] lg:pl-0'
              : 'lg:pl-[min(28rem,calc(40vw+1.5rem))] lg:pr-0',
          )}
        >
          <ShoppingCartList
            items={items}
            locale={locale}
            subtotal={subtotal}
            discountAmount={discountAmount}
            taxAmount={vatAmount}
            finalTotal={totalWithVat}
            onUpdateQuantity={(itemId, quantity) => {
              void updateItem(itemId, { quantity })
            }}
            onUpdateDates={(itemId, startDate, endDate) => {
              void updateItem(itemId, { startDate, endDate })
            }}
            onRemove={(itemId) => {
              void removeItem(itemId)
            }}
          />
          {items.length === 0 ? (
            <section className="rounded-2xl border border-[#E5E7EB] bg-white p-8 text-center shadow-sm">
              <p className="text-lg font-semibold text-[#111827]">{t('cart.empty')}</p>
              <Button className="mt-4" onClick={() => router.push('/equipment')}>
                {t('cart.continueShopping')}
              </Button>
            </section>
          ) : (
          <>
          <section className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <h1 className="mb-4 text-2xl font-bold text-[#111827]">{t('cart.rentalDetails')}</h1>
            {!session && status !== 'loading' && (
              <p className="mb-4 text-sm text-[#6B7280]">
                {t('cart.guestCheckoutHint')}{' '}
                <button
                  type="button"
                  className="font-semibold text-[#5A31F4] hover:underline"
                  onClick={() => router.push('/login?callbackUrl=/cart')}
                >
                  {t('cart.loginLink')}
                </button>
              </p>
            )}
            <CheckoutStepReceiver showContinueButton={false} />
          </section>

          <section id="payment-section" className="mt-6 rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <label className="mb-4 flex items-start gap-2 text-sm text-[#111827]">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-[#E5E7EB] accent-[#5A31F4]"
                checked={agreeToTerms}
                onChange={(event) => setAgreeToTerms(event.target.checked)}
              />
              <span>{t('cart.agreeTerms')}</span>
            </label>
            <label className="mb-3 flex items-start gap-2 text-sm text-[#6B7280]">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-[#E5E7EB] accent-[#5A31F4]"
                checked={smsConfirmationOptIn}
                onChange={(event) => setSmsConfirmationOptIn(event.target.checked)}
              />
              <span>{t('checkout.smsConfirmationOptIn')}</span>
            </label>
            <label className="mb-4 flex items-start gap-2 text-sm text-[#6B7280]">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-[#E5E7EB] accent-[#5A31F4]"
                checked={whatsappConfirmationOptIn}
                onChange={(event) => setWhatsappConfirmationOptIn(event.target.checked)}
              />
              <span>{t('checkout.whatsappConfirmationOptIn')}</span>
            </label>
            <h2 className="mb-4 text-xl font-bold text-[#111827]">{t('cart.paymentOptions')}</h2>
            <div className="space-y-3">
              {(slugs.has('moyasar') || slugs.has('tap')) && (
                <CheckoutPaymentMethodOption
                  id="credit_card"
                  label={t('cart.creditCard')}
                  helper={slugs.has('moyasar') ? t('cart.paymentHelperMoyasar') : t('cart.paymentHelperTap')}
                  logos={[
                    { src: '/payment-logos/visa.svg', alt: 'Visa' },
                    { src: '/payment-logos/mastercard.svg', alt: 'Mastercard' },
                    { src: '/payment-logos/mada.svg', alt: 'Mada' },
                  ]}
                  checked={selectedPaymentOption === 'credit_card'}
                  onChange={() => setSelectedPaymentOption('credit_card')}
                />
              )}
              {slugs.has('tabby') && (
                <CheckoutPaymentMethodOption
                  id="tabby"
                  label={t('cart.paymentTabby')}
                  helper={t('cart.paymentHelperTabby')}
                  logos={[{ src: '/payment-logos/tabby.svg', alt: 'Tabby' }]}
                  checked={selectedPaymentOption === 'tabby'}
                  onChange={() => setSelectedPaymentOption('tabby')}
                />
              )}
              {slugs.has('tamara') && (
                <CheckoutPaymentMethodOption
                  id="tamara"
                  label={t('cart.paymentTamara')}
                  helper={t('cart.paymentHelperTamara')}
                  logos={[{ src: '/payment-logos/tamara.svg', alt: 'Tamara' }]}
                  checked={selectedPaymentOption === 'tamara'}
                  onChange={() => setSelectedPaymentOption('tamara')}
                />
              )}
            </div>
            {!slugs.has('moyasar') &&
              !slugs.has('tap') &&
              !slugs.has('tabby') &&
              !slugs.has('tamara') && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                  {t('cart.noPaymentGateways')}
                </p>
              )}

            <div className={`mt-4 ${agreeToTerms ? '' : 'opacity-60'}`}>
              {selectedPaymentOption === 'credit_card' && selectedGateway === 'moyasar' ? (
                <InlineMoyasarPayment
                  totalAmount={totalWithVat}
                  onError={setPayError}
                  canSubmit={agreeToTerms}
                  blockedSubmitMessage={t('cart.termsRequired')}
                />
              ) : (
                <InlineTapPayment
                  totalAmount={totalWithVat}
                  onError={setPayError}
                  gateway={selectedGateway}
                  canSubmit={agreeToTerms}
                  blockedSubmitMessage={t('cart.termsRequired')}
                />
              )}
            </div>

            {payError && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {payError}
              </p>
            )}
          </section>
          </>
          )}
        </div>

        <aside
          className={cn(
            'w-full lg:fixed lg:top-1/2 lg:z-40 lg:w-[min(27rem,calc(100vw-2rem))] lg:max-h-[88vh] lg:-translate-y-1/2 lg:overflow-y-auto lg:overscroll-contain',
            summaryOnRight ? 'lg:right-4 lg:left-auto' : 'lg:left-4 lg:right-auto',
          )}
        >
          <div className="max-lg:sticky max-lg:top-6">
            <CheckoutBookingSummaryCard
              items={items}
              subtotal={subtotal}
              discountAmount={discountAmount}
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
              formatSar={(value) => formatSar(value, numberingLocale)}
              formatDate={(value) => {
                if (!value) return '—'
                const d = typeof value === 'string' ? new Date(value) : value
                return new Intl.DateTimeFormat(dateLocale, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                }).format(d)
              }}
              itemTypeLabels={{
                EQUIPMENT: t('common.typeEquipment'),
                STUDIO: t('common.typeStudio'),
                ADDON: t('common.typeAddon'),
                PACKAGE: t('common.typePackage'),
                KIT: t('common.typeKit'),
              }}
            />
          </div>
        </aside>
      </div>
    </main>

      {/* Mobile sticky total bar – always visible while scrolling through checkout forms */}
      {items.length > 0 && (
        <div className="fixed bottom-[64px] start-0 end-0 z-40 flex items-center justify-between gap-4 border-t border-[#E5E7EB] bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.08)] backdrop-blur-md lg:hidden">
          <div className="flex-1">
            <span className="text-xs text-[#6B7280]">{t('cart.totalInclVat')}</span>
            <p className="text-lg font-bold text-[#111827]">{formatSar(totalWithVat, numberingLocale)}</p>
          </div>
          <button
            type="button"
            className="flex h-10 items-center justify-center rounded-xl bg-brand-primary px-6 font-semibold text-white shadow-glow transition-colors hover:bg-brand-primary/90 active:scale-95"
            onClick={() => {
              document.getElementById('payment-section')?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            {t('cart.proceedToPay')}
          </button>
        </div>
      )}
    </>
  )
}
