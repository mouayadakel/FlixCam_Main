/**
 * @file page.tsx
 * @description Admin - Manage public website pages (Phase 5.1)
 */

'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, FileText, Globe } from 'lucide-react'
import Link from 'next/link'

interface WebsitePageItem {
  id: string
  slug: string
  titleAr: string
  titleEn: string
  titleZh: string | null
  isPublished: boolean
  seo: unknown
  sectionsCount: number
  createdAt: string
  updatedAt: string
}

export default function WebsitePagesPage() {
  const [pages, setPages] = useState<WebsitePageItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPages() {
      try {
        const res = await fetch('/api/admin/website-pages')
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        setPages(data.pages ?? [])
      } catch {
        setPages([])
      } finally {
        setLoading(false)
      }
    }
    fetchPages()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">صفحات الموقع العام</h1>
        <p className="text-muted-foreground mt-2">
          إدارة صفحات الموقع العام (الرئيسية، عن، سياسات، إلخ)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            الصفحات
          </CardTitle>
          <CardDescription>
            الصفحات المخزنة في قاعدة البيانات. التحرير الكامل (المحتوى والأقسام) قيد التطوير.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : pages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              لا توجد صفحات مسجلة. يمكن إضافتها عبر البذور أو واجهة التحرير لاحقاً.
            </div>
          ) : (
            <div className="space-y-3">
              {pages.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">
                        {p.titleAr} / {p.titleEn}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        /{p.slug} · {p.sectionsCount} أقسام
                      </div>
                    </div>
                    {p.isPublished ? (
                      <Badge variant="default">منشور</Badge>
                    ) : (
                      <Badge variant="secondary">مسودة</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/`} target="_blank" rel="noopener noreferrer">
                        عرض
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" disabled title="قريباً">
                      تحرير
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
