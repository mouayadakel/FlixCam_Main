/**
 * Crew availability — extended calendar preview for crew day-rate bookings.
 */

'use client'

import { useLocale } from '@/hooks/use-locale'
import { AvailabilityPreview } from './availability-preview'

interface CrewAvailabilitySectionProps {
  equipmentId: string
}

export function CrewAvailabilitySection({ equipmentId }: CrewAvailabilitySectionProps) {
  const { t } = useLocale()

  return (
    <section className="rounded-2xl border border-border-light/60 bg-white p-4 md:p-5">
      <h2 className="mb-1 text-lg font-semibold text-text-heading">
        {t('equipment.crewAvailabilityTitle')}
      </h2>
      <p className="mb-3 text-sm text-text-muted">{t('equipment.crewAvailabilityHint')}</p>
      <AvailabilityPreview equipmentId={equipmentId} dayCount={28} />
    </section>
  )
}
