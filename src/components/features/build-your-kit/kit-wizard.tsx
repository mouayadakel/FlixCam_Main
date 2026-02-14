/**
 * Build Your Kit wizard. Steps: Category → Equipment → Duration → Summary.
 * Two-column layout (wizard + sticky sidebar) on desktop; floating bar on mobile.
 */

'use client'

import { useLocale } from '@/hooks/use-locale'
import { useKitWizardStore, getKitWizardTotalAmount, getKitWizardSelectedCount } from '@/lib/stores/kit-wizard.store'
import { Stepper } from '@/components/ui/stepper'
import { Button } from '@/components/ui/button'
import { KitSummarySidebar } from './kit-summary-sidebar'
import { StepCategory } from './steps/step-category'
import { StepEquipment } from './steps/step-equipment'
import { StepDuration } from './steps/step-duration'
import { StepSummary } from './steps/step-summary'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const STEPS = 4

function formatSar(value: number): string {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function KitWizard() {
  const { t } = useLocale()
  const step = useKitWizardStore((s) => s.step)
  const setStep = useKitWizardStore((s) => s.setStep)
  const selectedCategoryId = useKitWizardStore((s) => s.selectedCategoryId)
  const selectedEquipment = useKitWizardStore((s) => s.selectedEquipment)
  const durationDays = useKitWizardStore((s) => s.durationDays)

  const stepLabels = [
    t('kit.stepCategory'),
    t('kit.stepEquipment'),
    t('kit.stepDuration'),
    t('kit.stepSummary'),
  ]

  const steps = stepLabels.map((label, i) => ({ id: `step-${i}`, label }))

  const canNextStep0 = !!selectedCategoryId
  const canNextStep1 = Object.keys(selectedEquipment).length > 0
  const canNextStep2 = durationDays >= 1

  const goNext = () => {
    if (step === 0 && !canNextStep0) return
    if (step === 1 && !canNextStep1) return
    if (step === 2 && !canNextStep2) return
    if (step < STEPS - 1) setStep((step + 1) as 0 | 1 | 2 | 3)
  }

  const goBack = () => {
    if (step > 0) setStep((step - 1) as 0 | 1 | 2 | 3)
  }

  const totalAmount = getKitWizardTotalAmount({ selectedEquipment, durationDays })
  const vatAmount = Math.round(totalAmount * 0.15 * 100) / 100
  const totalWithVat = totalAmount + vatAmount
  const selectedCount = getKitWizardSelectedCount({ selectedEquipment })
  const totalUnits = Object.values(selectedEquipment).reduce((sum, { qty }) => sum + qty, 0)

  return (
    <div className="flex flex-col gap-8 lg:grid lg:grid-cols-12 lg:gap-8">
      {/* Left column: Stepper + step content */}
      <div className="lg:col-span-8 space-y-8">
        <Stepper
          steps={steps}
          currentStep={step}
          onStepClick={(index) => setStep(index as 0 | 1 | 2 | 3)}
        />

        <div className="min-h-[320px]">
          {step === 0 && <StepCategory />}
          {step === 1 && <StepEquipment />}
          {step === 2 && <StepDuration />}
          {step === 3 && <StepSummary />}
        </div>

        {/* Back / Next */}
        {step < 3 && (
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border-light">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={step === 0}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              {t('common.back')}
            </Button>
            <Button
              type="button"
              onClick={goNext}
              disabled={
                (step === 0 && !canNextStep0) ||
                (step === 1 && !canNextStep1) ||
                (step === 2 && !canNextStep2)
              }
              className="bg-brand-primary hover:bg-brand-primary-hover gap-2"
            >
              {t('common.next')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Right column: Sticky summary (desktop only) */}
      <aside className="hidden lg:block lg:col-span-4">
        <KitSummarySidebar />
      </aside>

      {/* Mobile floating bar – only when kit has items */}
      {selectedCount > 0 && (
        <>
          <div className="fixed bottom-0 start-0 end-0 z-40 flex items-center justify-between gap-4 border-t border-border-light bg-white/95 p-4 shadow-card-elevated backdrop-blur-sm lg:hidden">
            <div>
              <p className="text-sm font-medium text-text-heading">
                {totalUnits} {t('kit.items')} · {formatSar(totalWithVat)}
              </p>
              <p className="text-xs text-text-muted">
                {t('kit.duration')}: {durationDays} {durationDays === 1 ? t('kit.day') : t('kit.days')}
              </p>
            </div>
            <Button
              size="sm"
              className="shrink-0 bg-brand-primary hover:bg-brand-primary-hover"
              onClick={() => setStep(3)}
            >
              {t('kit.stepSummary')}
            </Button>
          </div>
          <div className="h-20 lg:hidden" aria-hidden />
        </>
      )}
    </div>
  )
}
