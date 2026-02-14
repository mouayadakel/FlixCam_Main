/**
 * Homepage How It Works section – 5 steps with numbered icons and connecting lines.
 * Modern card-based design with step indicators.
 */

'use client'

import { Search, CalendarCheck, CreditCard, Package, RotateCcw } from 'lucide-react'
import { useLocale } from '@/hooks/use-locale'
import { PublicContainer } from '@/components/public/public-container'

const STEPS = [
  { key: 'home.howItWorksStep1', Icon: Search },
  { key: 'home.howItWorksStep2', Icon: CalendarCheck },
  { key: 'home.howItWorksStep3', Icon: CreditCard },
  { key: 'home.howItWorksStep4', Icon: Package },
  { key: 'home.howItWorksStep5', Icon: RotateCcw },
] as const

export function HomeHowItWorks() {
  const { t } = useLocale()

  return (
    <section className="bg-surface-light py-16 md:py-20 lg:py-24 border-t border-border-light/50">
      <PublicContainer>
        <div className="mb-12 text-center">
          <h2 className="text-section-title text-text-heading">
            {t('home.howItWorksTitle')}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-body-main text-text-body">
            {t('home.heroSubtitle')}
          </p>
        </div>
        <div className="relative grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-0">
          {/* Connecting line (desktop only) */}
          <div className="absolute top-10 hidden h-px bg-gradient-to-r from-transparent via-brand-primary/20 to-transparent lg:inset-x-[10%] lg:block" />

          {STEPS.map((step, i) => (
            <div
              key={step.key}
              className="relative flex flex-col items-center text-center opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${0.1 * i}s` }}
            >
              {/* Step number + icon container */}
              <div className="relative mb-5">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-card-elevated border border-border-light/60 transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 hover:border-brand-primary/20">
                  <step.Icon className="h-8 w-8 text-brand-primary" />
                </div>
                {/* Step number badge */}
                <span className="absolute -top-2 -end-2 flex h-7 w-7 items-center justify-center rounded-full bg-brand-primary text-xs font-bold text-white shadow-sm ring-2 ring-white">
                  {i + 1}
                </span>
              </div>

              <h3 className="text-base font-semibold text-text-heading">{t(step.key)}</h3>
            </div>
          ))}
        </div>
      </PublicContainer>
    </section>
  )
}
