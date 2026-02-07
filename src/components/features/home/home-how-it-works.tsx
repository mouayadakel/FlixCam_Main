/**
 * Homepage How It Works section (Phase 2.1).
 */

'use client'

import { useLocale } from '@/hooks/use-locale'

const STEPS = [
  { key: 'home.howItWorksStep1' },
  { key: 'home.howItWorksStep2' },
  { key: 'home.howItWorksStep3' },
] as const

export function HomeHowItWorks() {
  const { t } = useLocale()

  return (
    <section className="py-12 md:py-16 lg:py-20 border-t border-border-light bg-surface-light">
      <div className="mx-auto w-full max-w-public-container px-4">
        <h2 className="text-2xl font-semibold text-center mb-10">
          {t('home.howItWorksTitle')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((step, i) => (
            <div key={step.key} className="text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary text-white font-bold text-lg mb-4">
                {i + 1}
              </div>
              <h3 className="font-medium">{t(step.key)}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
