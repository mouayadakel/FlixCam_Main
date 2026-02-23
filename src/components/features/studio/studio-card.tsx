/**
 * Studio card for list (Phase 2.4).
 */

import Link from 'next/link'
import Image from 'next/image'
import { useLocale } from '@/hooks/use-locale'
import { Badge } from '@/components/ui/badge'
import { getLocalizedName, getLocalizedDescription } from '@/lib/i18n/content-helper'
import { Building2, Users, Maximize2, Zap, Wind, ArrowLeft, MapPin } from 'lucide-react'

interface StudioCardProps {
  studio: {
    id: string
    name: string
    nameEn?: string | null
    nameZh?: string | null
    slug: string
    description: string | null
    descriptionEn?: string | null
    descriptionZh?: string | null
    capacity: number | null
    hourlyRate: number
    areaSqm?: number | null
    studioType?: string | null
    bestUse?: string | null
    availabilityConfidence?: string | null
    hasElectricity?: boolean
    hasAC?: boolean
    hasChangingRooms?: boolean
    address?: string | null
    media: { url: string; type: string }[]
  }
}

export function StudioCard({ studio }: StudioCardProps) {
  const { t, locale } = useLocale()
  const isAvailable = studio.availabilityConfidence === 'available_now'

  const displayName = getLocalizedName(studio as any, locale) || studio.name
  const displayDescription = getLocalizedDescription(studio as any, locale) || studio.description

  const amenities = [
    studio.hasElectricity && { icon: Zap, label: t('studios.amenityElectricity') },
    studio.hasAC && { icon: Wind, label: t('studios.amenityAC') },
  ].filter(Boolean) as { icon: typeof Zap; label: string }[]

  return (
    <Link
      href={`/studios/${studio.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border-light/40 bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
    >
      {/* ── Image ── */}
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {studio.media[0]?.url ? (
          <Image
            src={studio.media[0].url}
            alt={studio.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Building2 className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}
        {/* Overlay gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        {/* Availability badge */}
        {studio.availabilityConfidence && (
          <Badge
            className={`absolute start-3 top-3 text-xs shadow-sm ${
              isAvailable
                ? 'border-success-500/30 bg-success-50 text-success-700'
                : 'border-warning-500/30 bg-warning-50 text-warning-700'
            }`}
          >
            {isAvailable ? t('studios.availableToday') : t('studios.requiresConfirmation')}
          </Badge>
        )}
        {/* Studio type badge */}
        {studio.studioType && (
          <Badge className="absolute end-3 top-3 border-white/30 bg-black/50 text-xs text-white backdrop-blur-sm">
            {studio.studioType}
          </Badge>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex flex-1 flex-col p-5" dir="rtl">
        <h2 className="mb-1.5 line-clamp-1 text-card-title text-text-heading transition-colors group-hover:text-primary">
          {displayName}
        </h2>

        {/* Meta row: area + capacity */}
        <div className="mb-2.5 flex flex-wrap items-center gap-3 text-xs text-text-muted">
          {studio.areaSqm != null && (
            <span className="inline-flex items-center gap-1">
              <Maximize2 className="h-3 w-3" />
              {studio.areaSqm} م²
            </span>
          )}
          {studio.capacity != null && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {studio.capacity} {t('studios.capacity')}
            </span>
          )}
          {studio.address && (
            <span className="inline-flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {studio.address.length > 30 ? studio.address.slice(0, 30) + '...' : studio.address}
              </span>
            </span>
          )}
        </div>

        {/* Description */}
        {displayDescription && (
          <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-text-body">
            {displayDescription}
          </p>
        )}

        {/* Amenity pills */}
        {amenities.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {amenities.map((a) => (
              <span
                key={a.label}
                className="inline-flex items-center gap-1 rounded-full bg-surface-light px-2.5 py-0.5 text-[11px] font-medium text-text-muted"
              >
                <a.icon className="h-3 w-3" />
                {a.label}
              </span>
            ))}
          </div>
        )}

        {/* Best use tag */}
        {studio.bestUse && <p className="mb-3 text-xs text-primary/80">{studio.bestUse}</p>}

        {/* ── Footer: Price + CTA ── */}
        <div className="mt-auto flex items-end justify-between border-t border-border-light/40 pt-3">
          <div>
            {studio.hourlyRate > 0 ? (
              <>
                <span className="text-price-tag text-text-heading">
                  {Number(studio.hourlyRate).toLocaleString()}
                </span>
                <span className="ms-1 text-xs text-text-muted">{t('studios.perHour')}</span>
              </>
            ) : (
              <span className="text-sm text-text-muted">—</span>
            )}
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            {t('studios.viewDetails')}
            <ArrowLeft className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  )
}
