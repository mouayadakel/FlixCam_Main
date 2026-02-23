/**
 * @file page.tsx
 * @description Equipment detail/view page
 * @module app/admin/(routes)/inventory/equipment/[id]
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight,
  Edit,
  Trash2,
  Calendar,
  Package,
  DollarSign,
  Image as ImageIcon,
  Video,
  Languages,
  FileText,
  Link as LinkIcon,
  Wrench,
  Plus,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import Image from 'next/image'
import DOMPurify from 'dompurify'
import { SpecificationsDisplay } from '@/components/features/equipment/specifications-display'
import type {
  Equipment,
  EquipmentCondition,
  MaintenanceType,
  MaintenanceStatus,
} from '@prisma/client'

const MAINT_TYPE_LABELS: Record<string, string> = {
  PREVENTIVE: 'وقائية',
  CORRECTIVE: 'تصحيحية',
  INSPECTION: 'فحص',
  REPAIR: 'إصلاح',
  CALIBRATION: 'معايرة',
}

const MAINT_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'مجدولة',
  IN_PROGRESS: 'جارية',
  COMPLETED: 'مكتملة',
  CANCELLED: 'ملغاة',
  OVERDUE: 'متأخرة',
}

const MAINT_STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
  OVERDUE: 'bg-red-100 text-red-800',
}

interface MaintenanceRecord {
  id: string
  maintenanceNumber: string
  type: string
  status: string
  priority: string
  scheduledDate: string
  completedDate: string | null
  description: string
  cost: number | null
  equipmentConditionBefore: string | null
  equipmentConditionAfter: string | null
}

const ALLOWED_HTML_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'ul',
  'ol',
  'li',
  'a',
  'h1',
  'h2',
  'h3',
  'span',
  'div',
]

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
  translations?: Record<
    string,
    {
      name?: string
      description?: string
      longDescription?: string
      shortDescription?: string
      seoTitle?: string
      seoDescription?: string
      seoKeywords?: string
    }
  >
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
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([])
  const [maintLoading, setMaintLoading] = useState(false)
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [newMaint, setNewMaint] = useState({
    type: 'PREVENTIVE' as string,
    priority: 'medium',
    scheduledDate: '',
    description: '',
  })

  useEffect(() => {
    loadEquipment()
    loadMaintenance()
  }, [params.id])

  const loadMaintenance = async () => {
    setMaintLoading(true)
    try {
      const res = await fetch(`/api/maintenance?equipmentId=${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setMaintenanceRecords(data.records ?? data.data ?? [])
      }
    } catch {
      /* non-critical */
    }
    setMaintLoading(false)
  }

  const handleScheduleMaintenance = async () => {
    if (!newMaint.scheduledDate || !newMaint.description) {
      toast({ title: 'خطأ', description: 'يرجى ملء التاريخ والوصف', variant: 'destructive' })
      return
    }
    setScheduling(true)
    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentId: params.id,
          type: newMaint.type,
          priority: newMaint.priority,
          scheduledDate: new Date(newMaint.scheduledDate).toISOString(),
          description: newMaint.description,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'فشل الجدولة')
      }
      toast({ title: 'تم', description: 'تم جدولة الصيانة بنجاح' })
      setShowScheduleDialog(false)
      setNewMaint({ type: 'PREVENTIVE', priority: 'medium', scheduledDate: '', description: '' })
      loadMaintenance()
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل الجدولة',
        variant: 'destructive',
      })
    } finally {
      setScheduling(false)
    }
  }

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
          <Button
            variant="outline"
            onClick={handleDelete}
            className="text-error-600 hover:text-error-700"
          >
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
          <TabsTrigger value="maintenance">الصيانة</TabsTrigger>
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
                      <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-lg border border-neutral-200">
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
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                        {equipment.media
                          .filter((m) => m.type === 'image')
                          .slice(1)
                          .map((media, index) => (
                            <div
                              key={media.id}
                              className="relative aspect-square overflow-hidden rounded-lg border border-neutral-200"
                            >
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
                      <div className="relative aspect-video overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                        <video
                          src={equipment.media.find((m) => m.type === 'video')?.url}
                          controls
                          className="h-full w-full"
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="py-8 text-center text-neutral-500">لا توجد وسائط</p>
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
                          <p className="mb-1 text-sm text-neutral-600">الاسم</p>
                          <p className="text-lg font-semibold">{trans.name}</p>
                        </div>
                        {trans.shortDescription && (
                          <div>
                            <p className="mb-1 text-sm text-neutral-600">الوصف المختصر</p>
                            <p className="text-base">{trans.shortDescription}</p>
                          </div>
                        )}
                        {(trans.longDescription ?? trans.description) && (
                          <div>
                            <p className="mb-1 text-sm text-neutral-600">الوصف الكامل</p>
                            <div
                              className="prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{
                                __html: sanitizeHtml(
                                  trans.longDescription ?? trans.description ?? ''
                                ),
                              }}
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })
              ) : (
                <p className="py-8 text-center text-neutral-500">لا توجد ترجمات</p>
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
              <SpecificationsDisplay
                specifications={
                  (equipment.specifications as import('@/lib/types/specifications.types').AnySpecifications) ??
                  null
                }
                locale="ar"
                showQuickSpecPills={true}
              />
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
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                <p className="py-8 text-center text-neutral-500">لا توجد معدات ذات صلة</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                سجل الصيانة
              </CardTitle>
              <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="ml-2 h-4 w-4" />
                    جدولة صيانة
                  </Button>
                </DialogTrigger>
                <DialogContent dir="rtl">
                  <DialogHeader>
                    <DialogTitle>جدولة صيانة جديدة</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>نوع الصيانة</Label>
                      <Select
                        value={newMaint.type}
                        onValueChange={(v) => setNewMaint((p) => ({ ...p, type: v }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(MAINT_TYPE_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>الأولوية</Label>
                      <Select
                        value={newMaint.priority}
                        onValueChange={(v) => setNewMaint((p) => ({ ...p, priority: v }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">منخفضة</SelectItem>
                          <SelectItem value="medium">متوسطة</SelectItem>
                          <SelectItem value="high">عالية</SelectItem>
                          <SelectItem value="urgent">عاجلة</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>تاريخ الصيانة</Label>
                      <Input
                        type="date"
                        className="mt-1"
                        value={newMaint.scheduledDate}
                        onChange={(e) =>
                          setNewMaint((p) => ({ ...p, scheduledDate: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>الوصف</Label>
                      <Textarea
                        className="mt-1"
                        rows={3}
                        placeholder="وصف الصيانة المطلوبة..."
                        value={newMaint.description}
                        onChange={(e) =>
                          setNewMaint((p) => ({ ...p, description: e.target.value }))
                        }
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleScheduleMaintenance}
                      disabled={scheduling}
                    >
                      {scheduling && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                      جدولة
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {maintLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14" />
                  ))}
                </div>
              ) : maintenanceRecords.length === 0 ? (
                <p className="py-8 text-center text-neutral-500">لا توجد سجلات صيانة</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>الأولوية</TableHead>
                      <TableHead>التاريخ المجدول</TableHead>
                      <TableHead>تاريخ الإكمال</TableHead>
                      <TableHead>الوصف</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenanceRecords.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-mono text-sm">{m.maintenanceNumber}</TableCell>
                        <TableCell>{MAINT_TYPE_LABELS[m.type] ?? m.type}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={MAINT_STATUS_COLORS[m.status] ?? ''}
                          >
                            {MAINT_STATUS_LABELS[m.status] ?? m.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              m.priority === 'urgent'
                                ? 'destructive'
                                : m.priority === 'high'
                                  ? 'default'
                                  : 'secondary'
                            }
                          >
                            {m.priority === 'urgent'
                              ? 'عاجلة'
                              : m.priority === 'high'
                                ? 'عالية'
                                : m.priority === 'medium'
                                  ? 'متوسطة'
                                  : 'منخفضة'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(m.scheduledDate).toLocaleDateString('ar-SA')}
                        </TableCell>
                        <TableCell>
                          {m.completedDate
                            ? new Date(m.completedDate).toLocaleDateString('ar-SA')
                            : '—'}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">
                          {m.description}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                  <p className="mb-2 text-sm text-neutral-600">محتوى الصندوق</p>
                  <div
                    className="prose prose-sm max-w-none rounded-lg bg-neutral-50 p-4"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(equipment.boxContents) }}
                  />
                </div>
              )}
              {equipment.bufferTime !== undefined && (
                <div>
                  <p className="mb-1 text-sm text-neutral-600">وقت الفاصل</p>
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
