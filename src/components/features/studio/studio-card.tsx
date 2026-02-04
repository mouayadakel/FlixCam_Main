/**
 * Studio card for list (Phase 2.4).
 */

import Link from 'next/link'
import Image from 'next/image'
import { useLocale } from '@/hooks/use-locale'

interface StudioCardProps {
  studio: {
    id: string
    name: string
    slug: string
    description: string | null
    capacity: number | null
    hourlyRate: number
    media: { url: string; type: string }[]
  }
}

export function StudioCard({ studio }: StudioCardProps) {
  const { t } = useLocale()

  return (
    <Link
      href={`/studios/${studio.slug}`}
      className="group rounded-lg border bg-card overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="aspect-[16/10] relative bg-muted">
        {studio.media[0]?.url ? (
          <Image
            src={studio.media[0].url}
            alt={studio.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
            No image
          </div>
        )}
      </div>
      <div className="p-4">
        <h2 className="font-semibold">{studio.name}</h2>
        {studio.capacity != null && (
          <p className="text-sm text-muted-foreground">Capacity: {studio.capacity}</p>
        )}
        <p className="text-sm font-medium mt-1">
          {studio.hourlyRate > 0
            ? `${Number(studio.hourlyRate).toLocaleString()} SAR / hour`
            : '—'}
        </p>
      </div>
    </Link>
  )
}
