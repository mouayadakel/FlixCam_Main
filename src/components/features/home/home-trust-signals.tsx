/**
 * Homepage trust signals – stats, trust badges, and How It Works steps (merged).
 */

'use client'

import {
  HeadphonesIcon,
  Award,
  Camera,
  Users,
  CalendarCheck,
  Search,
  CreditCard,
  Package,
  RotateCcw,
} from 'lucide-react'
import { useLocale } from '@/hooks/use-locale'
import { PublicContainer } from '@/components/public/public-container'

const HOW_IT_WORKS_STEPS = [
  { key: 'home.howItWorksStep1', Icon: Search },
  { key: 'home.howItWorksStep2', Icon: CalendarCheck },
  { key: 'home.howItWorksStep3', Icon: CreditCard },
  { key: 'home.howItWorksStep4', Icon: Package },
  { key: 'home.howItWorksStep5', Icon: RotateCcw },
] as const

export interface HomeTrustSignalsProps {
  equipmentCount: number
  rentalsCount?: number
  yearFounded?: number
}

export function HomeTrustSignals({
  equipmentCount,
  rentalsCount = 0,
  yearFounded = 2020,
}: HomeTrustSignalsProps) {
  const { t } = useLocale()

  const equipmentText = t('home.trustEquipmentCount').replace('{count}', String(equipmentCount))
  const rentalsText = t('home.trustRentalsCount').replace('{count}', String(rentalsCount))
  const yearsText = t('home.trustYears').replace('{year}', String(yearFounded))

  const stats = [
    { value: `${equipmentCount}+`, label: equipmentText, Icon: Camera },
    { value: `${rentalsCount}+`, label: rentalsText, Icon: Users },
    { value: String(yearFounded), label: yearsText, Icon: CalendarCheck },
  ]

  const badges = [
    { Icon: HeadphonesIcon, label: t('home.trustSupport') },
    { Icon: Award, label: 'Verified' },
  ]

  return (
    <section className="border-t border-border-light/50 bg-white py-10 md:py-14">
      <PublicContainer>
        <h2 className="mb-12 text-center text-section-title text-text-heading">
          {t('home.trustTitle')}
        </h2>

        {/* Stats grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="trust-stat-card group flex animate-fade-in-up flex-col items-center rounded-2xl border border-border-light/60 bg-surface-light/50 p-8 text-center opacity-0 transition-all duration-300 hover:border-brand-primary/10 hover:bg-white hover:shadow-card-elevated"
              style={{ ['--animation-delay' as string]: `${0.1 * index}s` }}
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary transition-all duration-300 group-hover:bg-brand-primary group-hover:text-white group-hover:shadow-lg group-hover:shadow-brand-primary/20">
                <stat.Icon className="h-6 w-6" />
              </div>
              <p className="text-4xl font-extrabold tracking-tight text-text-heading md:text-5xl">
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-text-muted">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-8">
          {badges.map((badge, index) => (
            <div
              key={index}
              className="flex items-center gap-2.5 text-text-muted transition-colors hover:text-text-heading"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary/10">
                <badge.Icon className="h-5 w-5 text-brand-primary" />
              </div>
              <span className="text-sm font-medium">{badge.label}</span>
            </div>
          ))}
        </div>

        {/* How It Works – vertical steps on mobile, row on desktop */}
        <div className="mt-10 border-t border-border-light/50 pt-10">
          <h3 className="mb-6 text-center text-lg font-semibold text-text-heading">
            {t('home.howItWorksTitle')}
          </h3>
          <div className="relative flex flex-col gap-4 md:flex-row md:flex-wrap md:justify-center md:gap-4">
            {/* Vertical connecting line on mobile (start side for RTL) */}
            <span
              className="absolute bottom-4 start-[13px] top-4 w-px bg-border-light/80 md:hidden rtl:end-[13px] rtl:start-auto"
              aria-hidden
            />
            {HOW_IT_WORKS_STEPS.map((step, i) => (
              <div
                key={step.key}
                className="relative flex min-h-[48px] items-center gap-3 rounded-xl border border-border-light/60 bg-surface-light/50 px-4 py-3 ps-10 md:py-2.5 md:ps-4 rtl:pe-10 rtl:ps-4"
              >
                <span className="absolute start-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-primary text-xs font-bold text-white md:relative md:start-auto md:h-8 md:w-8 rtl:end-2 rtl:start-auto rtl:md:end-auto">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-text-heading">{t(step.key)}</span>
              </div>
            ))}
          </div>
        </div>
      </PublicContainer>
    </section>
  )
}
