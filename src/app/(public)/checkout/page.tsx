/**
 * Checkout page (Phase 3.3). 5 steps: Dates, Availability, Add-ons, Payment, Confirm.
 * Gate (step 0): profile completeness – see Phase 3.4.
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
import { CheckoutStepContact } from '@/components/features/checkout/checkout-step-contact'
import { CheckoutStepDates } from '@/components/features/checkout/checkout-step-dates'
import { CheckoutStepAvailability } from '@/components/features/checkout/checkout-step-availability'
import { CheckoutStepAddons } from '@/components/features/checkout/checkout-step-addons'
import { CheckoutStepReview } from '@/components/features/checkout/checkout-step-review'
import { CheckoutStepPayment } from '@/components/features/checkout/checkout-step-payment'
import { CheckoutStepConfirm } from '@/components/features/checkout/checkout-step-confirm'

const STEP_LABELS_FULL = [
  { id: 'dates', labelKey: 'checkout.stepDates' },
  { id: 'availability', labelKey: 'checkout.stepAvailability' },
  { id: 'addons', labelKey: 'checkout.stepAddons' },
  { id: 'review', labelKey: 'checkout.stepReview' },
  { id: 'payment', labelKey: 'checkout.stepPayment' },
  { id: 'confirm', labelKey: 'checkout.stepConfirm' },
]

const STEP_LABELS_STUDIO_ONLY = [
  { id: 'addons', labelKey: 'checkout.stepAddons' },
  { id: 'review', labelKey: 'checkout.stepReview' },
  { id: 'payment', labelKey: 'checkout.stepPayment' },
  { id: 'confirm', labelKey: 'checkout.stepConfirm' },
]

export default function CheckoutPage() {
  const { t } = useLocale()
  const router = useRouter()
  const { data: session, status } = useSession()
  const items = useCartStore((s) => s.items)
  const total = useCartStore((s) => s.total)
  const fetchCart = useCartStore((s) => s.fetchCart)
  const step = useCheckoutStore((s) => s.step)
  const setStep = useCheckoutStore((s) => s.setStep)
  const holdExpiresAt = useCheckoutStore((s) => s.holdExpiresAt)
  const details = useCheckoutStore((s) => s.details)
  const [depositAmount, setDepositAmount] = useState<number | null>(null)
  const [showFiveSteps, setShowFiveSteps] = useState(false)
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

  useEffect(() => {
    if (session && profileComplete && !showFiveSteps) setShowFiveSteps(true)
  }, [session, profileComplete, showFiveSteps])

  const isStudioOnly = items.length > 0 && items.every((i) => i.itemType === 'STUDIO')
  useEffect(() => {
    if (isStudioOnly && step < 3) setStep(3)
  }, [isStudioOnly, step, setStep])

  useEffect(() => {
    if (!session || items.length === 0) return
    let cancelled = false
    fetch('/api/checkout/deposit')
      .then((res) => (res.ok ? res.json() : { depositAmount: 0 }))
      .then((data: { depositAmount?: number }) => {
        if (!cancelled) setDepositAmount(data.depositAmount ?? 0)
      })
      .catch(() => {
        if (!cancelled) setDepositAmount(0)
      })
    return () => {
      cancelled = true
    }
  }, [session, items.length])

  const stepLabels = isStudioOnly ? STEP_LABELS_STUDIO_ONLY : STEP_LABELS_FULL
  const stepsWithLabels = stepLabels.map((s) => ({ id: s.id, label: t(s.labelKey) }))
  const currentStepIndex = isStudioOnly
    ? Math.max(0, Math.min(step - 3, stepsWithLabels.length - 1))
    : step - 1
  const handleStepClick = (index: number) =>
    setStep((isStudioOnly ? index + 3 : index + 1) as 1 | 2 | 3 | 4 | 5 | 6)

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
        <CheckoutStepContact onSuccess={() => setProfileChecked(false)} />
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

  if (!showFiveSteps) {
    return (
      <main className="container mx-auto max-w-6xl px-4 py-8">
        <p className="text-muted-foreground">{t('common.loading')}</p>
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
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          {step === 1 && <CheckoutStepDates onSuccess={() => setStep(2)} />}
          {step === 2 && <CheckoutStepAvailability onSuccess={() => setStep(3)} />}
          {step === 3 && <CheckoutStepAddons onSuccess={() => setStep(4)} />}
          {step === 4 && <CheckoutStepReview onAdvanceToPayment={() => setStep(5)} />}
          {step === 5 && (
            <CheckoutStepPayment depositAmount={depositAmount} onSuccess={() => setStep(6)} />
          )}
          {step === 6 && <CheckoutStepConfirm depositAmount={depositAmount} />}
        </div>
        <div className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          <OrderSummary holdExpiresAt={holdExpiresAt} depositAmount={depositAmount} />
        </div>
      </div>

      {/* Mobile: sticky Pay button on step 6 (full-width, total amount) */}
      {step === 6 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.08)] lg:hidden">
          <Button
            size="lg"
            className="h-12 w-full rounded-xl bg-brand-primary font-semibold"
            disabled={!details || items.length === 0}
            onClick={() => router.push('/payment')}
          >
            {t('checkout.payNow')} – {total.toLocaleString()} SAR
          </Button>
        </div>
      )}
    </main>
  )
}
