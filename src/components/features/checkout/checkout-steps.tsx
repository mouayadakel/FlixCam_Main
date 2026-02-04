/**
 * Checkout step indicator (Phase 3.2–3.4).
 */

'use client'

import { useLocale } from '@/hooks/use-locale'
import { cn } from '@/lib/utils'

const STEPS = [
  { key: 'contact', step: 1 },
  { key: 'details', step: 2 },
  { key: 'review', step: 3 },
] as const

interface CheckoutStepsProps {
  currentStep: number
  className?: string
}

export function CheckoutSteps({ currentStep, className }: CheckoutStepsProps) {
  const { t } = useLocale()

  const labels: Record<string, string> = {
    contact: t('checkout.stepContact'),
    details: t('checkout.stepDetails'),
    review: t('checkout.stepReview'),
  }

  return (
    <nav aria-label="Progress" className={cn('flex items-center justify-center gap-2', className)}>
      <ol className="flex items-center gap-2">
        {STEPS.map(({ key, step }) => {
          const isActive = currentStep === step
          const isPast = currentStep > step
          return (
            <li
              key={key}
              className={cn(
                'flex items-center rounded-md px-3 py-1.5 text-sm font-medium',
                isActive && 'bg-primary text-primary-foreground',
                isPast && 'bg-muted text-muted-foreground',
                !isActive && !isPast && 'text-muted-foreground'
              )}
            >
              <span className="flex items-center gap-1.5">
                <span aria-hidden>{step}</span>
                <span>{labels[key]}</span>
              </span>
              {step < 3 && <span className="ms-2 hidden text-muted-foreground sm:inline">→</span>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
