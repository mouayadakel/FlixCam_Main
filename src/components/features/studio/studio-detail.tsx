/**
 * Studio detail: gallery, info, booking form (Phase 2.4).
 */

'use client'

import Image from 'next/image'
import { useLocale } from '@/hooks/use-locale'
import { StudioBookingForm } from './studio-booking-form'

interface StudioDetailProps {
  studio: {
    id: string
    name: string
    slug: string
    description: string | null
    capacity: number | null
    hourlyRate: number
    media: { id: string; url: string; type: string }[]
    addOns: { id: string; name: string; price: number }[]
  }
}

export function StudioDetail({ studio }: StudioDetailProps) {
  const { t } = useLocale()

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{studio.name}</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {studio.media.length > 0 ? (
            <div className="aspect-video relative rounded-lg overflow-hidden bg-muted">
              <Image
                src={studio.media[0].url}
                alt={studio.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 66vw"
                priority
              />
            </div>
          ) : (
            <div className="aspect-video rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
              No image
            </div>
          )}
          {studio.description && (
            <p className="text-muted-foreground">{studio.description}</p>
          )}
          {studio.capacity != null && (
            <p className="text-sm">Capacity: {studio.capacity}</p>
          )}
          {studio.addOns.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Add-ons</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                {studio.addOns.map((a) => (
                  <li key={a.id}>{a.name} — {a.price.toLocaleString()} SAR</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div>
          <StudioBookingForm studioSlug={studio.slug} hourlyRate={studio.hourlyRate} />
        </div>
      </div>
    </div>
  )
}
