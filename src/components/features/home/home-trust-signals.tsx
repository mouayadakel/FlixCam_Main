/**
 * Homepage trust signals – animated stats with icons and trust badges.
 * Visual treatment: gradient accent, card-based layout.
 */

'use client'

import { Shield, HeadphonesIcon, Award, Camera, Users, CalendarCheck } from 'lucide-react'
import { useLocale } from '@/hooks/use-locale'
import { PublicContainer } from '@/components/public/public-container'

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
    { Icon: Shield, label: t('home.trustInsured') },
    { Icon: HeadphonesIcon, label: t('home.trustSupport') },
    { Icon: Award, label: 'Verified' },
  ]

  return (
    <section className="bg-white py-16 md:py-20 lg:py-24 border-t border-border-light/50">
      <PublicContainer>
        <h2 className="mb-12 text-center text-section-title text-text-heading">
          {t('home.trustTitle')}
        </h2>

        {/* Stats grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="group flex flex-col items-center rounded-2xl border border-border-light/60 bg-surface-light/50 p-8 text-center transition-all duration-300 hover:bg-white hover:shadow-card-elevated hover:border-brand-primary/10 opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${0.1 * index}s` }}
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
      </PublicContainer>
    </section>
  )
}
