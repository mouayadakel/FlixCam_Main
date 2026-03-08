/**
 * Cart page (Phase 3.1): list, summary, coupon.
 * Checkout steps expand below when user clicks "إتمام الطلب" (same-page flow).
 * CartStudioSync reads ?studio=&date=&start=&duration=&package=&addOn= and adds studio to cart.
 */

'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useLocale } from '@/hooks/use-locale'
import { CartList } from '@/components/features/cart/cart-list'
import { CartSummary } from '@/components/features/cart/cart-summary'
import { CouponField } from '@/components/features/cart/coupon-field'
import { CartStudioSync } from '@/components/features/cart/cart-studio-sync'
import { useCartStore } from '@/lib/stores/cart.store'
import { useCheckoutStore } from '@/lib/stores/checkout.store'
import { Stepper } from '@/components/ui/stepper'
import { CheckoutStepReceiver } from '@/components/features/checkout/checkout-step-receiver'
import { CheckoutStepReviewPay } from '@/components/features/checkout/checkout-step-review-pay'

export default function CartPage() {
  const { t } = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const [showCheckoutSteps, setShowCheckoutSteps] = useState(false)
  const [profileChecked, setProfileChecked] = useState(false)
  const [profileComplete, setProfileComplete] = useState(false)
  const checkoutFormRef = useRef<HTMLDivElement>(null)

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
  const step = useCheckoutStore((s) => s.step)
  const setStep = useCheckoutStore((s) => s.setStep)

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  useEffect(() => {
    const expand = searchParams?.get('expandCheckout') === '1'
    if (
      expand &&
      items.length > 0 &&
      status === 'authenticated' &&
      profileChecked &&
      profileComplete
    ) {
      setStep(1)
      setShowCheckoutSteps(true)
    }
  }, [searchParams, items.length, status, profileChecked, profileComplete, setStep])

  useEffect(() => {
    if (showCheckoutSteps && checkoutFormRef.current) {
      checkoutFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [showCheckoutSteps])

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) {
      setProfileChecked(true)
      return
    }
    let cancelled = false
    fetch('/api/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((me: { name?: string | null; phone?: string | null } | null) => {
        if (cancelled) return
        setProfileChecked(true)
        const complete = !!(me?.name?.trim() && me?.phone?.trim())
        setProfileComplete(complete)
      })
      .catch(() => setProfileChecked(true))
    return () => {
      cancelled = true
    }
  }, [status, session?.user?.id])

  const handleStartCheckout = useCallback(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login?callbackUrl=/cart?expandCheckout=1')
      return
    }
    if (!profileChecked) return
    if (!profileComplete) {
      router.push('/portal/profile?complete=true&returnTo=/cart?expandCheckout=1')
      return
    }
    setStep(1)
    setShowCheckoutSteps(true)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        checkoutFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    })
  }, [status, session, profileChecked, profileComplete, router])

  return (
    <main className="container px-4 py-8 pb-24 lg:pb-8">
      <CartStudioSync />
      {showCheckoutSteps && status === 'authenticated' && profileComplete && (
        <div className="mb-8">
          <Stepper
            steps={[
              { id: 'receiver', label: t('checkout.stepReceiver') },
              { id: 'review', label: t('checkout.stepReviewPay') },
            ]}
            currentStep={step === 1 ? 0 : 1}
            className="sticky top-0 z-10 -mx-4 bg-background px-4 pb-4 pt-2 lg:static lg:mx-0 lg:rounded-xl lg:border lg:border-border-light lg:bg-card lg:p-4 lg:shadow-sm"
            onStepClick={(idx) => {
              if (idx < (step === 1 ? 0 : 1)) setStep((idx + 1) as 1 | 2)
            }}
          />
        </div>
      )}
      <h1 className="mb-6 text-2xl font-bold">{t('cart.title')}</h1>
      {showCheckoutSteps && status === 'authenticated' && profileComplete ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="min-w-0 space-y-8 lg:col-span-2">
            <CartList onStartCheckout={handleStartCheckout} showSummary={false} />
            <div
              ref={checkoutFormRef}
              className="scroll-mt-20 border-t pt-8"
              tabIndex={-1}
              aria-label={t('checkout.sectionRentalInfo')}
            >
              <section>
                <h2 className="mb-4 text-lg font-semibold">{t('checkout.sectionRentalInfo')}</h2>
                {step === 1 && <CheckoutStepReceiver onSuccess={() => setStep(2)} />}
              </section>
              {step === 2 && (
                <section className="mt-8">
                  <h2 className="mb-4 text-lg font-semibold">{t('checkout.sectionPayment')}</h2>
                  <CheckoutStepReviewPay />
                </section>
              )}
            </div>
          </div>
          <div className="hidden max-h-[calc(100vh-8rem)] space-y-4 overflow-y-auto lg:sticky lg:top-24 lg:block lg:self-start">
            <CouponField
              appliedCode={couponCode}
              onApply={applyCoupon}
              onRemove={removeCoupon}
              error={cartError}
            />
            <CartSummary
              items={items}
              subtotal={subtotal}
              discountAmount={discountAmount}
              total={total}
              itemCount={items.length}
              onStartCheckout={handleStartCheckout}
            />
          </div>
        </div>
      ) : (
        <CartList onStartCheckout={handleStartCheckout} />
      )}
    </main>
  )
}
