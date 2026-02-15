/**
 * Review section: kit breakdown, date picker, add to cart. Placeholder until Phase 7.
 */

'use client'

import { useLocale } from '@/hooks/use-locale'
import { useKitWizardStore } from '@/lib/stores/kit-wizard.store'
import { StepSummary } from '../steps/step-summary'

export function ReviewSection() {
  const { t } = useLocale()
  const selectedEquipment = useKitWizardStore((s) => s.selectedEquipment)
  const setView = useKitWizardStore((s) => s.setView)

  const hasItems = Object.keys(selectedEquipment).length > 0

  return (
    <section id="review" className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-heading">
          {t('kit.stepSummary')}
        </h2>
        {hasItems && (
          <button
            type="button"
            className="text-sm font-medium text-brand-primary hover:underline"
            onClick={() => setView('review')}
          >
            {t('kit.stepSummary')}
          </button>
        )}
      </div>
      <StepSummary />
    </section>
  )
}
