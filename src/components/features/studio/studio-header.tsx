/**
 * Studio header: name, subtitle, availability badge, CTA
 */

'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLocale } from '@/hooks/use-locale'
import { Maximize2, Building2, Sparkles, CalendarDays, Share2 } from 'lucide-react'
import type { StudioPublicData } from '@/lib/types/studio.types'

interface StudioHeaderProps {
  studio: StudioPublicData
}

export function StudioHeader({ studio }: StudioHeaderProps) {
  const { t } = useLocale()
  const isAvailableNow = studio.availabilityConfidence === 'available_now'

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title: studio.name, url: window.location.href }).catch(() => {})
    } else if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  return (
    <header className="space-y-4" dir="rtl">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-section-title text-text-heading">{studio.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-text-muted">
            {studio.studioType && (
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {studio.studioType}
              </span>
            )}
            {studio.areaSqm != null && (
              <span className="inline-flex items-center gap-1">
                <Maximize2 className="h-3.5 w-3.5" />
                {studio.areaSqm} م²
              </span>
            )}
            {studio.bestUse && (
              <span className="inline-flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                {studio.bestUse}
              </span>
            )}
            {studio.heroTagline && (
              <p className="mt-1 text-sm text-text-muted">{studio.heroTagline}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleShare}
          className="shrink-0 rounded-xl border border-border-light/60 p-2.5 text-text-muted transition-colors hover:bg-surface-light hover:text-text-heading"
          aria-label="Share"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {studio.availabilityConfidence && (
          <Badge
            className={`text-xs ${
              isAvailableNow
                ? 'border-success-500/30 bg-success-50 text-success-700'
                : 'border-warning-500/30 bg-warning-50 text-warning-700'
            }`}
          >
            {isAvailableNow ? t('studios.availableToday') : t('studios.requiresConfirmation')}
          </Badge>
        )}
        {studio.hourlyRate > 0 && (
          <Badge className="border-primary/20 bg-primary-50 text-xs text-primary-700">
            {Number(studio.hourlyRate).toLocaleString()} ر.س / ساعة
          </Badge>
        )}
        <Button asChild size="sm" className="rounded-xl shadow-glow">
          <Link href="#booking-panel" className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {t('studios.chooseTime')}
          </Link>
        </Button>
      </div>
    </header>
  )
}
