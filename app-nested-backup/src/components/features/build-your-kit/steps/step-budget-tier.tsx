/**
 * Step: Budget tier selection. Essential / Professional (Most Popular) / Premium.
 */

'use client'

import { useLocale } from '@/hooks/use-locale'
import { useKitWizardStore, type BudgetTier } from '@/lib/stores/kit-wizard.store'
import { cn } from '@/lib/utils'
import { Zap, Star, Crown } from 'lucide-react'

const TIERS: { id: BudgetTier; labelKey: string; descKey: string; Icon: typeof Zap }[] = [
  {
    id: 'ESSENTIAL',
    labelKey: 'kit.budgetEssential',
    descKey: 'kit.budgetEssentialDesc',
    Icon: Zap,
  },
  {
    id: 'PROFESSIONAL',
    labelKey: 'kit.budgetProfessional',
    descKey: 'kit.budgetProfessionalDesc',
    Icon: Star,
  },
  { id: 'PREMIUM', labelKey: 'kit.budgetPremium', descKey: 'kit.budgetPremiumDesc', Icon: Crown },
]

export function StepBudgetTier() {
  const { t } = useLocale()
  const budgetTier = useKitWizardStore((s) => s.budgetTier)
  const setBudgetTier = useKitWizardStore((s) => s.setBudgetTier)

  return (
    <div className="animate-fade-in">
      <h2 className="mb-1 text-section-title text-text-heading">{t('kit.chooseBudget')}</h2>
      <p className="mb-6 text-body-main text-text-muted">{t('kit.chooseBudgetDesc')}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {TIERS.map(({ id, labelKey, descKey, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setBudgetTier(id)}
            className={cn(
              'relative flex flex-col items-center rounded-2xl border p-6 text-center transition-all hover:shadow-card-hover',
              budgetTier === id
                ? 'border-brand-primary bg-brand-primary/5 ring-2 ring-brand-primary ring-offset-2'
                : 'border-border-light/60 bg-white shadow-card'
            )}
          >
            {id === 'PROFESSIONAL' && (
              <span className="absolute -top-2 start-1/2 -translate-x-1/2 rounded-full bg-brand-primary px-2 py-0.5 text-xs font-medium text-white">
                {t('kit.mostPopular')}
              </span>
            )}
            <div
              className={cn(
                'mb-3 flex h-12 w-12 items-center justify-center rounded-xl',
                budgetTier === id
                  ? 'bg-brand-primary text-white'
                  : 'bg-surface-light text-text-muted'
              )}
            >
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-text-heading">{t(labelKey)}</h3>
            <p className="mt-1 text-sm text-text-muted">{t(descKey)}</p>
          </button>
        ))}
      </div>
      <p className="mt-4 text-center text-sm text-text-muted">{t('kit.chooseBudgetHint')}</p>
    </div>
  )
}
