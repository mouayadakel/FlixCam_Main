/**
 * Studio what's included / not included + amenities
 */

'use client'

import { Check, X } from 'lucide-react'
import { useLocale } from '@/hooks/use-locale'
import type { StudioPublicData } from '@/lib/types/studio.types'

interface StudioWhatsIncludedProps {
  studio: StudioPublicData
}

function parseBullets(text: string | null): string[] {
  if (!text?.trim()) return []
  try {
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed.filter(Boolean) : text.split('\n').filter(Boolean)
  } catch {
    return text.split('\n').filter(Boolean)
  }
}

export function StudioWhatsIncluded({ studio }: StudioWhatsIncludedProps) {
  const { t } = useLocale()
  const included = parseBullets(studio.whatsIncluded)
  const notIncluded = parseBullets(studio.notIncluded)
  const amenities = [
    studio.hasElectricity && t('studios.amenityElectricity'),
    studio.hasAC && t('studios.amenityAC'),
    studio.hasChangingRooms && t('studios.amenityChangingRooms'),
    studio.hasWifi && t('studios.amenityWifi'),
  ].filter(Boolean) as string[]

  if (
    included.length === 0 &&
    notIncluded.length === 0 &&
    amenities.length === 0 &&
    studio.capacity == null
  ) {
    return null
  }

  return (
    <section
      className="space-y-5 rounded-2xl border border-border-light/40 bg-white p-6 shadow-card"
      dir="rtl"
    >
      <h3 className="text-lg font-semibold text-text-heading">{t('studios.whatsIncluded')}</h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {included.length > 0 && (
          <div className="space-y-2">
            {included.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-50">
                  <Check className="h-3 w-3 text-success-600" />
                </span>
                <span className="text-text-body">{item}</span>
              </div>
            ))}
          </div>
        )}
        {notIncluded.length > 0 && (
          <div className="space-y-2">
            {notIncluded.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-100">
                  <X className="h-3 w-3 text-neutral-400" />
                </span>
                <span className="text-text-muted">{item}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {amenities.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {amenities.map((a) => (
            <span
              key={a}
              className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700"
            >
              {a}
            </span>
          ))}
        </div>
      )}
      {studio.capacity != null && (
        <p className="text-sm text-text-muted">
          {t('studios.capacityUpTo').replace('{count}', String(studio.capacity))}
        </p>
      )}
    </section>
  )
}
