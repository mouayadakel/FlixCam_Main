/**
 * Crew role profile — bio, experience, specialties (from equipment customFields.crewProfile).
 */

'use client'

import Image from 'next/image'
import { User } from 'lucide-react'
import { useLocale } from '@/hooks/use-locale'
import { getLocalizedCrewProfile } from '@/lib/utils/crew-equipment.utils'
import { isExternalImageUrl } from '@/lib/utils/image.utils'

interface CrewProfileCardProps {
  customFields?: Record<string, unknown> | null
  fallbackTitle?: string
}

export function CrewProfileCard({ customFields, fallbackTitle }: CrewProfileCardProps) {
  const { t, locale } = useLocale()
  const profile = getLocalizedCrewProfile(customFields, locale)
  if (!profile && !fallbackTitle) return null

  const name = profile?.name || fallbackTitle || ''
  const photoUrl = profile?.photoUrl

  return (
    <section className="rounded-2xl border border-border-light/60 bg-surface-light/50 p-5 md:p-6">
      <h2 className="mb-4 text-lg font-semibold text-text-heading">{t('equipment.crewProfileTitle')}</h2>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-white shadow-sm">
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt={name}
              fill
              className="object-cover"
              sizes="96px"
              unoptimized={isExternalImageUrl(photoUrl)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-text-muted">
              <User className="h-10 w-10" aria-hidden />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {name ? <p className="text-base font-semibold text-text-heading">{name}</p> : null}
          {profile?.experienceYears != null && profile.experienceYears > 0 ? (
            <p className="text-sm text-text-muted">
              {t('equipment.crewExperienceYears').replace(
                '{years}',
                String(profile.experienceYears)
              )}
            </p>
          ) : null}
          {profile?.bio ? (
            <p className="text-sm leading-relaxed text-text-body">{profile.bio}</p>
          ) : null}
          {profile?.specialties && profile.specialties.length > 0 ? (
            <ul className="flex flex-wrap gap-2 pt-1">
              {profile.specialties.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-white px-3 py-1 text-xs font-medium text-text-heading shadow-sm"
                >
                  {tag}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  )
}
