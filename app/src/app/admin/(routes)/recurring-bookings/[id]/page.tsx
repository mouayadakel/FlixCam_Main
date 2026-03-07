/**
 * @file page.tsx
 * @description Recurring series detail – view, update name/active, delete, list bookings
 * @module app/admin/(routes)/recurring-bookings/[id]
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Loader2, Pencil, Trash2, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils/format.utils'

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: 'يومي',
  WEEKLY: 'أسبوعي',
  MONTHLY: 'شهري',
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'مسودة',
  CONFIRMED: 'مؤكد',
  ACTIVE: 'نشط',
  CANCELLED: 'ملغي',
  CLOSED: 'مغلق',
  RETURNED: 'مرتجع',
  PAYMENT_PENDING: 'انتظار الدفع',
  RISK_CHECK: 'فحص المخاطر',
}

interface SeriesDetail {
  id: string
  name: string
  customerId: string
  customer: { id: string; name: string | null; email: string }
  frequency: string
  interval: number
  endDate: string | null
  occurrenceCount: number | null
  template: {
    equipmentIds?: Array<{ equipmentId: string; quantity: number }>
    studioId?: string
    notes?: string
  } | null
  isActive: boolean
  bookings: Array<{
    id: string
    bookingNumber: string
    startDate: string
    endDate: string
    status: string
  }>
  createdAt: string
  updatedAt: string
}

export default function RecurringSeriesDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [series, setSeries] = useState<SeriesDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editName, setEditName] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)

  const id = params?.id as string

  useEffect(() => {
    if (id) loadSeries()
  }, [id])

  const loadSeries = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/recurring-series/${id}`)
      if (!res.ok) {
        if (res.status === 404) {
          toast({ title: 'غير موجود', description: 'السلسلة غير موجودة', variant: 'destructive' })
          router.push('/admin/recurring-bookings')
          return
        }
        throw new Error('فشل التحميل')
      }
      const data = await res.json()
      setSeries(data)
      setEditName(data.name ?? '')
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحميل السلسلة',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateName = async () => {
    if (!editName.trim() || !id) return
    setSaving(true)
    try {
      const res = await fetch(`/api/recurring-series/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      })
      if (!res.ok) throw new Error('فشل التحديث')
      setSeries((prev) => (prev ? { ...prev, name: editName.trim() } : null))
      setIsEditingName(false)
      toast({ title: 'تم', description: 'تم تحديث الاسم' })
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل التحديث',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (checked: boolean) => {
    if (!id) return
    setSaving(true)
    try {
      const res = await fetch(`/api/recurring-series/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: checked }),
      })
      if (!res.ok) throw new Error('فشل التحديث')
      setSeries((prev) => (prev ? { ...prev, isActive: checked } : null))
      toast({ title: 'تم', description: checked ? 'السلسلة نشطة' : 'السلسلة متوقفة' })
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل التحديث',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!id) return
    setSaving(true)
    try {
      const res = await fetch(`/api/recurring-series/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('فشل الحذف')
      toast({ title: 'تم', description: 'تم حذف السلسلة (حذف تدريجي)' })
      router.push('/admin/recurring-bookings')
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل الحذف',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading || !series) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/recurring-bookings" className="hover:text-foreground">
          الحجوزات المتكررة
        </Link>
        <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        <span>{series.name}</span>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{series.name}</h1>
        <div className="flex gap-2">
          {isEditingName ? (
            <>
              <Input
                className="w-48"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
              <Button size="sm" onClick={handleUpdateName} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'حفظ'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsEditingName(false)
                  setEditName(series.name)
                }}
              >
                إلغاء
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsEditingName(true)}>
              <Pencil className="ms-1 h-4 w-4" />
              تعديل الاسم
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="ms-1 h-4 w-4" />
                حذف
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>حذف السلسلة؟</AlertDialogTitle>
                <AlertDialogDescription>
                  سيتم حذف السلسلة تدريجياً. الحجوزات المرتبطة لن تُحذف.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground"
                >
                  حذف
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>تفاصيل السلسلة</CardTitle>
          <CardDescription>العميل، التكرار، والحالة</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label className="text-muted-foreground">العميل</Label>
              <div className="font-medium">
                <Link
                  href={`/admin/clients/${series.customerId}`}
                  className="text-primary hover:underline"
                >
                  {series.customer?.name ?? '—'}
                </Link>
              </div>
              <div className="text-sm text-muted-foreground">{series.customer?.email}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">التكرار</Label>
              <p className="font-medium">
                كل {series.interval} {FREQUENCY_LABELS[series.frequency] ?? series.frequency}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">تاريخ النهاية</Label>
              <p>
                {series.endDate
                  ? formatDate(series.endDate)
                  : series.occurrenceCount
                    ? `بعد ${series.occurrenceCount} مرة`
                    : '—'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="active">نشط</Label>
              <Switch
                id="active"
                checked={series.isActive}
                onCheckedChange={handleToggleActive}
                disabled={saving}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {series.template && (series.template.equipmentIds?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>قالب المعدات</CardTitle>
            <CardDescription>المعدات المطبقة على كل حجز</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc">
              {series.template.equipmentIds?.map(
                (item: { equipmentId: string; quantity: number }, idx: number) => (
                  <li key={idx}>
                    {item.equipmentId} — كمية: {item.quantity}
                  </li>
                )
              )}
            </ul>
            {series.template.notes && (
              <p className="mt-2 text-sm text-muted-foreground">ملاحظات: {series.template.notes}</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>حجوزات السلسلة</CardTitle>
          <CardDescription>آخر 50 حجز مرتبط بهذه السلسلة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الحجز</TableHead>
                  <TableHead>البداية</TableHead>
                  <TableHead>النهاية</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-end">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!series.bookings?.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                      لا توجد حجوزات
                    </TableCell>
                  </TableRow>
                ) : (
                  series.bookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono">{b.bookingNumber}</TableCell>
                      <TableCell>{formatDate(b.startDate)}</TableCell>
                      <TableCell>{formatDate(b.endDate)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{STATUS_LABELS[b.status] ?? b.status}</Badge>
                      </TableCell>
                      <TableCell className="text-end">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/bookings/${b.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
