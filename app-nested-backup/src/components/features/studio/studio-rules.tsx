/**
 * Studio rules: rules text, smoking, food, equipment care, cancellation
 */

'use client'

import Link from 'next/link'
import { useLocale } from '@/hooks/use-locale'
import type { StudioPublicData } from '@/lib/types/studio.types'

interface StudioRulesProps {
  studio: StudioPublicData
}

export function StudioRules({ studio }: StudioRulesProps) {
  const { t } = useLocale()
  const hasRules =
    studio.rulesText ||
    studio.smokingPolicy ||
    studio.foodPolicy ||
    studio.equipmentCarePolicy ||
    studio.cancellationPolicyShort

  if (!hasRules) return null

  return (
    <section
      className="space-y-5 rounded-2xl border border-border-light/40 bg-white p-6 shadow-card"
      dir="rtl"
    >
      <h3 className="text-lg font-semibold text-text-heading">{t('studios.rules')}</h3>
      {studio.rulesText && (
        <p className="text-sm leading-relaxed text-text-body">{studio.rulesText}</p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {studio.smokingPolicy && (
          <div className="rounded-xl bg-surface-light p-3">
            <p className="mb-1 text-xs font-semibold text-text-muted">{t('studios.smoking')}</p>
            <p className="text-sm text-text-body">{studio.smokingPolicy}</p>
          </div>
        )}
        {studio.foodPolicy && (
          <div className="rounded-xl bg-surface-light p-3">
            <p className="mb-1 text-xs font-semibold text-text-muted">{t('studios.food')}</p>
            <p className="text-sm text-text-body">{studio.foodPolicy}</p>
          </div>
        )}
        {studio.equipmentCarePolicy && (
          <div className="rounded-xl bg-surface-light p-3">
            <p className="mb-1 text-xs font-semibold text-text-muted">
              {t('studios.equipmentCare')}
            </p>
            <p className="text-sm text-text-body">{studio.equipmentCarePolicy}</p>
          </div>
        )}
      </div>

      {(studio.cancellationPolicyShort || studio.cancellationPolicyLink) && (
        <div className="rounded-xl border border-warning-200 bg-warning-50 p-3">
          <p className="mb-1 text-xs font-semibold text-warning-700">{t('studios.cancellation')}</p>
          {studio.cancellationPolicyShort && (
            <p className="text-sm text-warning-800">{studio.cancellationPolicyShort}</p>
          )}
          {studio.cancellationPolicyLink && (
            <Link
              href={studio.cancellationPolicyLink}
              className="mt-1 inline-block text-sm font-medium text-primary underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('studios.fullDetails')}
            </Link>
          )}
        </div>
      )}
    </section>
  )
}
