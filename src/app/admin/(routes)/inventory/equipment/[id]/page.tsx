/**
 * @file page.tsx
 * @description Equipment detail/view page
 * @module app/admin/(routes)/inventory/equipment/[id]
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Edit, Trash2, Calendar, Package, DollarSign, Image as ImageIcon, Video, Languages, FileText, Link as LinkIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import Image from 'next/image'
import DOMPurify from 'dompurify'
import type { Equipment, EquipmentCondition } from '@prisma/client'

const ALLOWED_HTML_TAGS = ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'span', 'div']

function sanitizeHtml(html: string | null | undefined): string {
  if (html == null || html === '') return ''
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: ALLOWED_HTML_TAGS })
}

interface EquipmentWithRelations extends Equipment {
  category: { id: string; name: string; slug: string }
  brand: { id: string; name: string; slug: string } | null
  media: Array<{ id: string; url: string; type: string }>
  bookings: Array<{
    id: string
    booking: {
      id: string
      bookingNumber: string
      status: string
      startDate: Date
      endDate: Date
    }
    quantity: number
  }>
  translations?: Record<string, {
    name?: string
    description?: string
    shortDescription?: string
    seoTitle?: string
    seoDescription?: string
    seoKeywords?: string
  }>
  relatedEquipment?: Array<{
    id: string
    sku: string
    model?: string
    category: { name: string }
  }>
  relatedEquipmentIds?: string[]
  boxContents?: string
  bufferTime?: number
  bufferTimeUnit?: 'hours' | 'days'
}

const CONDITION_COLORS: Record<EquipmentCondition, string> = {
  EXCELLENT: '#10B981',
  GOOD: '#1F87E8',
  FAIR: '#F59E0B',
  POOR: '#EF4444',
  MAINTENANCE: '#6B7280',
  DAMAGED: '#DC2626',
}

const CONDITION_LABELS: Record<EquipmentCondition, string> = {
  EXCELLENT: 'ممتاز',
  GOOD: 'جيد',
  FAIR: 'مقبول',
  POOR: 'ضعيف',
  MAINTENANCE: 'صيانة',
  DAMAGED: 'تالف',
}

export default function EquipmentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [equipment, setEquipment] = useState<EquipmentWithRelations | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEquipment()
  }, [params.id])

  const loadEquipment = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/equipment/${params.id}`)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('المعدة غير موجودة')
        }
        throw new Error('فشل تحميل المعدة')
      }

      const data = await response.json()
      setEquipment(data)
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحميل المعدة',
        variant: 'destructive',
      })
      router.push('/admin/inventory/equipment')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('هل أنت متأكد من حذف هذه المعدة؟ لا يمكن التراجع عن هذا الإجراء.')) {
      return
    }

    try {
      const response = await fetch(`/api/equipment/${params.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'فشل حذف المعدة')
      }

      toast({
        title: 'نجح',
        description: 'تم حذف المعدة بنجاح',
      })

      router.push('/admin/inventory/equipment')
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل حذف المعدة',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6" dir="rtl">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!equipment) {
    return (
      <div className="flex min-h-[400px] items-center justify-center" dir="rtl">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-neutral-600">المعدة غير موجودة</p>
            <Button asChild className="mt-4">
              <Link href="/admin/inventory/equipment">العودة إلى قائمة المعدات</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">{equipment.sku}</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {equipment.model || 'لا يوجد موديل'} • {equipment.category.name}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleDelete} className="text-error-600 hover:text-error-700">
            <Trash2 className="ml-2 h-4 w-4" />
            حذف
          </Button>
          <Button asChild>
            <Link href={`/admin/inventory/equipment/${params.id}/edit`}>
              <Edit className="ml-2 h-4 w-4" />
              تعديل
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Info Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              المعلومات الأساسية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-neutral-600">SKU</p>
              <p className="font-mono text-lg font-semibold">{equipment.sku}</p>
            </div>
            {equipment.model && (
              <div>
                <p className="text-sm text-neutral-600">الموديل</p>
                <p className="text-lg">{equipment.model}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-neutral-600">الفئة</p>
              <p className="text-lg">{equipment.category.name}</p>
            </div>
            {equipment.brand && (
              <div>
                <p className="text-sm text-neutral-600">العلامة التجارية</p>
                <p className="text-lg">{equipment.brand.name}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-neutral-600">الحالة</p>
              <Badge
                style={{
                  backgroundColor: CONDITION_COLORS[equipment.condition],
                  color: '#fff',
                }}
              >
                {CONDITION_LABELS[equipment.condition]}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-neutral-600">الحالة</p>
              <Badge variant={equipment.isActive ? 'default' : 'secondary'}>
                {equipment.isActive ? 'نشط' : 'غير نشط'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              التسعير
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-neutral-600">السعر اليومي</p>
              <p className="text-2xl font-bold text-primary-600">
                {Number(equipment.dailyPrice).toLocaleString('ar-SA')} ر.س
              </p>
            </div>
            {equipment.weeklyPrice && (
              <div>
                <p className="text-sm text-neutral-600">السعر الأسبوعي</p>
                <p className="text-xl font-semibold">
                  {Number(equipment.weeklyPrice).toLocaleString('ar-SA')} ر.س
                </p>
              </div>
            )}
            {equipment.monthlyPrice && (
              <div>
                <p className="text-sm text-neutral-600">السعر الشهري</p>
                <p className="text-xl font-semibold">
                  {Number(equipment.monthlyPrice).toLocaleString('ar-SA')} ر.س
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inventory */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              المخزون
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-neutral-600">الكمية الإجمالية</p>
              <p className="text-2xl font-bold">{equipment.quantityTotal}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-600">الكمية المتاحة</p>
              <p className="text-2xl font-bold text-success-600">{equipment.quantityAvailable}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-600">المستأجرة</p>
              <p className="text-xl font-semibold">
                {equipment.quantityTotal - equipment.quantityAvailable}
              </p>
            </div>
            {equipment.warehouseLocation && (
              <div>
                <p className="text-sm text-neutral-600">موقع المستودع</p>
                <p className="text-lg">{equipment.warehouseLocation}</p>
              </div>
            )}
            {equipment.barcode && (
              <div>
                <p className="text-sm text-neutral-600">الباركود</p>
                <p className="font-mono text-lg">{equipment.barcode}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Information Tabs */}
      <Tabs defaultValue="media" className="w-full">
        <TabsList>
          <TabsTrigger value="media">الوسائط</TabsTrigger>
          <TabsTrigger value="translations">الترجمات</TabsTrigger>
          <TabsTrigger value="specifications">المواصفات</TabsTrigger>
          <TabsTrigger value="related">ذات الصلة</TabsTrigger>
          <TabsTrigger value="settings">الإعدادات</TabsTrigger>
          {equipment.bookings && equipment.bookings.length > 0 && (
            <TabsTrigger value="bookings">الحجوزات</TabsTrigger>
          )}
        </TabsList>

        {/* Media Tab */}
        <TabsContent value="media" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                الصور والفيديو
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {equipment.media && equipment.media.length > 0 ? (
                <>
                  {/* Featured Image */}
                  {equipment.media.find((m) => m.type === 'image') && (
                    <div>
                      <h4 className="mb-3 font-semibold">الصورة المميزة</h4>
                      <div className="relative w-full max-w-md aspect-video rounded-lg border border-neutral-200 overflow-hidden">
                        <Image
                          src={equipment.media.find((m) => m.type === 'image')?.url || ''}
                          alt="Featured"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    </div>
                  )}

                  {/* Gallery Images */}
                  {equipment.media.filter((m) => m.type === 'image').length > 1 && (
                    <div>
                      <h4 className="mb-3 font-semibold">معرض الصور</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {equipment.media
                          .filter((m) => m.type === 'image')
                          .slice(1)
                          .map((media, index) => (
                            <div key={media.id} className="relative aspect-square rounded-lg border border-neutral-200 overflow-hidden">
                              <Image
                                src={media.url}
                                alt={`Gallery ${index + 2}`}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Video */}
                  {equipment.media.find((m) => m.type === 'video') && (
                    <div>
                      <h4 className="mb-3 font-semibold">الفيديو</h4>
                      <div className="relative aspect-video rounded-lg border border-neutral-200 overflow-hidden bg-neutral-100">
                        <video
                          src={equipment.media.find((m) => m.type === 'video')?.url}
                          controls
                          className="w-full h-full"
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-center py-8 text-neutral-500">لا توجد وسائط</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Translations Tab */}
        <TabsContent value="translations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Languages className="h-5 w-5" />
                الترجمات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {equipment.translations ? (
                (['ar', 'en', 'zh'] as const).map((locale) => {
                  const trans = equipment.translations?.[locale]
                  if (!trans || !trans.name) return null

                  return (
                    <Card key={locale}>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          {locale === 'ar' ? 'العربية' : locale === 'en' ? 'English' : '中文'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-sm text-neutral-600 mb-1">الاسم</p>
                          <p className="text-lg font-semibold">{trans.name}</p>
                        </div>
                        {trans.shortDescription && (
                          <div>
                            <p className="text-sm text-neutral-600 mb-1">الوصف المختصر</p>
                            <p className="text-base">{trans.shortDescription}</p>
                          </div>
                        )}
                        {trans.description && (
                          <div>
                            <p className="text-sm text-neutral-600 mb-1">الوصف الكامل</p>
                            <div
                              className="prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: sanitizeHtml(trans.description) }}
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })
              ) : (
                <p className="text-center py-8 text-neutral-500">لا توجد ترجمات</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Specifications Tab */}
        <TabsContent value="specifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                المواصفات
              </CardTitle>
            </CardHeader>
            <CardContent>
              {equipment.specifications ? (
                <div className="space-y-4">
                  {Object.entries(equipment.specifications as Record<string, unknown>).map(([key, value]) => {
                    if (key === 'mode' || key === 'html') return null
                    return (
                      <div key={key} className="flex gap-4 py-2 border-b border-neutral-200 last:border-0">
                        <div className="font-semibold min-w-[150px]">{key}:</div>
                        <div className="flex-1">{String(value)}</div>
                      </div>
                    )
                  })}
                  {typeof equipment.specifications === 'object' &&
                  equipment.specifications !== null &&
                  'html' in equipment.specifications &&
                  (equipment.specifications as { html?: string }).html && (
                    <div className="mt-4 pt-4 border-t">
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeHtml((equipment.specifications as { html?: string }).html ?? ''),
                        }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center py-8 text-neutral-500">لا توجد مواصفات</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Related Equipment Tab */}
        <TabsContent value="related" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                المعدات ذات الصلة
              </CardTitle>
            </CardHeader>
            <CardContent>
              {equipment.relatedEquipment && equipment.relatedEquipment.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {equipment.relatedEquipment.map((item) => (
                    <Card key={item.id}>
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          <p className="font-mono text-sm font-semibold">{item.sku}</p>
                          {item.model && <p className="text-sm">{item.model}</p>}
                          <p className="text-xs text-neutral-500">{item.category.name}</p>
                          <Button variant="outline" size="sm" asChild className="mt-2">
                            <Link href={`/admin/inventory/equipment/${item.id}`}>
                              عرض
                              <ArrowRight className="mr-2 h-3 w-3" />
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-neutral-500">لا توجد معدات ذات صلة</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>الإعدادات الإضافية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {equipment.boxContents && (
                <div>
                  <p className="text-sm text-neutral-600 mb-2">محتوى الصندوق</p>
                  <div
                    className="prose prose-sm max-w-none p-4 bg-neutral-50 rounded-lg"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(equipment.boxContents) }}
                  />
                </div>
              )}
              {equipment.bufferTime !== undefined && (
                <div>
                  <p className="text-sm text-neutral-600 mb-1">وقت الفاصل</p>
                  <p className="text-lg">
                    {equipment.bufferTime} {equipment.bufferTimeUnit === 'days' ? 'أيام' : 'ساعات'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bookings Tab */}
        {equipment.bookings && equipment.bookings.length > 0 && (
          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  الحجوزات الأخيرة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الحجز</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>تاريخ البداية</TableHead>
                      <TableHead>تاريخ النهاية</TableHead>
                      <TableHead>الكمية</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {equipment.bookings.map((bookingEquipment) => (
                      <TableRow key={bookingEquipment.id}>
                        <TableCell className="font-mono">
                          {bookingEquipment.booking.bookingNumber}
                        </TableCell>
                        <TableCell>
                          <Badge>{bookingEquipment.booking.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(bookingEquipment.booking.startDate).toLocaleDateString('ar-SA')}
                        </TableCell>
                        <TableCell>
                          {new Date(bookingEquipment.booking.endDate).toLocaleDateString('ar-SA')}
                        </TableCell>
                        <TableCell>{bookingEquipment.quantity}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/bookings/${bookingEquipment.booking.id}`}>
                              عرض
                              <ArrowRight className="mr-2 h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
