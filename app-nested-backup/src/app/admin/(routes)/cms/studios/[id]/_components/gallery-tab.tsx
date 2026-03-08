/**
 * Gallery tab: images, video URL, disclaimer
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ChevronUp, ChevronDown, Trash2, Loader2, Upload } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface MediaItem {
  id: string
  url: string
  type: string
  sortOrder: number | null
}

interface GalleryTabProps {
  studioId: string
  slug: string
  onRefresh: () => void
}

export function CmsStudioGalleryTab({ studioId, onRefresh }: GalleryTabProps) {
  const { toast } = useToast()
  const [media, setMedia] = useState<MediaItem[]>([])
  const [videoUrl, setVideoUrl] = useState('')
  const [galleryDisclaimer, setGalleryDisclaimer] = useState('')
  const [loading, setLoading] = useState(true)
  const [reordering, setReordering] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      try {
        const [mediaRes, studioRes] = await Promise.all([
          fetch(`/api/admin/studios/${studioId}/media`),
          fetch(`/api/admin/studios/${studioId}`),
        ])
        if (mediaRes.ok) {
          const m = await mediaRes.json()
          setMedia(m.data ?? [])
        }
        if (studioRes.ok) {
          const s = await studioRes.json()
          setVideoUrl((s.videoUrl as string) ?? '')
          setGalleryDisclaimer((s.galleryDisclaimer as string) ?? '')
        }
      } catch {
        toast({ title: 'خطأ', description: 'فشل التحميل', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [studioId, toast])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('studioId', studioId)
      const res = await fetch('/api/media/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')
      toast({ title: 'تم', description: 'تم رفع الصورة' })
      onRefresh()
      const mRes = await fetch(`/api/admin/studios/${studioId}/media`)
      if (mRes.ok) {
        const m = await mRes.json()
        setMedia(m.data ?? [])
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل الرفع', variant: 'destructive' })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDelete = async (mediaId: string) => {
    try {
      const res = await fetch(`/api/admin/studios/${studioId}/media/${mediaId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Delete failed')
      setMedia((prev) => prev.filter((m) => m.id !== mediaId))
      toast({ title: 'تم', description: 'تم حذف الصورة' })
    } catch {
      toast({ title: 'خطأ', description: 'فشل الحذف', variant: 'destructive' })
    }
  }

  const moveItem = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= media.length) return
    const reordered = [...media]
    ;[reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]]
    const orderedIds = reordered.map((m) => m.id)
    setReordering(true)
    try {
      const res = await fetch(`/api/admin/studios/${studioId}/media/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
      })
      if (!res.ok) throw new Error('Reorder failed')
      setMedia(reordered)
      toast({ title: 'تم', description: 'تم تغيير الترتيب' })
    } catch {
      toast({ title: 'خطأ', description: 'فشل تغيير الترتيب', variant: 'destructive' })
    } finally {
      setReordering(false)
    }
  }

  const saveVideoAndDisclaimer = async () => {
    try {
      const res = await fetch(`/api/admin/studios/${studioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: videoUrl.trim() || null,
          galleryDisclaimer: galleryDisclaimer.trim() || null,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      toast({ title: 'تم', description: 'تم الحفظ' })
    } catch {
      toast({ title: 'خطأ', description: 'فشل الحفظ', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>المعرض</CardTitle>
        <CardDescription>الصور، الفيديو، ونص التوضيح</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label>الصور</Label>
          <div className="mt-2 grid grid-cols-2 gap-4 md:grid-cols-3">
            {media.map((m, i) => (
              <div key={m.id} className="relative overflow-hidden rounded-lg border bg-muted">
                <div className="relative aspect-square">
                  <Image
                    src={m.url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                </div>
                <div className="absolute start-2 top-2 flex gap-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    disabled={i === 0 || reordering}
                    onClick={() => moveItem(i, 'up')}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    disabled={i === media.length - 1 || reordering}
                    onClick={() => moveItem(i, 'down')}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute end-2 top-2 h-8 w-8"
                  onClick={() => handleDelete(m.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div
              className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 transition-colors hover:border-primary hover:bg-muted/50"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
                aria-label="رفع صورة للمعرض"
              />
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="mt-2 text-sm text-muted-foreground">إضافة صورة</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="videoUrl">رابط الفيديو (اختياري)</Label>
          <Input
            id="videoUrl"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://youtube.com/..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="galleryDisclaimer">توضيح المعرض</Label>
          <Textarea
            id="galleryDisclaimer"
            value={galleryDisclaimer}
            onChange={(e) => setGalleryDisclaimer(e.target.value)}
            placeholder="الصور من جلسات حقيقية أو صور تسويقية"
            rows={2}
            dir="rtl"
          />
        </div>
        <Button onClick={saveVideoAndDisclaimer}>حفظ الفيديو والتوضيح</Button>
      </CardContent>
    </Card>
  )
}
