/**
 * @file video-url-input.tsx
 * @description Video URL input with preview
 * @module components/forms
 */

'use client'

import { useState } from 'react'
import { Video, X, Link as LinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface VideoUrlInputProps {
  value?: string
  onChange: (url: string) => void
  onDelete?: () => void
  label?: string
  className?: string
}

export function VideoUrlInput({
  value = '',
  onChange,
  onDelete,
  label = 'Video URL',
  className,
}: VideoUrlInputProps) {
  const [url, setUrl] = useState(value)

  const handleChange = (newUrl: string) => {
    setUrl(newUrl)
    onChange(newUrl)
  }

  const handleDelete = () => {
    setUrl('')
    onChange('')
    if (onDelete) {
      onDelete()
    }
  }

  const getEmbedUrl = (videoUrl: string): string | null => {
    try {
      const url = new URL(videoUrl)

      // YouTube
      if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
        const videoId = url.hostname.includes('youtu.be')
          ? url.pathname.slice(1)
          : url.searchParams.get('v')
        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}`
        }
      }

      // Vimeo
      if (url.hostname.includes('vimeo.com')) {
        const videoId = url.pathname.split('/').pop()
        if (videoId) {
          return `https://player.vimeo.com/video/${videoId}`
        }
      }

      return null
    } catch {
      return null
    }
  }

  const embedUrl = url ? getEmbedUrl(url) : null

  return (
    <div className={cn('space-y-4', className)} dir="rtl">
      <Label>{label}</Label>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <LinkIcon className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            type="url"
            placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
            value={url}
            onChange={(e) => handleChange(e.target.value)}
            className="pe-10"
            dir="ltr"
          />
        </div>
        {url && (
          <Button type="button" variant="destructive" onClick={handleDelete}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {embedUrl ? (
        <div className="relative aspect-video overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
          <iframe
            src={embedUrl}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Video preview"
          />
        </div>
      ) : url ? (
        <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <Video className="h-5 w-5 text-neutral-400" />
          <span className="text-sm text-neutral-600">
            رابط فيديو غير مدعوم للمعاينة. سيتم حفظ الرابط كما هو.
          </span>
        </div>
      ) : null}
    </div>
  )
}
