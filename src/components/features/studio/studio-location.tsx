/**
 * Studio location: address, Google Maps, arrival time, parking
 */

'use client'

import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { MapPin, Copy, ExternalLink } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useLocale } from '@/hooks/use-locale'
import type { StudioPublicData } from '@/lib/types/studio.types'

interface StudioLocationProps {
  studio: StudioPublicData
}

export function StudioLocation({ studio }: StudioLocationProps) {
  const { toast } = useToast()
  const { t } = useLocale()

  const copyAddress = useCallback(() => {
    if (!studio.address) return
    navigator.clipboard.writeText(studio.address)
    toast({ title: t('common.done'), description: t('studios.addressCopied') })
  }, [studio.address, toast, t])

  if (!studio.address && !studio.googleMapsUrl) return null

  return (
    <section
      className="space-y-4 rounded-2xl border border-border-light/40 bg-white p-6 shadow-card"
      dir="rtl"
    >
      <h3 className="flex items-center gap-2 text-lg font-semibold text-text-heading">
        <MapPin className="h-5 w-5 text-primary" />
        {t('studios.location')}
      </h3>
      {studio.address && (
        <div className="flex items-start justify-between gap-3 rounded-xl bg-surface-light p-3">
          <p className="text-sm leading-relaxed text-text-body">{studio.address}</p>
          <Button
            variant="ghost"
            size="icon"
            onClick={copyAddress}
            aria-label={t('studios.copyAddress')}
            className="shrink-0"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {studio.googleMapsUrl && (
          <Button variant="outline" size="sm" asChild className="rounded-xl">
            <a
              href={studio.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              {t('studios.openInGoogleMaps')}
            </a>
          </Button>
        )}
      </div>
      {studio.arrivalTimeFromCenter && (
        <p className="text-sm text-text-muted">
          {t('studios.arrivalTime')}: {studio.arrivalTimeFromCenter}
        </p>
      )}
      {studio.parkingNotes && <p className="text-sm text-text-muted">{studio.parkingNotes}</p>}
    </section>
  )
}
