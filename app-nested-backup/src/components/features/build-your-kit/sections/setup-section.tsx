/**
 * Quick setup: shoot type + budget + duration on one screen. Auto-scrolls when complete.
 */

'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { useLocale } from '@/hooks/use-locale'
import { useToast } from '@/hooks/use-toast'
import { useKitWizardStore, type BudgetTier } from '@/lib/stores/kit-wizard.store'
import { useShootTypes, useShootTypeConfig } from '@/lib/hooks/use-kit-queries'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { Check, Loader2, Zap, Star, Crown } from 'lucide-react'

const BUDGET_TIERS: { id: BudgetTier; labelKey: string; Icon: typeof Zap }[] = [
  { id: 'ESSENTIAL', labelKey: 'kit.budgetEssential', Icon: Zap },
  { id: 'PROFESSIONAL', labelKey: 'kit.budgetProfessional', Icon: Star },
  { id: 'PREMIUM', labelKey: 'kit.budgetPremium', Icon: Crown },
]

const DURATION_PRESETS = [1, 3, 7, 14, 30] as const

interface SetupSectionProps {
  onSetupComplete?: () => void
}

export function SetupSection({ onSetupComplete }: SetupSectionProps) {
  const { t } = useLocale()
  const { toast } = useToast()
  const starterRef = useRef<HTMLDivElement>(null)
  const {
    data: shootTypes = [],
    isLoading: loadingShootTypes,
    error: shootTypesError,
  } = useShootTypes()

  const shootTypeId = useKitWizardStore((s) => s.shootTypeId)
  const shootTypeSlug = useKitWizardStore((s) => s.shootTypeSlug)
  const setShootType = useKitWizardStore((s) => s.setShootType)
  const setShootTypeData = useKitWizardStore((s) => s.setShootTypeData)
  const setActiveCategory = useKitWizardStore((s) => s.setActiveCategory)
  const budgetTier = useKitWizardStore((s) => s.budgetTier)
  const setBudgetTier = useKitWizardStore((s) => s.setBudgetTier)
  const durationDays = useKitWizardStore((s) => s.durationDays)
  const setDuration = useKitWizardStore((s) => s.setDuration)
  const setView = useKitWizardStore((s) => s.setView)

  const { data: shootTypeConfig, error: shootTypeConfigError } = useShootTypeConfig(shootTypeSlug)
  useEffect(() => {
    if (shootTypeConfig) {
      setShootTypeData(shootTypeConfig)
      const first = shootTypeConfig.categorySteps?.[0]
      if (first) setActiveCategory(first.categoryId)
    }
  }, [shootTypeConfig, setShootTypeData, setActiveCategory])
  useEffect(() => {
    if (shootTypeConfigError && shootTypeSlug) {
      toast({
        title: t('common.error'),
        description: shootTypeConfigError.message || t('kit.errorLoading'),
        variant: 'destructive',
      })
    }
  }, [shootTypeConfigError, shootTypeSlug, toast, t])

  const setupComplete = !!shootTypeId && !!budgetTier && durationDays >= 1

  useEffect(() => {
    if (setupComplete && starterRef.current) {
      starterRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setView('building')
      onSetupComplete?.()
    }
  }, [setupComplete, setView, onSetupComplete])

  if (loadingShootTypes) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (shootTypesError) {
    return (
      <div className="rounded-xl border border-border-light bg-surface-light p-8 text-center">
        <p className="mb-4 text-destructive">{shootTypesError.message}</p>
        <button
          type="button"
          className="text-sm text-brand-primary underline"
          onClick={() => window.location.reload()}
        >
          {t('common.retry')}
        </button>
      </div>
    )
  }

  return (
    <section id="setup" className="animate-fade-in space-y-8">
      <div>
        <h2 className="mb-1 text-section-title text-text-heading">{t('kit.chooseShootType')}</h2>
        <p className="mb-4 text-body-main text-text-muted">{t('kit.chooseShootTypeDesc')}</p>
        <div
          role="radiogroup"
          aria-label={t('kit.chooseShootType')}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {shootTypes.map((st) => (
            <button
              key={st.id}
              type="button"
              role="radio"
              aria-checked={shootTypeId === st.id}
              onClick={() => setShootType(st.id, st.slug)}
              className={cn(
                'group relative overflow-hidden rounded-2xl border bg-white text-start shadow-card transition-all hover:shadow-card-hover',
                shootTypeId === st.id
                  ? 'border-brand-primary ring-2 ring-brand-primary ring-offset-2'
                  : 'border-border-light/60'
              )}
              aria-label={st.name}
            >
              <div className="relative aspect-[4/3] bg-muted">
                {st.coverImageUrl ? (
                  <Image
                    src={st.coverImageUrl}
                    alt={st.name}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    unoptimized={st.coverImageUrl.startsWith('/images/')}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/80 text-4xl text-muted-foreground">
                    {st.icon || '🎬'}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-0 start-0 end-0 p-4 text-white">
                  <h3 className="font-semibold">{st.name}</h3>
                  {st.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-white/90">{st.description}</p>
                  )}
                  <p className="mt-2 text-xs text-white/80">
                    {st.categoryCount} {t('kit.stepCategory')} · {st.recommendationCount}+{' '}
                    {t('kit.items')}
                  </p>
                </div>
                {shootTypeId === st.id && (
                  <div className="absolute end-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary text-white">
                    <Check className="h-5 w-5" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-2 text-lg font-semibold text-text-heading">{t('kit.chooseBudget')}</h2>
          <p className="mb-4 text-body-main text-text-muted">{t('kit.chooseBudgetDesc')}</p>
          <div
            role="radiogroup"
            aria-label={t('kit.chooseBudget')}
            className="flex flex-wrap gap-2"
          >
            {BUDGET_TIERS.map(({ id, labelKey, Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={budgetTier === id}
                onClick={() => setBudgetTier(id)}
                className={cn(
                  'flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all',
                  budgetTier === id
                    ? 'border-brand-primary bg-brand-primary/10 text-brand-primary ring-2 ring-brand-primary ring-offset-2'
                    : 'border-border-light/60 bg-white text-text-muted hover:border-brand-primary/40'
                )}
                aria-label={t(labelKey)}
              >
                <Icon className="h-4 w-4" />
                {t(labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-text-heading">{t('kit.duration')}</h2>
          <p className="mb-4 text-body-main text-text-muted">{t('kit.durationDesc')}</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {DURATION_PRESETS.map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setDuration(days)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-sm font-medium transition-all',
                  durationDays === days
                    ? 'border-brand-primary bg-brand-primary text-white'
                    : 'border-border-light/60 bg-white text-text-muted hover:border-brand-primary/40'
                )}
                aria-pressed={durationDays === days}
                aria-label={`${days} ${days === 1 ? t('kit.day') : t('kit.days')}`}
              >
                {days} {days === 1 ? t('kit.day') : t('kit.days')}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="kit-duration-custom">{t('kit.customDuration')}</Label>
            <Input
              id="kit-duration-custom"
              type="number"
              min={1}
              max={365}
              value={durationDays}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                if (!Number.isNaN(v)) setDuration(v)
              }}
              className="max-w-[8rem]"
            />
          </div>
        </div>
      </div>

      <div ref={starterRef} className="h-0" aria-hidden />
    </section>
  )
}
