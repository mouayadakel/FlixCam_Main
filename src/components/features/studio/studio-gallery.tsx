/**
 * Studio gallery: hero + grid, video, disclaimer, lightbox
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/hooks/use-locale'
import { X, ChevronLeft, ChevronRight, Grid3X3, Play } from 'lucide-react'
import type { StudioPublicData } from '@/lib/types/studio.types'

interface StudioGalleryProps {
  studio: StudioPublicData
}

export function StudioGallery({ studio }: StudioGalleryProps) {
  const { t } = useLocale()
  const [showAll, setShowAll] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const media = studio.media ?? []
  const displayCount = showAll ? media.length : Math.min(5, media.length)
  const hasMore = media.length > 5

  const openLightbox = useCallback((i: number) => setLightboxIndex(i), [])
  const closeLightbox = useCallback(() => setLightboxIndex(null), [])
  const nextImage = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null ? (prev + 1) % media.length : null))
  }, [media.length])
  const prevImage = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null ? (prev - 1 + media.length) % media.length : null))
  }, [media.length])

  useEffect(() => {
    if (lightboxIndex === null) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowRight') prevImage()
      if (e.key === 'ArrowLeft') nextImage()
    }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [lightboxIndex, closeLightbox, nextImage, prevImage])

  if (media.length === 0) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        {t('studios.noImages')}
      </div>
    )
  }

  return (
    <section className="space-y-4" dir="rtl">
      {/* ── Bento Grid ── */}
      <div
        className="grid grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl"
        style={{ minHeight: '360px' }}
      >
        {media.slice(0, Math.min(displayCount, 5)).map((m, i) => (
          <button
            key={m.id}
            type="button"
            onClick={() => openLightbox(i)}
            className={`group relative cursor-pointer overflow-hidden bg-muted focus:outline-none focus:ring-2 focus:ring-primary/40 ${
              i === 0 ? 'col-span-2 row-span-2' : media.length === 2 ? 'col-span-2 row-span-2' : ''
            }`}
          >
            <Image
              src={m.url}
              alt={`${studio.name} - ${i + 1}`}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes={i === 0 ? '(max-width: 640px) 100vw, 50vw' : '(max-width: 640px) 50vw, 25vw'}
              priority={i === 0}
            />
            <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
            {/* Show remaining count on last visible image */}
            {i === Math.min(displayCount, 5) - 1 && hasMore && !showAll && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-text-heading shadow-lg">
                  <Grid3X3 className="h-4 w-4" />+{media.length - 5}
                </span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Show all button */}
      {hasMore && !showAll && (
        <Button variant="outline" onClick={() => setShowAll(true)} className="rounded-xl">
          <Grid3X3 className="me-2 h-4 w-4" />
          {t('studios.viewAllPhotos')} ({media.length})
        </Button>
      )}

      {/* Expanded grid */}
      {showAll && media.length > 5 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {media.slice(5).map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => openLightbox(i + 5)}
              aria-label={`${studio.name} - ${i + 6}`}
              className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl bg-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <Image
                src={m.url}
                alt={`${studio.name} - ${i + 6}`}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 50vw, 25vw"
              />
            </button>
          ))}
        </div>
      )}

      {/* ── Video ── */}
      {studio.videoUrl &&
        (() => {
          let embedUrl = studio.videoUrl
          const ytMatch = studio.videoUrl.match(
            /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/
          )
          if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`
          return (
            <div className="relative overflow-hidden rounded-2xl">
              <div className="absolute start-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                <Play className="h-3 w-3" />
                {t('studios.videoTitle')}
              </div>
              <iframe
                src={embedUrl}
                title={t('studios.videoTitle')}
                className="aspect-video w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
          )
        })()}

      {studio.galleryDisclaimer && (
        <p className="text-xs text-muted-foreground">{studio.galleryDisclaimer}</p>
      )}

      {/* ── Lightbox ── */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute end-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              prevImage()
            }}
            className="absolute start-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            aria-label="Previous"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              nextImage()
            }}
            className="absolute end-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            aria-label="Next"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="relative max-h-[85vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <Image
              src={media[lightboxIndex].url}
              alt={`${studio.name} - ${lightboxIndex + 1}`}
              width={1200}
              height={800}
              className="max-h-[85vh] rounded-lg object-contain"
              priority
            />
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 text-sm text-white backdrop-blur-sm">
            {lightboxIndex + 1} / {media.length}
          </div>
        </div>
      )}
    </section>
  )
}
