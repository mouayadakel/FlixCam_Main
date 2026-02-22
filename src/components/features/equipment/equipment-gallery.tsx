/**
 * Equipment image gallery – main image with smooth crossfade transitions,
 * scrollable thumbnail strip, zoom cursor hint, elegant empty state.
 */

'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { isExternalImageUrl } from '@/lib/utils/image.utils'
import { ImageOff, ChevronLeft, ChevronRight } from 'lucide-react'

interface EquipmentGalleryProps {
  media: { id: string; url: string; type: string }[]
  alt: string
}

export function EquipmentGallery({ media, alt }: EquipmentGalleryProps) {
  const [selected, setSelected] = useState(0)
  const items = media.length > 0 ? media : []

  const goTo = useCallback(
    (index: number) => {
      if (index < 0) setSelected(items.length - 1)
      else if (index >= items.length) setSelected(0)
      else setSelected(index)
    },
    [items.length]
  )

  if (items.length === 0) {
    return (
      <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-2xl border border-border-light/60 bg-surface-light text-text-muted">
        <ImageOff className="h-10 w-10 text-text-muted/40" />
        <span className="text-sm">لا توجد صور</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Main image with navigation arrows */}
      <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-border-light/60 bg-surface-light shadow-card">
        {/* Images stacked for crossfade */}
        {items.map((m, i) => (
          <div
            key={m.id}
            className={cn(
              'absolute inset-0 transition-opacity duration-500 ease-in-out',
              i === selected ? 'z-10 opacity-100' : 'z-0 opacity-0'
            )}
          >
            <Image
              src={m.url}
              alt={`${alt} - ${i + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority={i === 0}
              unoptimized={isExternalImageUrl(m.url)}
            />
          </div>
        ))}

        {/* Navigation arrows (only when multiple images) */}
        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(selected - 1)}
              className="absolute start-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-text-heading opacity-0 shadow-md backdrop-blur-sm transition-all duration-300 hover:bg-white hover:shadow-lg active:scale-95 group-hover:opacity-100"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => goTo(selected + 1)}
              className="absolute end-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-text-heading opacity-0 shadow-md backdrop-blur-sm transition-all duration-300 hover:bg-white hover:shadow-lg active:scale-95 group-hover:opacity-100"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Image counter */}
        {items.length > 1 && (
          <span className="absolute bottom-3 end-3 z-20 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {selected + 1} / {items.length}
          </span>
        )}
      </div>

      {/* Thumbnail strip */}
      {items.length > 1 && (
        <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
          {items.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelected(i)}
              className={cn(
                'relative h-[68px] w-[92px] shrink-0 overflow-hidden rounded-xl border-2 transition-all duration-200',
                selected === i
                  ? 'border-brand-primary shadow-md ring-2 ring-brand-primary/20'
                  : 'border-transparent opacity-70 hover:border-border-light hover:opacity-100'
              )}
            >
              <Image src={m.url} alt={`${alt} - thumbnail ${i + 1}`} fill className="object-cover" sizes="92px" unoptimized={isExternalImageUrl(m.url)} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
