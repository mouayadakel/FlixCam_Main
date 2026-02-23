/**
 * Checkout Step 4: Deposit + Payment – deposit amount, payment method, terms.
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useCheckoutStore } from '@/lib/stores/checkout.store'

interface CheckoutStepPaymentProps {
  depositAmount?: number | null
  onSuccess: () => void
}

export function CheckoutStepPayment({ depositAmount, onSuccess }: CheckoutStepPaymentProps) {
  const { t } = useLocale()
  const [termsAccepted, setTermsAccepted] = useState(false)
  const setPaymentMethod = useCheckoutStore((s) => s.setPaymentMethod)

  const handleContinue = () => {
    setPaymentMethod('card')
    onSuccess()
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 font-semibold">{t('checkout.deposit')}</h3>
        {depositAmount != null && depositAmount > 0 && (
          <p className="mb-4 text-sm text-text-muted">
            {t('checkout.depositHeldNote').replace(
              '{amount}',
              depositAmount.toLocaleString('en-SA', { style: 'currency', currency: 'SAR' })
            )}
          </p>
        )}
        <p className="mb-4 text-sm text-text-muted">{t('checkout.paymentMethods')}</p>
        <div className="mb-6 flex items-start gap-2">
          <Checkbox
            id="terms-payment"
            checked={termsAccepted}
            onCheckedChange={(v) => setTermsAccepted(v === true)}
          />
          <label htmlFor="terms-payment" className="cursor-pointer text-sm leading-none">
            {t('checkout.termsAccept')}{' '}
            <Link
              href="/policies"
              className="text-primary underline"
              target="_blank"
              rel="noopener"
            >
              {t('checkout.termsLink')}
            </Link>
          </label>
        </div>
        <Button size="lg" className="w-full" disabled={!termsAccepted} onClick={handleContinue}>
          {t('common.next')}
        </Button>
      </div>
    </div>
  )
}
