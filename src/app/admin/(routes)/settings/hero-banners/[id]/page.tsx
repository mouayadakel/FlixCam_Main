/**
 * @file page.tsx
 * @description Admin – Hero banner detail: settings form + slide list with reorder, add, edit, delete.
 */

'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Loader2,
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  ImageIcon,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { SlideFormDialog, type HeroSlideForEdit } from '../_components/slide-form-dialog'

interface HeroBannerWithSlides {
  id: string
  name: string
  pageSlug: string
  autoPlay: boolean
  autoPlayInterval: number
  transitionType: string
  slides: HeroSlideForEdit[]
}

export default function HeroBannerDetailPage() {
  const params = useParams()
  const id = (params?.id ?? '') as string
  const { toast } = useToast()
  const [banner, setBanner] = useState<HeroBannerWithSlides | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingBanner, setSavingBanner] = useState(false)
  const [form, setForm] = useState({
    name: '',
    pageSlug: '',
    autoPlay: true,
    autoPlayInterval: 6000,
    transitionType: 'fade',
  })
  const [slideDialogOpen, setSlideDialogOpen] = useState(false)
  const [editingSlide, setEditingSlide] = useState<HeroSlideForEdit | null>(null)

  async function fetchBanner() {
    try {
      const res = await fetch(`/api/admin/hero-banners/${id}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setBanner(data)
      setForm({
        name: data.name,
        pageSlug: data.pageSlug,
        autoPlay: data.autoPlay,
        autoPlayInterval: data.autoPlayInterval,
        transitionType: data.transitionType,
      })
    } catch {
      setBanner(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) fetchBanner()
  }, [id])

  async function saveBannerSettings() {
    setSavingBanner(true)
    try {
      const res = await fetch(`/api/admin/hero-banners/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to save')
      }
      toast({ title: 'تم', description: 'تم حفظ إعدادات البانر' })
      fetchBanner()
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل الحفظ',
        variant: 'destructive',
      })
    } finally {
      setSavingBanner(false)
    }
  }

  async function moveSlide(slideId: string, direction: 'up' | 'down') {
    if (!banner) return
    const idx = banner.slides.findIndex((s) => s.id === slideId)
    if (idx < 0) return
    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= banner.slides.length) return
    const reordered = [...banner.slides]
    const [removed] = reordered.splice(idx, 1)
    reordered.splice(newIdx, 0, removed)
    const slideIds = reordered.map((s) => s.id)
    try {
      const res = await fetch(`/api/admin/hero-banners/${id}/slides`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slideIds }),
      })
      if (!res.ok) throw new Error('Reorder failed')
      toast({ title: 'تم', description: 'تم تغيير الترتيب' })
      fetchBanner()
    } catch {
      toast({ title: 'خطأ', description: 'فشل تغيير الترتيب', variant: 'destructive' })
    }
  }

  async function deleteSlide(slideId: string) {
    if (!confirm('حذف هذه الشريحة؟')) return
    try {
      const res = await fetch(`/api/admin/hero-banners/${id}/slides/${slideId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Delete failed')
      toast({ title: 'تم', description: 'تم حذف الشريحة' })
      fetchBanner()
    } catch {
      toast({ title: 'خطأ', description: 'فشل الحذف', variant: 'destructive' })
    }
  }

  function openAddSlide() {
    setEditingSlide(null)
    setSlideDialogOpen(true)
  }

  function openEditSlide(slide: HeroSlideForEdit) {
    setEditingSlide(slide)
    setSlideDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (!banner) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">البانر غير موجود.</p>
        <Button variant="outline" asChild>
          <Link href="/admin/settings/hero-banners">العودة للقائمة</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8" dir="rtl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/settings/hero-banners">
            <ArrowLeft className="ml-1 h-4 w-4" />
            البانرات
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{banner.name}</h1>
          <p className="text-muted-foreground">/{banner.pageSlug}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>إعدادات البانر</CardTitle>
          <CardDescription>الاسم، الصفحة، التشغيل التلقائي، ونوع الانتقال.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>الاسم</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>رمز الصفحة (page slug)</Label>
              <Input
                value={form.pageSlug}
                onChange={(e) => setForm((f) => ({ ...f, pageSlug: e.target.value }))}
                dir="ltr"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>تشغيل تلقائي</Label>
            <Switch
              checked={form.autoPlay}
              onCheckedChange={(v) => setForm((f) => ({ ...f, autoPlay: v }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>فترة الانتقال (ms)</Label>
              <Input
                type="number"
                min={1000}
                max={30000}
                step={1000}
                value={form.autoPlayInterval}
                onChange={(e) =>
                  setForm((f) => ({ ...f, autoPlayInterval: parseInt(e.target.value, 10) || 6000 }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>نوع الانتقال</Label>
              <Select
                value={form.transitionType}
                onValueChange={(v) => setForm((f) => ({ ...f, transitionType: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fade">Fade</SelectItem>
                  <SelectItem value="slide">Slide</SelectItem>
                  <SelectItem value="zoom">Zoom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={saveBannerSettings} disabled={savingBanner}>
            {savingBanner ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span className="mr-2">حفظ الإعدادات</span>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>الشرائح</CardTitle>
              <CardDescription>
                ترتيب الشرائح يحدد ظهورها. استخدم الأسهم للأعلى/الأسفل.
              </CardDescription>
            </div>
            <Button onClick={openAddSlide}>
              <Plus className="h-4 w-4" />
              <span className="mr-2">إضافة شريحة</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {banner.slides.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              لا توجد شرائح. انقر &quot;إضافة شريحة&quot; لبدء الإضافة.
            </div>
          ) : (
            <div className="space-y-3">
              {banner.slides.map((slide, index) => (
                <div
                  key={slide.id}
                  className="flex items-center gap-4 rounded-lg border p-4 hover:bg-muted/30"
                >
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={index === 0}
                      onClick={() => moveSlide(slide.id, 'up')}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={index === banner.slides.length - 1}
                      onClick={() => moveSlide(slide.id, 'down')}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="relative h-14 w-24 flex-shrink-0 overflow-hidden rounded bg-muted">
                    <Image src={slide.imageUrl} alt="" fill className="object-cover" sizes="96px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{slide.titleAr || slide.titleEn}</div>
                    <div className="text-sm text-muted-foreground">
                      ترتيب {slide.order + 1}
                      {!slide.isActive && (
                        <Badge variant="secondary" className="mr-2">
                          معطّل
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditSlide(slide)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      onClick={() => deleteSlide(slide.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SlideFormDialog
        open={slideDialogOpen}
        onOpenChange={setSlideDialogOpen}
        bannerId={id}
        slide={editingSlide}
        onSuccess={fetchBanner}
      />
    </div>
  )
}
