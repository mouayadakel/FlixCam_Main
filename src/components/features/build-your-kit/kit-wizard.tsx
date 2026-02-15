/**
 * Build Your Kit wizard. Smart flow: Shoot type → Budget → Questionnaire → Categories → Duration → Summary.
 * Two-column layout (wizard + sticky sidebar) on desktop; floating bar on mobile.
 */

'use client'

import { useEffect } from 'react'
import { useLocale } from '@/hooks/use-locale'
import {
  useKitWizardStore,
  getKitWizardTotalAmount,
  getKitWizardSelectedCount,
  getCurrentCategoryStep,
} from '@/lib/stores/kit-wizard.store'
import { Stepper } from '@/components/ui/stepper'
import { Button } from '@/components/ui/button'
import { KitSummarySidebar } from './kit-summary-sidebar'
import { KitAiAssistant } from './kit-ai-assistant'
import { StepShootType } from './steps/step-shoot-type'
import { StepBudgetTier } from './steps/step-budget-tier'
import { StepQuestionnaire } from './steps/step-questionnaire'
import { StepCategoryEquipment } from './steps/step-category-equipment'
import { StepDuration } from './steps/step-duration'
import { StepSummary } from './steps/step-summary'
import { ChevronLeft, ChevronRight } from 'lucide-react'

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
  const phase = useKitWizardStore((s) => s.phase)
  const setPhase = useKitWizardStore((s) => s.setPhase)
  const step = useKitWizardStore((s) => s.step)
  const setStep = useKitWizardStore((s) => s.setStep)
  const shootTypeId = useKitWizardStore((s) => s.shootTypeId)
  const shootTypeSlug = useKitWizardStore((s) => s.shootTypeSlug)
  const shootTypeData = useKitWizardStore((s) => s.shootTypeData)
  const setShootTypeData = useKitWizardStore((s) => s.setShootTypeData)
  const budgetTier = useKitWizardStore((s) => s.budgetTier)
  const categorySteps = useKitWizardStore((s) => s.categorySteps)
  const currentCategoryIndex = useKitWizardStore((s) => s.currentCategoryIndex)
  const selectedCategoryId = useKitWizardStore((s) => s.selectedCategoryId)
  const selectedEquipment = useKitWizardStore((s) => s.selectedEquipment)
  const durationDays = useKitWizardStore((s) => s.durationDays)
  const nextCategory = useKitWizardStore((s) => s.nextCategory)
  const prevCategory = useKitWizardStore((s) => s.prevCategory)

  const questionnaire = Array.isArray(shootTypeData?.questionnaire) ? shootTypeData!.questionnaire : []
  const hasQuestionnaire = questionnaire.length > 0
  const currentCategoryStep = getCurrentCategoryStep({ categorySteps, currentCategoryIndex })
  const isLastCategory = categorySteps.length > 0 && currentCategoryIndex >= categorySteps.length - 1
  const isFirstCategory = currentCategoryIndex <= 0

  const totalAmount = getKitWizardTotalAmount({ selectedEquipment, durationDays })
  const vatAmount = Math.round(totalAmount * 0.15 * 100) / 100
  const totalWithVat = totalAmount + vatAmount
  const selectedCount = getKitWizardSelectedCount({ selectedEquipment })
  const totalUnits = Object.values(selectedEquipment).reduce((sum, { qty }) => sum + qty, 0)

  const canNextShootType = !!shootTypeId
  const canNextBudget = !!budgetTier
  const canNextCategories = true
  const canNextDuration = durationDays >= 1

  useEffect(() => {
    if (phase === 'categories' && categorySteps.length > 0 && !currentCategoryStep) return
    if (phase === 'categories' && currentCategoryStep) {
      useKitWizardStore.getState().setCategory(currentCategoryStep.categoryId)
    }
  }, [phase, categorySteps, currentCategoryStep])

  const goNext = () => {
    if (phase === 'shoot-type') {
      if (!canNextShootType) return
      if (shootTypeSlug) {
        fetch(`/api/public/shoot-types/${shootTypeSlug}`)
          .then((res) => res.json())
          .then((data) => {
            setShootTypeData(data)
            setPhase('budget')
          })
          .catch(() => {})
      } else setPhase('budget')
      return
    }
    if (phase === 'budget') {
      if (!canNextBudget) return
      setPhase(hasQuestionnaire ? 'questionnaire' : 'categories')
      return
    }
    if (phase === 'questionnaire') {
      setPhase('categories')
      return
    }
    if (phase === 'categories') {
      if (categorySteps.length === 0 || isLastCategory) setPhase('duration')
      else nextCategory()
      return
    }
    if (phase === 'duration') {
      if (!canNextDuration) return
      setPhase('summary')
      return
    }
  }

  const goBack = () => {
    if (phase === 'budget') setPhase('shoot-type')
    else if (phase === 'questionnaire') setPhase('budget')
    else if (phase === 'categories') {
      if (isFirstCategory) setPhase(hasQuestionnaire ? 'questionnaire' : 'budget')
      else prevCategory()
    } else if (phase === 'duration') setPhase('categories')
    else if (phase === 'summary') setPhase('duration')
  }

  const stepLabels = (() => {
    if (phase === 'shoot-type') return [t('kit.chooseShootType'), '', '', '']
    if (phase === 'budget') return [t('kit.chooseBudget'), '', '', '']
    if (phase === 'questionnaire') return [t('kit.stepSummary'), '', '', '']
    if (phase === 'categories') {
      const total = categorySteps.length
      const current = currentCategoryStep?.categoryName ?? t('kit.stepEquipment')
      return [current, `${currentCategoryIndex + 1}/${total}`, '', '']
    }
    if (phase === 'duration') return [t('kit.stepDuration'), '', '', '']
    if (phase === 'summary') return [t('kit.stepSummary'), '', '', '']
    return [t('kit.stepCategory'), t('kit.stepEquipment'), t('kit.stepDuration'), t('kit.stepSummary')]
  })()

  const steps = stepLabels.filter(Boolean).map((label, i) => ({ id: `step-${i}`, label }))
  const currentStepIndex = phase === 'shoot-type' ? 0 : phase === 'budget' ? 1 : phase === 'questionnaire' ? 2 : phase === 'categories' ? 2 : phase === 'duration' ? 2 : 3

  return (
    <div className="flex flex-col gap-8 lg:grid lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-8 space-y-8">
        <Stepper steps={steps.length ? steps : [{ id: '0', label: stepLabels[0] || 'Step' }]} currentStep={Math.min(currentStepIndex, Math.max(0, steps.length - 1))} onStepClick={() => {}} />

        <div className="min-h-[320px]">
          {phase === 'shoot-type' && <StepShootType />}
          {phase === 'budget' && <StepBudgetTier />}
          {phase === 'questionnaire' && <StepQuestionnaire />}
          {phase === 'categories' && <StepCategoryEquipment />}
          {phase === 'duration' && <StepDuration />}
          {phase === 'summary' && <StepSummary />}
        </div>

        {phase !== 'summary' && (
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border-light">
            <Button type="button" variant="outline" onClick={goBack} disabled={phase === 'shoot-type'} className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              {t('common.back')}
            </Button>
            <Button
              type="button"
              onClick={goNext}
              disabled={
                (phase === 'shoot-type' && !canNextShootType) ||
                (phase === 'budget' && !canNextBudget) ||
                (phase === 'duration' && !canNextDuration)
              }
              className="bg-brand-primary hover:bg-brand-primary-hover gap-2"
            >
              {t('common.next')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <aside className="hidden lg:block lg:col-span-4">
        <KitSummarySidebar />
      </aside>

      <KitAiAssistant />

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
            <Button size="sm" className="shrink-0 bg-brand-primary hover:bg-brand-primary-hover" onClick={() => setPhase('summary')}>
              {t('kit.stepSummary')}
            </Button>
          </div>
          <div className="h-20 lg:hidden" aria-hidden />
        </>
      )}
    </div>
  )
}
