/**
 * @file page.tsx
 * @description Admin CMS Studios list – manage studio content
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2, Pencil, ExternalLink, Video } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface StudioListItem {
  id: string
  name: string
  slug: string
  isActive: boolean
  availabilityConfidence: string | null
  updatedAt: string
}

export default function CmsStudiosPage() {
  const { toast } = useToast()
  const [studios, setStudios] = useState<StudioListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  async function fetchStudios() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const res = await fetch(`/api/admin/studios?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setStudios(json.data ?? [])
    } catch {
      setStudios([])
      toast({ title: 'خطأ', description: 'فشل تحميل الاستوديوهات', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudios()
  }, [search])

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Video className="h-8 w-8" />
          محتوى الاستوديو
        </h1>
        <p className="mt-1 text-muted-foreground">
          إدارة محتوى صفحات الاستوديوهات: صور، أسعار، باكجات، موقع، أسئلة شائعة
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة الاستوديوهات</CardTitle>
          <CardDescription>انقر على تعديل لإدارة محتوى كل استوديو</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="بحث بالاسم أو الرابط..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
              dir="rtl"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : studios.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              لا توجد استوديوهات بعد. أضف استوديو من صفحة الاستوديوهات الرئيسية.
            </div>
          ) : (
            <div className="space-y-3">
              {studios.map((studio) => (
                <div
                  key={studio.id}
                  className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{studio.name}</div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>/studios/{studio.slug}</span>
                      {studio.isActive ? (
                        <Badge variant="default" className="bg-success-500">
                          نشط
                        </Badge>
                      ) : (
                        <Badge variant="secondary">معطّل</Badge>
                      )}
                      {studio.availabilityConfidence === 'available_now' && (
                        <Badge variant="outline" className="border-success-500 text-success-700">
                          متاح اليوم
                        </Badge>
                      )}
                      {studio.availabilityConfidence === 'requires_review' && (
                        <Badge variant="outline" className="border-warning-500 text-warning-700">
                          يتطلب تأكيد
                        </Badge>
                      )}
                      <span>
                        آخر تحديث: {new Date(studio.updatedAt).toLocaleDateString('ar-SA')}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        href={`/studios/${studio.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="عرض الصفحة"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="default" size="sm" asChild>
                      <Link href={`/admin/cms/studios/${studio.id}`} aria-label="تعديل">
                        <Pencil className="h-4 w-4" />
                        <span className="me-2">تعديل</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
