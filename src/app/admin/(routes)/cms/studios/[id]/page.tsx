/**
 * @file page.tsx
 * @description Admin CMS Studio edit – full studio content management
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, ExternalLink, Loader2, Save } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { CmsStudioBasicTab } from './_components/basic-tab'
import { CmsStudioGalleryTab } from './_components/gallery-tab'
import { CmsStudioLocationTab } from './_components/location-tab'
import { CmsStudioBookingTab } from './_components/booking-tab'
import { CmsStudioPackagesTab } from './_components/packages-tab'
import { CmsStudioAddonsTab } from './_components/addons-tab'
import { CmsStudioIncludedTab } from './_components/included-tab'
import { CmsStudioRulesTab } from './_components/rules-tab'
import { CmsStudioTrustTab } from './_components/trust-tab'
import { CmsStudioBlackoutTab } from './_components/blackout-tab'
import { CmsStudioDiscountTab } from './_components/discount-tab'
import { CmsStudioFaqTab } from './_components/faq-tab'
import { CmsStudioTestimonialsTab } from './_components/testimonials-tab'
import { CmsStudioScheduleTab } from './_components/schedule-tab'

interface StudioData {
  id: string
  name: string
  slug: string
  description: string | null
  [key: string]: unknown
}

export default function CmsStudioEditPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [studio, setStudio] = useState<StudioData | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchStudio = useCallback(async () => {
    if (!id) return
    try {
      const res = await fetch(`/api/admin/studios/${id}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setStudio(data)
    } catch {
      toast({ title: 'خطأ', description: 'فشل تحميل الاستوديو', variant: 'destructive' })
      setStudio(null)
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    fetchStudio()
  }, [fetchStudio])

  const handleSave = async (payload: Record<string, unknown>) => {
    if (!id) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/studios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save')
      }
      toast({ title: 'تم', description: 'تم حفظ التغييرات' })
      setDirty(false)
      fetchStudio()
    } catch (err) {
      toast({
        title: 'خطأ',
        description: err instanceof Error ? err.message : 'فشل الحفظ',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!studio) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/cms/studios">رجوع</Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            الاستوديو غير موجود
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/cms/studios">
              <ArrowLeft className="h-4 w-4" />
              <span className="mr-2">رجوع</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{studio.name}</h1>
            <p className="text-sm text-muted-foreground">
              CMS &gt; الاستوديوهات &gt; {studio.name}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link
              href={`/studios/${studio.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="معاينة"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="mr-2">معاينة</span>
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="flex w-full flex-wrap gap-1 overflow-x-auto">
          <TabsTrigger value="basic">أساسي</TabsTrigger>
          <TabsTrigger value="gallery">المعرض</TabsTrigger>
          <TabsTrigger value="location">الموقع</TabsTrigger>
          <TabsTrigger value="booking">الحجز</TabsTrigger>
          <TabsTrigger value="packages">الباكجات</TabsTrigger>
          <TabsTrigger value="addons">الإضافات</TabsTrigger>
          <TabsTrigger value="included">المشمول</TabsTrigger>
          <TabsTrigger value="rules">القواعد</TabsTrigger>
          <TabsTrigger value="trust">الثقة</TabsTrigger>
          <TabsTrigger value="discount">العروض</TabsTrigger>
          <TabsTrigger value="blackout">الأيام المعطلة</TabsTrigger>
          <TabsTrigger value="faq">الأسئلة الشائعة</TabsTrigger>
          <TabsTrigger value="testimonials">التقييمات</TabsTrigger>
          <TabsTrigger value="schedule">المواعيد</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-4">
          <CmsStudioBasicTab
            studio={studio}
            onSave={handleSave}
            onDirtyChange={setDirty}
            saving={saving}
          />
        </TabsContent>
        <TabsContent value="gallery" className="mt-4">
          <CmsStudioGalleryTab studioId={id} slug={studio.slug} onRefresh={fetchStudio} />
        </TabsContent>
        <TabsContent value="location" className="mt-4">
          <CmsStudioLocationTab
            studio={studio}
            onSave={handleSave}
            onDirtyChange={setDirty}
            saving={saving}
          />
        </TabsContent>
        <TabsContent value="booking" className="mt-4">
          <CmsStudioBookingTab
            studio={studio}
            onSave={handleSave}
            onDirtyChange={setDirty}
            saving={saving}
          />
        </TabsContent>
        <TabsContent value="packages" className="mt-4">
          <CmsStudioPackagesTab studioId={id} onRefresh={fetchStudio} />
        </TabsContent>
        <TabsContent value="addons" className="mt-4">
          <CmsStudioAddonsTab studioId={id} onRefresh={fetchStudio} />
        </TabsContent>
        <TabsContent value="included" className="mt-4">
          <CmsStudioIncludedTab
            studio={studio}
            onSave={handleSave}
            onDirtyChange={setDirty}
            saving={saving}
          />
        </TabsContent>
        <TabsContent value="rules" className="mt-4">
          <CmsStudioRulesTab
            studio={studio}
            onSave={handleSave}
            onDirtyChange={setDirty}
            saving={saving}
          />
        </TabsContent>
        <TabsContent value="trust" className="mt-4">
          <CmsStudioTrustTab
            studio={studio}
            onSave={handleSave}
            onDirtyChange={setDirty}
            saving={saving}
          />
        </TabsContent>
        <TabsContent value="discount" className="mt-4">
          <CmsStudioDiscountTab
            studio={studio}
            onSave={handleSave}
            onDirtyChange={setDirty}
            saving={saving}
          />
        </TabsContent>
        <TabsContent value="blackout" className="mt-4">
          <CmsStudioBlackoutTab studioId={id} onRefresh={fetchStudio} />
        </TabsContent>
        <TabsContent value="faq" className="mt-4">
          <CmsStudioFaqTab studioId={id} onRefresh={fetchStudio} />
        </TabsContent>
        <TabsContent value="testimonials" className="mt-4">
          <CmsStudioTestimonialsTab studioId={id} />
        </TabsContent>
        <TabsContent value="schedule" className="mt-4">
          <CmsStudioScheduleTab studioId={id} />
        </TabsContent>
      </Tabs>

      {dirty && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 p-4 shadow-lg backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center justify-between">
            <span className="text-sm text-muted-foreground">لديك تغييرات غير محفوظة</span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setDirty(false)}>
                تجاهل
              </Button>
              <Button disabled={saving} onClick={() => {}}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span className="mr-2">حفظ</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
