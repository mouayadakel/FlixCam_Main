/**
 * Slide form dialog – create or edit hero slide (media, content, CTA, display, schedule).
 */

'use client'

import { useState, useEffect } from 'react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { CreateSlideInput } from '@/lib/validators/hero-banner.validator'

export interface HeroSlideForEdit {
  id: string
  imageUrl: string
  mobileImageUrl: string | null
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
  const [form, setForm] = useState<CreateSlideInput>(defaultForm)

  const isEdit = Boolean(slide?.id)

  useEffect(() => {
    if (slide) {
      setForm({
        imageUrl: slide.imageUrl,
        mobileImageUrl: slide.mobileImageUrl ?? '',
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

  const update = (patch: Partial<CreateSlideInput>) => {
    setForm((f) => ({ ...f, ...patch }))
  }

  const handleSubmit = async () => {
    if (!form.imageUrl?.trim() || !form.titleAr?.trim() || !form.titleEn?.trim()) {
      toast({ title: 'خطأ', description: 'الصورة والعنوان (عربي وإنجليزي) مطلوبة', variant: 'destructive' })
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'تحرير الشريحة' : 'إضافة شريحة'}</DialogTitle>
        </DialogHeader>

        {form.imageUrl && (
          <div className="rounded-lg border overflow-hidden bg-muted/30">
            <div className="aspect-video relative">
              <img
                src={form.imageUrl}
                alt="Preview"
                className="object-cover w-full h-full"
              />
              <div
                className="absolute inset-0 bg-black transition-opacity"
                style={{ opacity: form.overlayOpacity }}
              />
              <div
                className={`absolute inset-0 flex flex-col justify-center p-4 text-white ${
                  form.textPosition === 'center' ? 'items-center text-center' : form.textPosition === 'end' ? 'items-end' : 'items-start'
                }`}
              >
                {form.badgeTextAr && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-white/20 mb-2">
                    {form.badgeTextAr || form.badgeTextEn}
                  </span>
                )}
                <h3 className="text-xl font-bold">{form.titleAr || form.titleEn}</h3>
                {(form.subtitleAr || form.subtitleEn) && (
                  <p className="text-sm opacity-90 mt-1">{form.subtitleAr || form.subtitleEn}</p>
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
              <Input
                value={form.imageUrl}
                onChange={(e) => update({ imageUrl: e.target.value })}
                placeholder="https://..."
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>صورة الموبايل (اختياري)</Label>
              <Input
                value={form.mobileImageUrl ?? ''}
                onChange={(e) => update({ mobileImageUrl: e.target.value })}
                placeholder="https://..."
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>رابط فيديو خلفية (اختياري)</Label>
              <Input
                value={form.videoUrl ?? ''}
                onChange={(e) => update({ videoUrl: e.target.value })}
                placeholder="https://..."
                dir="ltr"
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
                <Input value={form.titleZh ?? ''} onChange={(e) => update({ titleZh: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>النص الفرعي (عربي)</Label>
                <Input value={form.subtitleAr ?? ''} onChange={(e) => update({ subtitleAr: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>النص الفرعي (إنجليزي)</Label>
                <Input value={form.subtitleEn ?? ''} onChange={(e) => update({ subtitleEn: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>النص الفرعي (صيني)</Label>
                <Input value={form.subtitleZh ?? ''} onChange={(e) => update({ subtitleZh: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>شارة (عربي)</Label>
                <Input value={form.badgeTextAr ?? ''} onChange={(e) => update({ badgeTextAr: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>شارة (إنجليزي)</Label>
                <Input value={form.badgeTextEn ?? ''} onChange={(e) => update({ badgeTextEn: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>شارة (صيني)</Label>
                <Input value={form.badgeTextZh ?? ''} onChange={(e) => update({ badgeTextZh: e.target.value })} />
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
                  dir="ltr"
                />
              </div>
              <div className="flex gap-2">
                <Input
                  value={form.ctaTextAr ?? ''}
                  onChange={(e) => update({ ctaTextAr: e.target.value })}
                  placeholder="نص الزر (عربي)"
                />
                <Select value={form.ctaStyle} onValueChange={(v) => update({ ctaStyle: v as 'primary' | 'secondary' | 'outline' | 'ghost' })}>
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
                  dir="ltr"
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
              <Label>شفافية الغطاء (0–1): {form.overlayOpacity}</Label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={form.overlayOpacity}
                onChange={(e) => update({ overlayOpacity: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label>موضع النص</Label>
              <Select value={form.textPosition} onValueChange={(v) => update({ textPosition: v as 'start' | 'center' | 'end' })}>
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
                onChange={(e) => update({ publishAt: e.target.value ? new Date(e.target.value) : null })}
              />
            </div>
            <div className="space-y-2">
              <Label>تاريخ إلغاء النشر (اختياري)</Label>
              <Input
                type="datetime-local"
                value={form.unpublishAt ? new Date(form.unpublishAt).toISOString().slice(0, 16) : ''}
                onChange={(e) => update({ unpublishAt: e.target.value ? new Date(e.target.value) : null })}
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
            <span className="mr-2">{isEdit ? 'حفظ' : 'إضافة'}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
