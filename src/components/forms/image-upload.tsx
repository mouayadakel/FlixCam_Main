/**
 * @file image-upload.tsx
 * @description Image upload component with file upload and URL input
 * @module components/forms
 */

'use client'

import { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon, Link as LinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface ImageUploadProps {
  value?: string
  onChange: (url: string) => void
  onDelete?: () => void
  label?: string
  equipmentId?: string
  className?: string
}

export function ImageUpload({
  value,
  onChange,
  onDelete,
  label = 'Featured Image',
  equipmentId,
  className,
}: ImageUploadProps) {
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url'>('url')
  const [urlValue, setUrlValue] = useState(value || '')
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(value || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit')
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    setUploading(true)

    try {
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)

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
        onChange(media.url)
        setUrlValue(media.url)
      } else {
        // For new equipment, use data URL temporarily
        // The actual upload will happen when equipment is created
        const dataUrl = URL.createObjectURL(file)
        onChange(dataUrl)
        setUrlValue(dataUrl)
        // Note: This will need to be uploaded after equipment creation
        // For now, we'll store it as a data URL and handle upload in the form submission
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      alert(error instanceof Error ? error.message : 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleUrlChange = (url: string) => {
    setUrlValue(url)
    onChange(url)
    setPreview(url || null)
  }

  const handleDelete = () => {
    setUrlValue('')
    setPreview(null)
    onChange('')
    if (onDelete) {
      onDelete()
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={cn('space-y-4', className)} dir="rtl">
      <Label>{label}</Label>

      <Tabs value={uploadMethod} onValueChange={(v) => setUploadMethod(v as 'file' | 'url')}>
        <TabsList>
          <TabsTrigger value="url">
            <LinkIcon className="ml-2 h-4 w-4" />
            رابط URL
          </TabsTrigger>
          <TabsTrigger value="file">
            <Upload className="ml-2 h-4 w-4" />
            رفع ملف
          </TabsTrigger>
        </TabsList>

        <TabsContent value="url" className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="https://example.com/image.jpg"
              value={urlValue}
              onChange={(e) => handleUrlChange(e.target.value)}
              dir="ltr"
            />
          </div>
        </TabsContent>

        <TabsContent value="file" className="space-y-4">
          {!equipmentId && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-medium mb-1">ملاحظة: للمعدات الجديدة</p>
              <p className="text-xs">
                رفع الملفات متاح فقط بعد إنشاء المعدة. يُفضل استخدام رابط URL للصور في هذه المرحلة.
                يمكنك رفع الملفات لاحقاً من صفحة التعديل.
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={uploading || !equipmentId}
              className="hidden"
              id="image-upload-input"
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
                  <Upload className="ml-2 h-4 w-4 opacity-50" />
                  غير متاح (استخدم URL)
                </>
              ) : (
                <>
                  <Upload className="ml-2 h-4 w-4" />
                  اختر صورة
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-neutral-500">
            {equipmentId 
              ? 'الحد الأقصى: 10MB. أنواع الصور المدعومة: JPG, PNG, WebP, GIF, SVG'
              : 'للمعدات الجديدة: استخدم رابط URL للصور. يمكنك رفع الملفات بعد إنشاء المعدة.'}
          </p>
        </TabsContent>
      </Tabs>

      {preview && (
        <div className="relative w-full max-w-md rounded-lg border border-neutral-200 overflow-hidden">
          <div className="relative aspect-video bg-neutral-100">
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 left-2"
            onClick={handleDelete}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
