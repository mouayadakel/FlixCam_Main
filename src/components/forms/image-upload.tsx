/**
 * @file image-upload.tsx
 * @description Enhanced image upload component with multi-image support
 * @module components/forms
 */

'use client'

import { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon, Link as LinkIcon, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { EMBED_LTR } from '@/lib/i18n/bidi'
import Image from 'next/image'
import { uploadMediaFile } from '@/lib/utils/media-upload.client'

interface ImageUploadProps {
  value?: string | string[]
  onChange: (value: any) => void
  onDelete?: (url: string) => void
  label?: string
  equipmentId?: string
  inspectionId?: string
  studioId?: string
  cmsFolder?: string
  className?: string
  multiple?: boolean
  disabled?: boolean
}

export function ImageUpload({
  value,
  onChange,
  onDelete,
  label = 'Featured Image',
  equipmentId,
  inspectionId,
  studioId,
  cmsFolder,
  className,
  multiple = false,
  disabled = false,
}: ImageUploadProps) {
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url'>('url')
  const [urlValue, setUrlValue] = useState('')
  const [urlError, setUrlError] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // File upload requires a context ID; without one the API returns 400
  const hasContextId = !!(equipmentId || inspectionId || studioId || cmsFolder)

  const values = Array.isArray(value) ? value : value ? [value] : []

  const normalizeMediaUrl = (rawValue: string): string => {
    const trimmed = rawValue.trim()
    if (!trimmed) return ''
    if (trimmed.startsWith('uploads/')) {
      return `/${trimmed}`
    }
    if (trimmed.startsWith('www.')) {
      return `https://${trimmed}`
    }
    return trimmed
  }

  const isValidMediaUrl = (value: string): boolean => {
    if (!value) return false
    if (
      value.startsWith('/') ||
      value.startsWith('uploads/') ||
      value.startsWith('./uploads/') ||
      value.startsWith('data:')
    ) {
      return true
    }
    try {
      const parsed = new URL(value)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }

  const isLikelyThumbnailUrl = (value: string): boolean => {
    if (!value.startsWith('http://') && !value.startsWith('https://')) {
      return false
    }
    try {
      const parsed = new URL(value)
      const host = parsed.hostname.toLowerCase()
      const path = parsed.pathname.toLowerCase()
      const query = parsed.search.toLowerCase()
      if (host.includes('encrypted-tbn') && host.includes('gstatic.com')) {
        return true
      }
      if (path === '/images' && query.includes('q=tbn:')) {
        return true
      }
      if (query.includes('tbm=isch')) {
        return true
      }
      return false
    } catch {
      return false
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (!hasContextId) {
      alert('رفع الملفات غير متاح حالياً. استخدم رابط URL بدلاً من ذلك.')
      return
    }

    setUploading(true)

    try {
      const uploadedUrls: string[] = []

      for (const file of Array.from(files)) {
        // Validate file size (60MB)
        if (file.size > 60 * 1024 * 1024) continue

        // Validate file type
        if (!file.type.startsWith('image/')) continue

        const media = await uploadMediaFile({
          file,
          equipmentId,
          inspectionId,
          studioId,
          cmsFolder,
        })
        uploadedUrls.push(media.url)
      }

      if (multiple) {
        onChange([...values, ...uploadedUrls])
      } else if (uploadedUrls.length > 0) {
        onChange(uploadedUrls[0])
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      alert(error instanceof Error ? error.message : 'Failed to upload image')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleUrlAdd = () => {
    const normalizedUrl = normalizeMediaUrl(urlValue)
    if (!normalizedUrl) return
    if (!isValidMediaUrl(normalizedUrl)) {
      setUrlError('أدخل رابط صورة صالحاً (https://...) أو مساراً محلياً (/uploads/...)')
      return
    }
    if (isLikelyThumbnailUrl(normalizedUrl)) {
      setUrlError('هذا رابط صورة مصغرة منخفضة الجودة. استخدم رابط الصورة الأصلية بالحجم الكامل.')
      return
    }
    setUrlError('')
    if (multiple) {
      onChange([...values, normalizedUrl])
    } else {
      onChange(normalizedUrl)
    }
    setUrlValue('')
  }

  const handleRemove = (urlToRemove: string) => {
    if (multiple) {
      onChange(values.filter((v) => v !== urlToRemove))
    } else {
      onChange('')
    }
    if (onDelete) onDelete(urlToRemove)
  }

  return (
    <div className={cn('space-y-4', className)} dir="rtl">
      {label && <Label className="text-sm font-semibold">{label}</Label>}

      <div className="flex flex-wrap gap-4">
        {values.map((url, index) => (
          <div key={index} className="relative h-24 w-24 overflow-hidden rounded-lg border border-neutral-200 group shadow-sm">
            <Image src={url} alt={`Upload ${index}`} fill className="object-cover" unoptimized />
            <button
              type="button"
              onClick={() => handleRemove(url)}
              className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {(multiple || values.length === 0) && (
          <div className="flex flex-col gap-2 min-w-[200px]">
            <Tabs value={uploadMethod} onValueChange={(v) => setUploadMethod(v as 'file' | 'url')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-8">
                <TabsTrigger value="url" className="text-[10px]">رابط</TabsTrigger>
                <TabsTrigger value="file" className="text-[10px]">رفع</TabsTrigger>
              </TabsList>

              <TabsContent value="url" className="mt-2 flex gap-2">
                <Input
                  type="url"
                  placeholder="https://..."
                  value={urlValue}
                  onChange={(e) => {
                    setUrlValue(e.target.value)
                    if (urlError) setUrlError('')
                  }}
                  disabled={disabled || uploading}
                  className="h-8 text-xs"
                  dir={EMBED_LTR}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={handleUrlAdd}
                  type="button"
                  disabled={disabled || uploading || !urlValue}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TabsContent>

              <TabsContent value="file" className="mt-2">
                {!hasContextId && (
                  <p className="mb-2 text-[10px] text-amber-600">
                    رفع الملفات متاح فقط بعد الحفظ. استخدم رابط URL.
                  </p>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple={multiple}
                  onChange={handleFileSelect}
                  disabled={disabled || uploading || !hasContextId}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-8 text-xs border-dashed border-2 hover:border-brand-primary/50 group"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || uploading || !hasContextId}
                >
                  <Upload className="ms-2 h-3 w-3 text-muted-foreground group-hover:text-brand-primary" />
                  {uploading ? 'جاري الرفع...' : !hasContextId ? 'غير متاح (استخدم URL)' : 'اختر صور'}
                </Button>
              </TabsContent>
            </Tabs>
            {urlError && <p className="text-[11px] text-red-600">{urlError}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
