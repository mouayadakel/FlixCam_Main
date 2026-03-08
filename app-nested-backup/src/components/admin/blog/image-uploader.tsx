/**
 * Image uploader with drag-drop and URL fallback for blog cover/OG images.
 */

'use client'

import { useState, useRef } from 'react'
import { Upload, Link2, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface ImageUploaderProps {
  value: string
  onChange: (url: string) => void
  label?: string
  placeholder?: string
  className?: string
}

export function ImageUploader({
  value,
  onChange,
  label = 'Cover image',
  placeholder = 'Upload or paste image URL',
  className,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/blog/upload-image', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Upload failed')
      }
      const { url } = await res.json()
      onChange(url)
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file?.type.startsWith('image/')) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/blog/upload-image', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Upload failed')
      }
      const { url } = await res.json()
      onChange(url)
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  const handleUrlSubmit = () => {
    const trimmed = urlInput.trim()
    if (trimmed && (trimmed.startsWith('http://') || trimmed.startsWith('https://'))) {
      onChange(trimmed)
      setUrlInput('')
      setShowUrlInput(false)
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="block text-sm font-medium text-muted-foreground">{label}</label>
      )}
      <div
        className={cn(
          'flex min-h-[140px] flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors cursor-pointer',
          value ? 'border-muted bg-muted/30' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFileSelect}
          disabled={uploading}
        />
        {value ? (
          <div className="relative w-full p-4">
            <img
              src={value}
              alt="Preview"
              className="mx-auto max-h-48 rounded-lg object-contain"
            />
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                <span className="me-2">Replace</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowUrlInput(!showUrlInput)}
              >
                <Link2 className="h-4 w-4" />
                <span className="me-2">URL</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange('')}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="flex w-full flex-col items-center justify-center gap-2 p-6"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="h-10 w-10 text-muted-foreground" />
            )}
            <p className="text-sm text-muted-foreground">
              {uploading ? 'Uploading...' : 'Drag & drop or click to upload'}
            </p>
            <p className="text-xs text-muted-foreground/80">JPEG, PNG, WebP, GIF (max 5MB)</p>
          </div>
        )}
      </div>
      {showUrlInput && (
        <div className="flex gap-2">
          <Input
            placeholder="https://..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
          />
          <Button type="button" variant="secondary" onClick={handleUrlSubmit}>
            Add URL
          </Button>
        </div>
      )}
    </div>
  )
}
