/**
 * @file page.tsx
 * @description Admin – Hero banners list (manage homepage carousel and other page heroes)
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ImageIcon, Plus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface HeroBannerListItem {
  id: string
  name: string
  pageSlug: string
  isActive: boolean
  autoPlay: boolean
  autoPlayInterval: number
  transitionType: string
  slideCount: number
  createdAt: string
}

export default function HeroBannersPage() {
  const { toast } = useToast()
  const [banners, setBanners] = useState<HeroBannerListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  async function fetchBanners() {
    try {
      const res = await fetch('/api/admin/hero-banners')
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setBanners(json.data ?? [])
    } catch {
      setBanners([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBanners()
  }, [])

  async function handleCreateBanner() {
    setCreating(true)
    try {
      const res = await fetch('/api/admin/hero-banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Hero Banner',
          pageSlug: `page-${Date.now().toString(36)}`,
          isActive: false,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Create failed')
      }
      const created = await res.json()
      toast({ title: 'تم', description: 'تم إنشاء البانر' })
      window.location.href = `/admin/settings/hero-banners/${created.id}`
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل الإنشاء',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ImageIcon className="h-8 w-8" />
            البانر الرئيسي (Hero)
          </h1>
          <p className="text-muted-foreground mt-1">
            إدارة كاروسيل الصور والنصوص والروابط في الصفحة الرئيسية وصفحات أخرى
          </p>
        </div>
        <Button onClick={handleCreateBanner} disabled={creating}>
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          <span className="mr-2">إنشاء بانر</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>البانرات</CardTitle>
          <CardDescription>
            كل بانر مرتبط بصفحة (مثل home). يمكنك إضافة شرائح وتحرير النصوص والصور وروابط الأزرار.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : banners.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              لا توجد بانرات. انقر &quot;إنشاء بانر&quot; أو شغّل البذور لإنشاء بانر الصفحة الرئيسية.
            </div>
          ) : (
            <div className="space-y-3">
              {banners.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{b.name}</div>
                      <div className="text-sm text-muted-foreground">
                        /{b.pageSlug} · {b.slideCount} شريحة
                      </div>
                    </div>
                    {b.isActive ? (
                      <Badge variant="default">نشط</Badge>
                    ) : (
                      <Badge variant="secondary">معطّل</Badge>
                    )}
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/settings/hero-banners/${b.id}`}>إدارة الشرائح</Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
