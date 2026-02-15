/**
 * Step: Dynamic questionnaire from shootTypeData.questionnaire. Card-based options.
 */

'use client'

import { useState } from 'react'
import { useLocale } from '@/hooks/use-locale'
import { useKitWizardStore } from '@/lib/stores/kit-wizard.store'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface QuestionnaireOption {
  id: string
  label: string
  labelAr?: string
  icon?: string
}

interface QuestionnaireQuestion {
  id: string
  question: string
  questionAr?: string
  type: 'single_choice' | 'multi_choice'
  options: QuestionnaireOption[]
}

export function StepQuestionnaire() {
  const { t } = useLocale()
  const shootTypeData = useKitWizardStore((s) => s.shootTypeData)
  const answers = useKitWizardStore((s) => s.answers)
  const setAnswer = useKitWizardStore((s) => s.setAnswer)

  const questions = (Array.isArray(shootTypeData?.questionnaire) ? shootTypeData!.questionnaire : []) as QuestionnaireQuestion[]
  const [currentIndex, setCurrentIndex] = useState(0)
  const currentQ = questions[currentIndex]
  const isRtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl'

  if (questions.length === 0) {
    return (
      <div className="animate-fade-in">
        <p className="text-text-muted">{t('kit.questionnaireEmpty')}</p>
      </div>
    )
  }

  const handleSelect = (optionId: string) => {
    if (currentQ.type === 'single_choice') {
      setAnswer(currentQ.id, optionId)
      if (currentIndex < questions.length - 1) {
        setCurrentIndex((i) => i + 1)
      }
    } else {
      const current = (answers[currentQ.id] as string[] | undefined) ?? []
      const next = current.includes(optionId) ? current.filter((x) => x !== optionId) : [...current, optionId]
      setAnswer(currentQ.id, next)
    }
  }

  const currentValue = answers[currentQ.id]
  const currentArr = Array.isArray(currentValue) ? currentValue : currentValue ? [currentValue] : []

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
        >
          {isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
        <span className="text-sm text-text-muted">
          {currentIndex + 1} / {questions.length}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
          disabled={currentIndex === questions.length - 1}
        >
          {isRtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>
      <h2 className="text-section-title text-text-heading mb-2">
        {currentQ.question}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {currentQ.options.map((opt) => {
          const selected = currentQ.type === 'single_choice' ? currentValue === opt.id : currentArr.includes(opt.id)
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelect(opt.id)}
              className={cn(
                'flex items-center gap-3 rounded-xl border p-4 text-start transition-all',
                selected
                  ? 'border-brand-primary bg-brand-primary/10 ring-2 ring-brand-primary ring-offset-2'
                  : 'border-border-light/60 bg-white hover:border-brand-primary/40'
              )}
            >
              {opt.icon && <span className="text-2xl">{opt.icon}</span>}
              <span className="font-medium">{opt.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
