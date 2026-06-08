/**
 * Slide form dialog – create or edit hero slide (media, content, CTA, display, schedule).
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Cropper, { type Area } from 'react-easy-crop'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Upload } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { EMBED_LTR } from '@/lib/i18n/bidi'
import type { CreateSlideInput } from '@/lib/validators/hero-banner.validator'
import { uploadMediaFile } from '@/lib/utils/media-upload.client'

/** Client-side max before upload; server CMS limit matches (see MediaService MAX_CMS_FILE_SIZE). */
const HERO_IMAGE_MAX_BYTES = 30 * 1024 * 1024
/** Compress rasters down to this before POST so the body stays under the 30MB CMS cap. */
const HERO_IMAGE_COMPRESS_TARGET_BYTES = 28 * 1024 * 1024

export interface HeroSlideForEdit {
  id: string
  imageUrl: string
  mobileImageUrl: string | null
  mobileAspectRatio: string
  mobileFocalX: number
  mobileFocalY: number
  desktopAspectRatio: string
  desktopFocalX: number
  desktopFocalY: number
  videoUrl: string | null
  titleAr: string
  titleEn: string
  titleZh: string | null
  subtitleAr: string | null
  subtitleEn: string | null
  subtitleZh: string | null
  badgeTextAr: string | null
  badgeTextEn: string | null
  badgeTextZh: string | null
  ctaTextAr: string | null
  ctaTextEn: string | null
  ctaTextZh: string | null
  ctaUrl: string | null
  ctaStyle: string
  cta2TextAr: string | null
  cta2TextEn: string | null
  cta2TextZh: string | null
  cta2Url: string | null
  cta2Style: string | null
  order: number
  overlayOpacity: number
  textPosition: string
  isActive: boolean
  publishAt: string | null
  unpublishAt: string | null
}

const defaultForm: CreateSlideInput = {
  imageUrl: '',
  mobileImageUrl: '',
  mobileAspectRatio: 'auto',
  mobileFocalX: 50,
  mobileFocalY: 50,
  desktopAspectRatio: '16/9',
  desktopFocalX: 50,
  desktopFocalY: 50,
  videoUrl: '',
  titleAr: '',
  titleEn: '',
  titleZh: '',
  subtitleAr: '',
  subtitleEn: '',
  subtitleZh: '',
  badgeTextAr: '',
  badgeTextEn: '',
  badgeTextZh: '',
  ctaTextAr: '',
  ctaTextEn: '',
  ctaTextZh: '',
  ctaUrl: '',
  ctaStyle: 'primary',
  cta2TextAr: '',
  cta2TextEn: '',
  cta2TextZh: '',
  cta2Url: '',
  cta2Style: null,
  order: 0,
  isActive: true,
  overlayOpacity: 0.3,
  textPosition: 'start',
  publishAt: null,
  unpublishAt: null,
}

export function SlideFormDialog({
  open,
  onOpenChange,
  bannerId,
  slide,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  bannerId: string
  slide: HeroSlideForEdit | null
  onSuccess: () => void
}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState<null | 'desktop' | 'mobile'>(null)
  const desktopImageInputRef = useRef<HTMLInputElement>(null)
  const mobileImageInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<CreateSlideInput>(defaultForm)
  const [cropperOpen, setCropperOpen] = useState(false)
  const [cropperTarget, setCropperTarget] = useState<'mobile' | 'desktop'>('mobile')
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)

  type SlideAspectRatio = NonNullable<CreateSlideInput['mobileAspectRatio']>

  const aspectRatioToClass = (
    ratio: SlideAspectRatio | string | undefined,
    target: 'mobile' | 'desktop' = 'mobile'
  ) => {
    switch (ratio) {
      case '1/1':
        return 'aspect-square'
      case '4/5':
        return 'aspect-[4/5]'
      case '3/4':
        return 'aspect-[3/4]'
      case '9/16':
        return 'aspect-[9/16]'
      case '16/9':
        return 'aspect-video'
      case 'auto':
      default:
        return target === 'desktop' ? 'aspect-video' : 'aspect-[4/3]'
    }
  }

  const isEdit = Boolean(slide?.id)

  useEffect(() => {
    if (slide) {
      setForm({
        imageUrl: slide.imageUrl,
        mobileImageUrl: slide.mobileImageUrl ?? '',
        mobileAspectRatio: (slide.mobileAspectRatio ?? 'auto') as CreateSlideInput['mobileAspectRatio'],
        mobileFocalX: slide.mobileFocalX ?? 50,
        mobileFocalY: slide.mobileFocalY ?? 50,
        desktopAspectRatio: (slide.desktopAspectRatio ?? '16/9') as CreateSlideInput['desktopAspectRatio'],
        desktopFocalX: slide.desktopFocalX ?? 50,
        desktopFocalY: slide.desktopFocalY ?? 50,
        videoUrl: slide.videoUrl ?? '',
        titleAr: slide.titleAr,
        titleEn: slide.titleEn,
        titleZh: slide.titleZh ?? '',
        subtitleAr: slide.subtitleAr ?? '',
        subtitleEn: slide.subtitleEn ?? '',
        subtitleZh: slide.subtitleZh ?? '',
        badgeTextAr: slide.badgeTextAr ?? '',
        badgeTextEn: slide.badgeTextEn ?? '',
        badgeTextZh: slide.badgeTextZh ?? '',
        ctaTextAr: slide.ctaTextAr ?? '',
        ctaTextEn: slide.ctaTextEn ?? '',
        ctaTextZh: slide.ctaTextZh ?? '',
        ctaUrl: slide.ctaUrl ?? '',
        ctaStyle: (slide.ctaStyle ?? 'primary') as CreateSlideInput['ctaStyle'],
        cta2TextAr: slide.cta2TextAr ?? '',
        cta2TextEn: slide.cta2TextEn ?? '',
        cta2TextZh: slide.cta2TextZh ?? '',
        cta2Url: slide.cta2Url ?? '',
        cta2Style: (slide.cta2Style ?? null) as CreateSlideInput['cta2Style'],
        order: slide.order,
        isActive: slide.isActive,
        overlayOpacity: slide.overlayOpacity,
        textPosition: (slide.textPosition ?? 'start') as CreateSlideInput['textPosition'],
        publishAt: slide.publishAt ? new Date(slide.publishAt) : null,
        unpublishAt: slide.unpublishAt ? new Date(slide.unpublishAt) : null,
      })
    } else {
      setForm(defaultForm)
    }
  }, [slide, open])

  const mobilePreviewAspectClass = aspectRatioToClass(form.mobileAspectRatio, 'mobile')
  const desktopPreviewAspectClass = aspectRatioToClass(form.desktopAspectRatio, 'desktop')

  const cropperImageUrl =
    cropperTarget === 'desktop'
      ? (form.imageUrl || '').trim()
      : (form.mobileImageUrl || form.imageUrl || '').trim()
  const mobileFocalX = form.mobileFocalX ?? 50
  const mobileFocalY = form.mobileFocalY ?? 50
  const desktopFocalX = form.desktopFocalX ?? 50
  const desktopFocalY = form.desktopFocalY ?? 50

  const update = (patch: Partial<CreateSlideInput>) => {
    setForm((f) => ({ ...f, ...patch }))
  }

  async function handleHeroImageFile(
    file: File | undefined,
    field: 'imageUrl' | 'mobileImageUrl'
  ) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'خطأ',
        description: 'اختر ملف صورة فقط (PNG، JPEG، WebP، …)',
        variant: 'destructive',
      })
      return
    }
    if (file.size > HERO_IMAGE_MAX_BYTES) {
      toast({
        title: 'خطأ',
        description: 'الحد الأقصى لحجم الصورة 30 ميغابايت',
        variant: 'destructive',
      })
      return
    }
    setUploadingImage(field === 'imageUrl' ? 'desktop' : 'mobile')
    try {
      const media = await uploadMediaFile({
        file,
        cmsFolder: `hero-banners/${bannerId}`,
        compressTargetBytes: HERO_IMAGE_COMPRESS_TARGET_BYTES,
      })
      update({ [field]: media.url })
      toast({ title: 'تم', description: 'تم رفع الصورة' })
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل رفع الصورة',
        variant: 'destructive',
      })
    } finally {
      setUploadingImage(null)
      if (field === 'imageUrl' && desktopImageInputRef.current) {
        desktopImageInputRef.current.value = ''
      }
      if (field === 'mobileImageUrl' && mobileImageInputRef.current) {
        mobileImageInputRef.current.value = ''
      }
    }
  }

  const aspectToNumber = (ratio: SlideAspectRatio | undefined, target: 'mobile' | 'desktop'): number => {
    switch (ratio) {
      case '1/1':
        return 1
      case '4/5':
        return 4 / 5
      case '3/4':
        return 3 / 4
      case '9/16':
        return 9 / 16
      case '16/9':
        return 16 / 9
      case 'auto':
      default:
        return target === 'desktop' ? 16 / 9 : 4 / 5
    }
  }

  const openCropper = (target: 'mobile' | 'desktop') => {
    setCropperTarget(target)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedArea(null)
    setCropperOpen(true)
  }

  const onCropComplete = (_croppedAreaPixels: Area, croppedAreaPercentages: Area) => {
    setCroppedArea(croppedAreaPercentages)
  }

  const applyCropToFocalPoint = () => {
    if (!croppedArea) return
    const centerX = croppedArea.x + croppedArea.width / 2
    const centerY = croppedArea.y + croppedArea.height / 2
    const focal = {
      x: Math.max(0, Math.min(100, centerX)),
      y: Math.max(0, Math.min(100, centerY)),
    }
    if (cropperTarget === 'desktop') {
      update({
        desktopFocalX: focal.x,
        desktopFocalY: focal.y,
      })
      toast({ title: 'تم', description: 'تم حفظ القص للديسكتوب' })
    } else {
      update({
        mobileFocalX: focal.x,
        mobileFocalY: focal.y,
      })
      toast({ title: 'تم', description: 'تم حفظ القص للموبايل' })
    }
    setCropperOpen(false)
  }

  const handleSubmit = async () => {
    if (!form.imageUrl?.trim() || !form.titleAr?.trim() || !form.titleEn?.trim()) {
      toast({
        title: 'خطأ',
        description: 'الصورة والعنوان (عربي وإنجليزي) مطلوبة',
        variant: 'destructive',
      })
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        mobileImageUrl: form.mobileImageUrl || undefined,
        videoUrl: form.videoUrl || undefined,
        titleZh: form.titleZh || undefined,
        subtitleAr: form.subtitleAr || undefined,
        subtitleEn: form.subtitleEn || undefined,
        subtitleZh: form.subtitleZh || undefined,
        badgeTextAr: form.badgeTextAr || undefined,
        badgeTextEn: form.badgeTextEn || undefined,
        badgeTextZh: form.badgeTextZh || undefined,
        ctaTextAr: form.ctaTextAr || undefined,
        ctaTextEn: form.ctaTextEn || undefined,
        ctaTextZh: form.ctaTextZh || undefined,
        ctaUrl: form.ctaUrl || undefined,
        cta2TextAr: form.cta2TextAr || undefined,
        cta2TextEn: form.cta2TextEn || undefined,
        cta2TextZh: form.cta2TextZh || undefined,
        cta2Url: form.cta2Url || undefined,
        publishAt: form.publishAt ?? undefined,
        unpublishAt: form.unpublishAt ?? undefined,
      }
      if (isEdit && slide) {
        const res = await fetch(`/api/admin/hero-banners/${bannerId}/slides/${slide.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error ?? 'Failed to update')
        }
        toast({ title: 'تم', description: 'تم تحديث الشريحة' })
      } else {
        const res = await fetch(`/api/admin/hero-banners/${bannerId}/slides`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error ?? 'Failed to create')
        }
        toast({ title: 'تم', description: 'تم إضافة الشريحة' })
      }
      onSuccess()
      onOpenChange(false)
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل الحفظ',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'تحرير الشريحة' : 'إضافة شريحة'}</DialogTitle>
        </DialogHeader>

        {form.imageUrl && (
          <div className="overflow-hidden rounded-lg border bg-muted/30">
            <div className="relative aspect-video">
              <Image
                src={form.imageUrl}
                alt="Preview"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 672px"
                style={{ objectPosition: `${desktopFocalX}% ${desktopFocalY}%` }}
              />
              <div
                className="hero-slide-overlay absolute inset-0 bg-black transition-opacity"
                style={{ ['--overlay-opacity' as string]: String(form.overlayOpacity) }}
              />
              <div
                className={`absolute inset-0 flex flex-col justify-center p-4 text-white ${
                  form.textPosition === 'center'
                    ? 'items-center text-center'
                    : form.textPosition === 'end'
                      ? 'items-end'
                      : 'items-start'
                }`}
              >
                {form.badgeTextAr && (
                  <span className="mb-2 rounded bg-white/20 px-2 py-0.5 text-xs font-medium">
                    {form.badgeTextAr || form.badgeTextEn}
                  </span>
                )}
                <h3 className="text-xl font-bold">{form.titleAr || form.titleEn}</h3>
                {(form.subtitleAr || form.subtitleEn) && (
                  <p className="mt-1 text-sm opacity-90">{form.subtitleAr || form.subtitleEn}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="media">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="media">وسائط</TabsTrigger>
            <TabsTrigger value="content">نص</TabsTrigger>
            <TabsTrigger value="cta">أزرار</TabsTrigger>
            <TabsTrigger value="display">عرض</TabsTrigger>
            <TabsTrigger value="schedule">جدولة</TabsTrigger>
          </TabsList>
          <TabsContent value="media" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>رابط الصورة (مطلوب)</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  className="min-w-0 flex-1"
                  value={form.imageUrl}
                  onChange={(e) => update({ imageUrl: e.target.value })}
                  placeholder="https://... أو ارفع صورة"
                  dir={EMBED_LTR}
                  disabled={uploadingImage === 'desktop'}
                />
                <input
                  ref={desktopImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleHeroImageFile(e.target.files?.[0], 'imageUrl')}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 gap-2"
                  disabled={uploadingImage !== null}
                  onClick={() => desktopImageInputRef.current?.click()}
                >
                  {uploadingImage === 'desktop' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  رفع صورة
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">الحد الأقصى للرفع: 30 م.ب (صور فقط)</p>
            </div>
            <div className="space-y-3 rounded-lg border p-4">
              <Label className="text-base font-medium">قص ومحاذاة الديسكتوب</Label>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>نسبة أبعاد الديسكتوب (للـ crop)</Label>
                  <Select
                    value={form.desktopAspectRatio}
                    onValueChange={(v) =>
                      update({
                        desktopAspectRatio: v as CreateSlideInput['desktopAspectRatio'],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16/9">16:9 (Hero)</SelectItem>
                      <SelectItem value="1/1">1:1 (Square)</SelectItem>
                      <SelectItem value="4/5">4:5</SelectItem>
                      <SelectItem value="3/4">3:4</SelectItem>
                      <SelectItem value="9/16">9:16</SelectItem>
                      <SelectItem value="auto">Auto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>معاينة Crop للديسكتوب</Label>
                  <div className="overflow-hidden rounded-lg border bg-muted/20 p-2">
                    <div className={`relative w-full ${desktopPreviewAspectClass}`}>
                      <Image
                        src={form.imageUrl as string}
                        alt="Desktop preview"
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 480px"
                        style={{ objectPosition: `${desktopFocalX}% ${desktopFocalY}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!form.imageUrl?.trim()}
                  onClick={() => openCropper('desktop')}
                >
                  قص صورة الديسكتوب (Drag + Zoom)
                </Button>
                <div className="text-sm text-muted-foreground">
                  يُطبق على عرض الموقع في الشاشات الكبيرة (md+).
                </div>
              </div>
              <div className="space-y-3 rounded-lg border bg-muted/10 p-4">
                <Label>Crop focal point (الديسكتوب)</Label>
                <div className="space-y-2">
                  <Label htmlFor="hero-slide-desktop-focal-x" className="text-sm text-muted-foreground">
                    أفقي: {Math.round(desktopFocalX)}%
                  </Label>
                  <input
                    id="hero-slide-desktop-focal-x"
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={desktopFocalX}
                    onChange={(e) => update({ desktopFocalX: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hero-slide-desktop-focal-y" className="text-sm text-muted-foreground">
                    عمودي: {Math.round(desktopFocalY)}%
                  </Label>
                  <input
                    id="hero-slide-desktop-focal-y"
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={desktopFocalY}
                    onChange={(e) => update({ desktopFocalY: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>صورة الموبايل (اختياري)</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  className="min-w-0 flex-1"
                  value={form.mobileImageUrl ?? ''}
                  onChange={(e) => update({ mobileImageUrl: e.target.value })}
                  placeholder="https://... أو ارفع صورة"
                  dir={EMBED_LTR}
                  disabled={uploadingImage === 'mobile'}
                />
                <input
                  ref={mobileImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleHeroImageFile(e.target.files?.[0], 'mobileImageUrl')}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 gap-2"
                  disabled={uploadingImage !== null}
                  onClick={() => mobileImageInputRef.current?.click()}
                >
                  {uploadingImage === 'mobile' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  رفع صورة
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">الحد الأقصى للرفع: 30 م.ب (صور فقط)</p>
            </div>
            <div className="space-y-3 rounded-lg border p-4">
              <Label className="text-base font-medium">قص ومحاذاة الموبايل</Label>
              <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>نسبة أبعاد الموبايل (للـ crop)</Label>
                <Select
                  value={form.mobileAspectRatio}
                  onValueChange={(v) =>
                    update({
                      mobileAspectRatio: v as CreateSlideInput['mobileAspectRatio'],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="1/1">1:1 (Square)</SelectItem>
                    <SelectItem value="4/5">4:5</SelectItem>
                    <SelectItem value="3/4">3:4</SelectItem>
                    <SelectItem value="9/16">9:16 (Story)</SelectItem>
                    <SelectItem value="16/9">16:9</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>معاينة Crop للموبايل</Label>
                <div className="overflow-hidden rounded-lg border bg-muted/20 p-2">
                  <div className={`relative w-full ${mobilePreviewAspectClass}`}>
                    <Image
                      src={(form.mobileImageUrl || form.imageUrl) as string}
                      alt="Mobile preview"
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 480px"
                      style={{ objectPosition: `${mobileFocalX}% ${mobileFocalY}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="outline"
                disabled={!(form.mobileImageUrl || form.imageUrl)?.trim()}
                onClick={() => openCropper('mobile')}
              >
                قص صورة الموبايل (Drag + Zoom)
              </Button>
              <div className="text-sm text-muted-foreground">
                يتم حفظ القص كـ focal point (ويُطبق على الموبايل في الموقع).
              </div>
            </div>
            <div className="space-y-3 rounded-lg border p-4">
              <Label>Crop focal point (الموبايل)</Label>
              <div className="space-y-2">
                <Label htmlFor="hero-slide-mobile-focal-x" className="text-sm text-muted-foreground">
                  أفقي: {Math.round(mobileFocalX)}%
                </Label>
                <input
                  id="hero-slide-mobile-focal-x"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={mobileFocalX}
                  onChange={(e) => update({ mobileFocalX: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hero-slide-mobile-focal-y" className="text-sm text-muted-foreground">
                  عمودي: {Math.round(mobileFocalY)}%
                </Label>
                <input
                  id="hero-slide-mobile-focal-y"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={mobileFocalY}
                  onChange={(e) => update({ mobileFocalY: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>
            </div>
            <div className="space-y-2">
              <Label>رابط فيديو خلفية (اختياري)</Label>
              <Input
                value={form.videoUrl ?? ''}
                onChange={(e) => update({ videoUrl: e.target.value })}
                placeholder="https://..."
                dir={EMBED_LTR}
              />
            </div>
          </TabsContent>
          <TabsContent value="content" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>العنوان (عربي)</Label>
                <Input value={form.titleAr} onChange={(e) => update({ titleAr: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>العنوان (إنجليزي)</Label>
                <Input value={form.titleEn} onChange={(e) => update({ titleEn: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>العنوان (صيني)</Label>
                <Input
                  value={form.titleZh ?? ''}
                  onChange={(e) => update({ titleZh: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>النص الفرعي (عربي)</Label>
                <Input
                  value={form.subtitleAr ?? ''}
                  onChange={(e) => update({ subtitleAr: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>النص الفرعي (إنجليزي)</Label>
                <Input
                  value={form.subtitleEn ?? ''}
                  onChange={(e) => update({ subtitleEn: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>النص الفرعي (صيني)</Label>
                <Input
                  value={form.subtitleZh ?? ''}
                  onChange={(e) => update({ subtitleZh: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>شارة (عربي)</Label>
                <Input
                  value={form.badgeTextAr ?? ''}
                  onChange={(e) => update({ badgeTextAr: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>شارة (إنجليزي)</Label>
                <Input
                  value={form.badgeTextEn ?? ''}
                  onChange={(e) => update({ badgeTextEn: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>شارة (صيني)</Label>
                <Input
                  value={form.badgeTextZh ?? ''}
                  onChange={(e) => update({ badgeTextZh: e.target.value })}
                />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="cta" className="space-y-4 pt-4">
            <div className="space-y-4 rounded-lg border p-4">
              <Label>الزر الرئيسي</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={form.ctaTextEn ?? ''}
                  onChange={(e) => update({ ctaTextEn: e.target.value })}
                  placeholder="نص الزر (EN)"
                />
                <Input
                  value={form.ctaUrl ?? ''}
                  onChange={(e) => update({ ctaUrl: e.target.value })}
                  placeholder="رابط /equipment"
                  dir={EMBED_LTR}
                />
              </div>
              <div className="flex gap-2">
                <Input
                  value={form.ctaTextAr ?? ''}
                  onChange={(e) => update({ ctaTextAr: e.target.value })}
                  placeholder="نص الزر (عربي)"
                />
                <Select
                  value={form.ctaStyle}
                  onValueChange={(v) =>
                    update({ ctaStyle: v as 'primary' | 'secondary' | 'outline' | 'ghost' })
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Primary</SelectItem>
                    <SelectItem value="secondary">Secondary</SelectItem>
                    <SelectItem value="outline">Outline</SelectItem>
                    <SelectItem value="ghost">Ghost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-4 rounded-lg border p-4">
              <Label>الزر الثانوي</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={form.cta2TextEn ?? ''}
                  onChange={(e) => update({ cta2TextEn: e.target.value })}
                  placeholder="نص الزر (EN)"
                />
                <Input
                  value={form.cta2Url ?? ''}
                  onChange={(e) => update({ cta2Url: e.target.value })}
                  placeholder="رابط"
                  dir={EMBED_LTR}
                />
              </div>
              <Input
                value={form.cta2TextAr ?? ''}
                onChange={(e) => update({ cta2TextAr: e.target.value })}
                placeholder="نص الزر (عربي)"
              />
            </div>
          </TabsContent>
          <TabsContent value="display" className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <Label>نشط</Label>
              <Switch checked={form.isActive} onCheckedChange={(v) => update({ isActive: v })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hero-slide-overlay-opacity">
                شفافية الغطاء (0–1): {form.overlayOpacity}
              </Label>
              <input
                id="hero-slide-overlay-opacity"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={form.overlayOpacity}
                onChange={(e) => update({ overlayOpacity: parseFloat(e.target.value) })}
                className="w-full"
                aria-label="شفافية الغطاء من 0 إلى 1"
              />
            </div>
            <div className="space-y-2">
              <Label>موضع النص</Label>
              <Select
                value={form.textPosition}
                onValueChange={(v) => update({ textPosition: v as 'start' | 'center' | 'end' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="start">بداية (يسار)</SelectItem>
                  <SelectItem value="center">وسط</SelectItem>
                  <SelectItem value="end">نهاية (يمين)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
          <TabsContent value="schedule" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>تاريخ النشر (اختياري)</Label>
              <Input
                type="datetime-local"
                value={form.publishAt ? new Date(form.publishAt).toISOString().slice(0, 16) : ''}
                onChange={(e) =>
                  update({ publishAt: e.target.value ? new Date(e.target.value) : null })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>تاريخ إلغاء النشر (اختياري)</Label>
              <Input
                type="datetime-local"
                value={
                  form.unpublishAt ? new Date(form.unpublishAt).toISOString().slice(0, 16) : ''
                }
                onChange={(e) =>
                  update({ unpublishAt: e.target.value ? new Date(e.target.value) : null })
                }
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span className="me-2">{isEdit ? 'حفظ' : 'إضافة'}</span>
          </Button>
        </DialogFooter>
      </DialogContent>

      <Dialog open={cropperOpen} onOpenChange={setCropperOpen}>
        <DialogContent className="max-w-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {cropperTarget === 'desktop' ? 'قص صورة الديسكتوب' : 'قص صورة الموبايل'}
            </DialogTitle>
          </DialogHeader>

          {!cropperImageUrl ? (
            <div className="text-sm text-muted-foreground">أضف رابط صورة أولاً.</div>
          ) : (
            <div className="space-y-4">
              <div className="relative h-[420px] w-full overflow-hidden rounded-lg border bg-black">
                <Cropper
                  image={cropperImageUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspectToNumber(
                    cropperTarget === 'desktop' ? form.desktopAspectRatio : form.mobileAspectRatio,
                    cropperTarget
                  )}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  cropShape="rect"
                  showGrid
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hero-slide-mobile-zoom" className="text-sm text-muted-foreground">
                  Zoom: {zoom.toFixed(2)}
                </Label>
                <input
                  id="hero-slide-mobile-zoom"
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCropperOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={applyCropToFocalPoint} disabled={!croppedArea}>
              حفظ القص
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
