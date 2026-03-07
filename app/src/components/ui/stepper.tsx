/**
 * Reusable horizontal stepper – step number, label, active/completed/upcoming.
 * Use for checkout and other wizards.
 */

'use client'

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export interface StepperStep {
  id: string
  label: string
}

interface StepperProps {
  steps: StepperStep[]
  /** 0-based index of the current step */
  currentStep: number
  className?: string
  /** Optional: allow clicking past steps to navigate (e.g. step number in URL) */
  onStepClick?: (index: number) => void
}

const STEPPER_ARIA_MIN = 1

export function Stepper({ steps, currentStep, className, onStepClick }: StepperProps) {
  const valueNow = steps.length > 0 ? currentStep + 1 : 0
  const valueMax = Math.max(steps.length, 1)
  const progressPercent = steps.length > 0 ? `${((currentStep + 1) / steps.length) * 100}%` : '0%'
  const progressbarAria = {
    'aria-valuenow': valueNow,
    'aria-valuemin': STEPPER_ARIA_MIN,
    'aria-valuemax': valueMax,
    'aria-label': `Step ${currentStep + 1} of ${steps.length}`,
  }

  return (
    <nav aria-label="Progress" className={className}>
      {/* Mobile: compact step indicator + progress bar */}
      <div className="lg:hidden">
        <p className="text-sm font-medium text-text-muted">
          {currentStep + 1} / {steps.length}
        </p>
        <div
          className="stepper-progress-track mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-light"
          role="progressbar"
          {...progressbarAria}
        >
          <div
            className="stepper-progress-fill h-full rounded-full bg-brand-primary transition-all duration-300"
            style={{ ['--stepper-progress' as string]: progressPercent }}
          />
        </div>
        <p className="mt-1 text-sm font-semibold text-brand-primary">{steps[currentStep]?.label}</p>
      </div>
      {/* Desktop: full stepper */}
      <ol className="hidden lg:flex lg:items-center">
        {steps.map((step, index) => {
          const isCompleted = currentStep > index
          const isActive = currentStep === index
          const isUpcoming = currentStep < index
          const isClickable = !!onStepClick && (isCompleted || isActive)
          return (
            <li
              key={step.id}
              className={cn(
                'flex flex-1 items-center after:content-[""] last:after:hidden',
                'after:flex-1 after:border-t-2 after:border-border-light',
                index < currentStep && 'after:border-brand-primary'
              )}
            >
              <button
                type="button"
                onClick={() => isClickable && onStepClick?.(index)}
                disabled={!isClickable}
                className={cn(
                  'group flex flex-col items-center gap-1',
                  isClickable && 'cursor-pointer',
                  !isClickable && 'cursor-default'
                )}
                aria-current={isActive ? 'step' : undefined}
                aria-label={`${step.label}${isCompleted ? ', completed' : isActive ? ', current step' : ''}`}
              >
                <span
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                    isCompleted && 'border-brand-primary bg-brand-primary text-white',
                    isActive &&
                      'border-brand-primary bg-white text-brand-primary ring-2 ring-brand-primary ring-offset-2',
                    isUpcoming && 'border-border-light bg-surface-light text-text-muted'
                  )}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : index + 1}
                </span>
                <span
                  className={cn(
                    'text-xs font-medium sm:text-sm',
                    isActive && 'text-brand-primary',
                    isCompleted && 'text-text-heading',
                    isUpcoming && 'text-text-muted'
                  )}
                >
                  {step.label}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
