'use client'

import { cn } from '@/lib/utils'
import { Check, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface WizardStep {
  id: string
  label: string
  labelEn: string
  icon?: React.ReactNode
}

interface StepWizardProps {
  steps: WizardStep[]
  currentStep: number
  completedSteps: Set<number>
  onStepClick?: (index: number) => void
  children: React.ReactNode
  onNext?: () => void
  onPrevious?: () => void
  nextLabel?: string
  nextDisabled?: boolean
  showNavigation?: boolean
}

export function StepWizard({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  children,
  onNext,
  onPrevious,
  nextLabel,
  nextDisabled,
  showNavigation = true,
}: StepWizardProps) {
  return (
    <div className="space-y-6">
      <nav aria-label="Import progress">
        <ol className="flex items-center gap-2">
          {steps.map((step, index) => {
            const isActive = index === currentStep
            const isCompleted = completedSteps.has(index)
            const isAccessible = isCompleted || index <= currentStep

            return (
              <li key={step.id} className="flex flex-1 items-center gap-2">
                <button
                  type="button"
                  onClick={() => isAccessible && onStepClick?.(index)}
                  disabled={!isAccessible}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive && 'bg-primary text-primary-foreground shadow-sm',
                    isCompleted && !isActive && 'bg-green-100 text-green-800 hover:bg-green-200',
                    !isActive &&
                      !isCompleted &&
                      isAccessible &&
                      'bg-muted text-muted-foreground hover:bg-muted/80',
                    !isAccessible && 'cursor-not-allowed bg-muted/50 text-muted-foreground/50'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      isActive && 'bg-primary-foreground/20 text-primary-foreground',
                      isCompleted && !isActive && 'bg-green-200 text-green-800',
                      !isActive && !isCompleted && 'bg-background text-muted-foreground'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : !isAccessible ? (
                      <Lock className="h-3 w-3" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className="hidden truncate sm:inline">{step.label}</span>
                </button>
                {index < steps.length - 1 && (
                  <div
                    className={cn('h-0.5 w-4 shrink-0', isCompleted ? 'bg-green-400' : 'bg-muted')}
                  />
                )}
              </li>
            )
          })}
        </ol>
      </nav>

      <div className="min-h-[400px]">{children}</div>

      {showNavigation && (
        <div className="flex items-center justify-between border-t pt-4">
          <Button variant="outline" onClick={onPrevious} disabled={currentStep === 0}>
            ← السابق
          </Button>
          <span className="text-sm text-muted-foreground">
            {currentStep + 1} / {steps.length}
          </span>
          <Button onClick={onNext} disabled={nextDisabled}>
            {nextLabel || (currentStep === steps.length - 1 ? 'بدء الاستيراد' : 'التالي →')}
          </Button>
        </div>
      )}
    </div>
  )
}
