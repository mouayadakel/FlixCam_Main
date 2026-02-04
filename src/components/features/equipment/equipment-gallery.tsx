/**
 * Equipment image gallery (Phase 2.3).
 */

'use client'

import { useState } from 'react'
import Image from 'next/image'

interface EquipmentGalleryProps {
  media: { id: string; url: string; type: string }[]
  alt: string
}

export function EquipmentGallery({ media, alt }: EquipmentGalleryProps) {
  const [selected, setSelected] = useState(0)
  const items = media.length > 0 ? media : []

  if (items.length === 0) {
    return (
      <div className="aspect-[4/3] rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
        No image
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="aspect-[4/3] relative rounded-lg overflow-hidden bg-muted">
        <Image
          src={items[selected].url}
          alt={`${alt} - ${selected + 1}`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
      </div>
      {items.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {items.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelected(i)}
              className={`relative h-16 w-24 shrink-0 rounded-md overflow-hidden border-2 transition-colors ${
                selected === i ? 'border-primary' : 'border-transparent'
              }`}
            >
              <Image
                src={m.url}
                alt=""
                fill
                className="object-cover"
                sizes="96px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
