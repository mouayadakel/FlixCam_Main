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

export function Stepper({ steps, currentStep, className, onStepClick }: StepperProps) {
  return (
    <nav aria-label="Progress" className={className}>
      <ol className="flex items-center">
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
                    isCompleted &&
                      'border-brand-primary bg-brand-primary text-white',
                    isActive &&
                      'border-brand-primary bg-white text-brand-primary ring-2 ring-brand-primary ring-offset-2',
                    isUpcoming &&
                      'border-border-light bg-surface-light text-text-muted'
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
