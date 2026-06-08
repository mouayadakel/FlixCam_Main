/**
 * Gallery tab: Card image and Cover image
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, ImageIcon, Loader2, X, Info } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { uploadMediaFile } from '@/lib/utils/media-upload.client'

interface GalleryTabProps {
  cmsData: any
  onSave: (data: any) => Promise<void>
  onDirtyChange: (dirty: boolean) => void
  saving: boolean
}

export function CmsPackageGalleryTab({ cmsData, onSave, onDirtyChange, saving }: GalleryTabProps) {
  const { toast } = useToast()
  const [form, setForm] = useState({
    cardImageUrl: '',
    coverImageUrl: '',
  })
  const [uploading, setUploading] = useState<'card' | 'cover' | null>(null)
  
  const cardInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (cmsData) {
      setForm({
        cardImageUrl: cmsData.cardImageUrl ?? '',
        coverImageUrl: cmsData.coverImageUrl ?? '',
      })
    }
  }, [cmsData])

  const handleChange = (patch: any) => {
    setForm((f) => ({ ...f, ...patch }))
    onDirtyChange(true)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'card' | 'cover') => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(type)
    try {
      const res = await uploadMediaFile({ file, cmsFolder: 'packages' })
      handleChange({ [type === 'card' ? 'cardImageUrl' : 'coverImageUrl']: res.url })
      toast({ title: 'تم الرفع', description: 'تم تحديث الصورة بنجاح' })
    } catch (err) {
      toast({
        title: 'خطأ في الرفع',
        description: err instanceof Error ? err.message : 'فشل رفع الصورة',
        variant: 'destructive',
      })
    } finally {
      setUploading(null)
      e.target.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave({
      ...cmsData,
      ...form,
    })
    onDirtyChange(false)
  }

  return (
    <Card dir="rtl">
      <CardHeader>
        <CardTitle>الصور والمعرض</CardTitle>
        <CardDescription>ارفع صورة الكارت وصورة الغلاف (Cover) لصفحة الباقة</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid gap-8 md:grid-cols-2">
            {/* Card Image */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2 font-semibold">
                <ImageIcon className="h-4 w-4" />
                <span>صورة الكارت (تظهر في القائمة)</span>
              </Label>
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border-2 border-dashed bg-muted flex flex-col items-center justify-center text-muted-foreground group">
                {form.cardImageUrl ? (
                  <>
                    <Image
                      src={form.cardImageUrl}
                      alt="Card Preview"
                      fill
                      className="object-cover transition-opacity group-hover:opacity-40"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button type="button" variant="secondary" size="sm" onClick={() => cardInputRef.current?.click()}>تغيير الصورة</Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4 cursor-pointer" onClick={() => cardInputRef.current?.click()}>
                    <Upload className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p className="text-xs">اضغط هنا لرفع صورة الكارت</p>
                  </div>
                )}
                {uploading === 'card' && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="card-url" className="text-xs">أو رابط الصورة المباشر</Label>
                <div className="flex gap-2">
                  <Input
                    id="card-url"
                    value={form.cardImageUrl}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange({ cardImageUrl: e.target.value })}
                    placeholder="https://..."
                    className="text-start"
                    dir="ltr"
                  />
                  {form.cardImageUrl && (
                    <Button type="button" variant="outline" size="icon" onClick={() => handleChange({ cardImageUrl: '' })}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Cover Image */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2 font-semibold">
                <ImageIcon className="h-4 w-4" />
                <span>صورة الغلاف (تظهر في صفحة التفاصيل)</span>
              </Label>
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border-2 border-dashed bg-muted flex flex-col items-center justify-center text-muted-foreground group">
                {form.coverImageUrl ? (
                  <>
                    <Image
                      src={form.coverImageUrl}
                      alt="Cover Preview"
                      fill
                      className="object-cover transition-opacity group-hover:opacity-40"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button type="button" variant="secondary" size="sm" onClick={() => coverInputRef.current?.click()}>تغيير الصورة</Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4 cursor-pointer" onClick={() => coverInputRef.current?.click()}>
                    <Upload className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p className="text-xs">اضغط هنا لرفع صورة الغلاف</p>
                  </div>
                )}
                {uploading === 'cover' && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="cover-url" className="text-xs">أو رابط الصورة المباشر</Label>
                <div className="flex gap-2">
                  <Input
                    id="cover-url"
                    value={form.coverImageUrl}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange({ coverImageUrl: e.target.value })}
                    placeholder="https://..."
                    className="text-start"
                    dir="ltr"
                  />
                  {form.coverImageUrl && (
                    <Button type="button" variant="outline" size="icon" onClick={() => handleChange({ coverImageUrl: '' })}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
            <Info className="h-5 w-5 shrink-0" />
            <p>لأفضل النتائج، استخدم صوراً بنسبة عرض إلى ارتفاع 16:9 وبحجم أقل من 1MB.</p>
          </div>

          <div className="pt-4">
            <Button type="submit" disabled={saving || uploading !== null}>
              {(saving || uploading !== null) ? <Loader2 className="h-4 w-4 animate-spin ms-2" /> : null}
              حفظ الصور
            </Button>
          </div>

          <input ref={cardInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, 'card')} />
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, 'cover')} />
        </form>
      </CardContent>
    </Card>
  )
}
