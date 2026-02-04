/**
 * Checkout page (Phase 3.2–3.4). Steps: 1 Contact, 2 Details, 3 Review + Pay.
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useLocale } from '@/hooks/use-locale'
import { useCartStore } from '@/lib/stores/cart.store'
import { CheckoutSteps } from '@/components/features/checkout/checkout-steps'
import { CheckoutStepContact } from '@/components/features/checkout/checkout-step-contact'
import { CheckoutStepDetails } from '@/components/features/checkout/checkout-step-details'
import { CheckoutStepReview } from '@/components/features/checkout/checkout-step-review'

export default function CheckoutPage() {
  const { t } = useLocale()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [step, setStep] = useState(1)
  const items = useCartStore((s) => s.items)
  const fetchCart = useCartStore((s) => s.fetchCart)

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  useEffect(() => {
    if (status === 'loading') return
    if (items.length === 0) {
      const timer = setTimeout(() => {
        if (useCartStore.getState().items.length === 0) {
          router.replace('/cart')
        }
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [items.length, status, router])

  useEffect(() => {
    if (session && step === 1) {
      setStep(2)
    }
  }, [session, step])

  const handleContactSuccess = () => {
    setStep(2)
  }

  const handleDetailsSuccess = () => {
    setStep(3)
  }

  if (status === 'loading') {
    return (
      <main className="container mx-auto py-12 px-4">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </main>
    )
  }

  return (
    <main className="container mx-auto max-w-2xl py-12 px-4">
      <h1 className="text-2xl font-bold mb-6">{t('checkout.title')}</h1>
      <CheckoutSteps currentStep={step} className="mb-8" />

      {step === 1 && (
        <CheckoutStepContact onSuccess={handleContactSuccess} />
      )}

      {step === 2 && (
        <CheckoutStepDetails onSuccess={handleDetailsSuccess} />
      )}

      {step === 3 && <CheckoutStepReview />}
    </main>
  )
}
