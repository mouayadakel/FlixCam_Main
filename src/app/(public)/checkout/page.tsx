/**
 * Checkout page – 3 steps: Receiver & Fulfillment, Add-ons, Review & Pay.
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/lib/stores/cart.store'
import { useCheckoutStore } from '@/lib/stores/checkout.store'
import { Stepper } from '@/components/ui/stepper'
import { OrderSummary } from '@/components/features/checkout/order-summary'
import { CheckoutStepReceiver } from '@/components/features/checkout/checkout-step-receiver'
import { CheckoutStepAddons } from '@/components/features/checkout/checkout-step-addons'
import { CheckoutStepReviewPay } from '@/components/features/checkout/checkout-step-review-pay'

const STEP_LABELS = [
  { id: 'receiver', labelKey: 'checkout.stepReceiver' },
  { id: 'addons', labelKey: 'checkout.stepAddons' },
  { id: 'review', labelKey: 'checkout.stepReviewPay' },
]

export default function CheckoutPage() {
  const { t } = useLocale()
  const router = useRouter()
  const { data: session, status } = useSession()
  const items = useCartStore((s) => s.items)
  const fetchCart = useCartStore((s) => s.fetchCart)
  const step = useCheckoutStore((s) => s.step)
  const setStep = useCheckoutStore((s) => s.setStep)
  const holdExpiresAt = useCheckoutStore((s) => s.holdExpiresAt)
  const [profileChecked, setProfileChecked] = useState(false)
  const [profileComplete, setProfileComplete] = useState(false)

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  useEffect(() => {
    if (status === 'loading') return
    if (items.length === 0) {
      const timer = setTimeout(() => {
        if (useCartStore.getState().items.length === 0) router.replace('/cart')
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [items.length, status, router])

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
        if (!complete) router.replace(`/portal/profile?complete=true`)
      })
      .catch(() => setProfileChecked(true))
    return () => {
      cancelled = true
    }
  }, [status, session?.user?.id, router])

  const stepsWithLabels = STEP_LABELS.map((s) => ({ id: s.id, label: t(s.labelKey) }))
  const currentStepIndex = Math.max(0, Math.min(step - 1, stepsWithLabels.length - 1))
  const handleStepClick = (index: number) => setStep((index + 1) as 1 | 2 | 3)

  if (status === 'loading') {
    return (
      <main className="container mx-auto px-4 py-12">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="container mx-auto max-w-xl px-4 py-12">
        <h1 className="mb-6 text-2xl font-bold">{t('checkout.title')}</h1>
        <p className="text-muted-foreground">{t('checkout.loginRequired')}</p>
        <Button className="mt-4" onClick={() => router.push('/auth/signin?callbackUrl=/checkout')}>
          {t('auth.signIn')}
        </Button>
      </main>
    )
  }

  if (!profileChecked || !profileComplete) {
    return (
      <main className="container mx-auto max-w-xl px-4 py-12">
        <p className="text-muted-foreground">{t('common.loading')}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t('checkout.completeProfile')}</p>
      </main>
    )
  }

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8 pb-24 lg:pb-8">
      <h1 className="mb-6 text-2xl font-bold">{t('checkout.title')}</h1>
      <Stepper
        steps={stepsWithLabels}
        currentStep={currentStepIndex}
        onStepClick={handleStepClick}
        className="mb-6 lg:mb-8"
      />
      {/* Mobile: collapsible order summary */}
      <details className="mb-4 rounded-lg border bg-card lg:hidden">
        <summary className="cursor-pointer list-none px-4 py-3 font-medium">
          {t('checkout.orderSummary')}
        </summary>
        <div className="border-t px-4 py-3">
          <OrderSummary holdExpiresAt={holdExpiresAt} />
        </div>
      </details>
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          {step === 1 && <CheckoutStepReceiver onSuccess={() => setStep(2)} />}
          {step === 2 && <CheckoutStepAddons onSuccess={() => setStep(3)} />}
          {step === 3 && <CheckoutStepReviewPay />}
        </div>
        <div className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          <OrderSummary holdExpiresAt={holdExpiresAt} />
        </div>
      </div>
    </main>
  )
}
