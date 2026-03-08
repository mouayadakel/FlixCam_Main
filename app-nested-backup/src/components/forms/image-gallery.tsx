/**
 * @file image-gallery.tsx
 * @description Image gallery component with multiple images, reorder, and delete
 * @module components/forms
 */

'use client'

import { useState, useRef } from 'react'
import { Upload, X, GripVertical, Link as LinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface ImageGalleryProps {
  value?: string[]
  onChange: (urls: string[]) => void
  label?: string
  equipmentId?: string
  className?: string
}

export function ImageGallery({
  value = [],
  onChange,
  label = 'Gallery Images',
  equipmentId,
  className,
}: ImageGalleryProps) {
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url'>('url')
  const [urlInput, setUrlInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [images, setImages] = useState<string[]>(value)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const updateImages = (newImages: string[]) => {
    setImages(newImages)
    onChange(newImages)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setUploading(true)

    try {
      const newUrls: string[] = []

      for (const file of files) {
        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
          alert(`File ${file.name} exceeds 10MB limit`)
          continue
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
          alert(`File ${file.name} is not an image`)
          continue
        }

        // Upload file if equipmentId is provided
        if (equipmentId) {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('equipmentId', equipmentId)

          const response = await fetch('/api/media/upload', {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to upload image')
          }

          const media = await response.json()
          newUrls.push(media.url)
        } else {
          // For new equipment, use data URL temporarily
          const dataUrl = URL.createObjectURL(file)
          newUrls.push(dataUrl)
        }
      }

      updateImages([...images, ...newUrls])
      setUrlInput('')
    } catch (error) {
      console.error('Error uploading images:', error)
      alert(error instanceof Error ? error.message : 'Failed to upload images')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleAddUrl = () => {
    if (urlInput.trim()) {
      updateImages([...images, urlInput.trim()])
      setUrlInput('')
    }
  }

  const handleRemove = (index: number) => {
    updateImages(images.filter((_, i) => i !== index))
  }

  const handleMove = (fromIndex: number, toIndex: number) => {
    const newImages = [...images]
    const [removed] = newImages.splice(fromIndex, 1)
    newImages.splice(toIndex, 0, removed)
    updateImages(newImages)
  }

  return (
    <div className={cn('space-y-4', className)} dir="rtl">
      <Label>{label}</Label>

      <Tabs value={uploadMethod} onValueChange={(v) => setUploadMethod(v as 'file' | 'url')}>
        <TabsList>
          <TabsTrigger value="url">
            <LinkIcon className="ms-2 h-4 w-4" />
            إضافة رابط
          </TabsTrigger>
          <TabsTrigger value="file">
            <Upload className="ms-2 h-4 w-4" />
            رفع ملفات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="url" className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="https://example.com/image.jpg"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddUrl()
                }
              }}
              dir="ltr"
            />
            <Button type="button" onClick={handleAddUrl} disabled={!urlInput.trim()}>
              إضافة
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="file" className="space-y-4">
          {!equipmentId && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="mb-1 font-medium">ملاحظة: للمعدات الجديدة</p>
              <p className="text-xs">
                رفع الملفات متاح فقط بعد إنشاء المعدة. يُفضل استخدام روابط URLs للصور في هذه
                المرحلة. يمكنك رفع الملفات لاحقاً من صفحة التعديل.
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              disabled={uploading || !equipmentId}
              className="hidden"
              id="gallery-upload-input"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !equipmentId}
            >
              {uploading ? (
                <>جاري الرفع...</>
              ) : !equipmentId ? (
                <>
                  <Upload className="ms-2 h-4 w-4 opacity-50" />
                  غير متاح (استخدم URLs)
                </>
              ) : (
                <>
                  <Upload className="ms-2 h-4 w-4" />
                  اختر صور
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-neutral-500">
            {equipmentId
              ? 'الحد الأقصى: 10MB لكل صورة. أنواع الصور المدعومة: JPG, PNG, WebP, GIF, SVG'
              : 'للمعدات الجديدة: استخدم روابط URLs للصور. يمكنك رفع الملفات بعد إنشاء المعدة.'}
          </p>
        </TabsContent>
      </Tabs>

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {images.map((url, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-lg border border-neutral-200"
            >
              <div className="relative aspect-square bg-neutral-100">
                <Image
                  src={url}
                  alt={`Gallery ${index + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                {index > 0 && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleMove(index, index - 1)}
                  >
                    <GripVertical className="h-4 w-4 rotate-90" />
                  </Button>
                )}
                {index < images.length - 1 && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleMove(index, index + 1)}
                  >
                    <GripVertical className="h-4 w-4 -rotate-90" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRemove(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="absolute start-1 top-1 rounded bg-black/70 px-2 py-1 text-xs text-white">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && (
        <div className="rounded-lg border border-dashed py-8 text-center text-neutral-500">
          لا توجد صور في المعرض
        </div>
      )}
    </div>
  )
}
