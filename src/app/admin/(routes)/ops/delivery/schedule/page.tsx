/**
 * @file schedule/page.tsx
 * @description Delivery schedule – day/week list view, filters, assign driver, mark delivered
 * @module app/admin/(routes)/ops/delivery/schedule
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Truck,
  Calendar,
  MapPin,
  Phone,
  User,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatDateTime } from '@/lib/utils/format.utils'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'

interface DeliveryItem {
  id: string
  bookingId?: string
  deliveryNumber: string
  bookingNumber: string
  type: 'pickup' | 'return'
  status: string
  scheduledDate: string
  address: string
  city: string
  contactName: string
  contactPhone: string
  driver?: { id: string; name: string | null; email: string } | null
  equipment: Array<{ id: string; sku: string; model: string | null; quantity: number }>
  createdAt: string
  updatedAt: string
}

const STATUS_LABELS: Record<string, { ar: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { ar: 'قيد الانتظار', variant: 'outline' },
  scheduled: { ar: 'مجدولة', variant: 'secondary' },
  in_transit: { ar: 'قيد التوصيل', variant: 'default' },
  delivered: { ar: 'تم التوصيل', variant: 'default' },
  failed: { ar: 'فشل', variant: 'destructive' },
  cancelled: { ar: 'ملغي', variant: 'outline' },
}

const TYPE_LABELS: Record<string, string> = {
  pickup: 'استلام',
  return: 'إرجاع',
}

export default function DeliverySchedulePage() {
  const { toast } = useToast()
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const loadDeliveries = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      if (typeFilter && typeFilter !== 'all') params.set('type', typeFilter)

      const res = await fetch(`/api/delivery/pending?${params.toString()}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'فشل تحميل التوصيلات')
      }
      const data = await res.json()
      const list = data.data ?? []
      setDeliveries(Array.isArray(list) ? list : [])
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'فشل تحميل التوصيلات'
      setLoadError(msg)
      setDeliveries([])
      toast({
        title: 'خطأ',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDeliveries()
  }, [typeFilter])

  const handleApplyDateFilter = () => {
    loadDeliveries()
  }

  const handleStatusUpdate = async (delivery: DeliveryItem, status: string) => {
    const id = delivery.bookingId ?? delivery.id
    setUpdatingId(delivery.id)
    try {
      const res = await fetch(`/api/delivery/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, deliveryId: delivery.id }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'فشل تحديث الحالة')
      }
      toast({ title: 'تم', description: 'تم تحديث حالة التوصيل' })
      await loadDeliveries()
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحديث الحالة',
        variant: 'destructive',
      })
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8 text-primary" />
            جدولة التوصيل
          </h1>
          <p className="text-muted-foreground mt-1">
            عرض التوصيلات المعلقة والمجدولة حسب التاريخ والنوع
          </p>
        </div>
        <Link href="/admin/ops/delivery">
          <Button variant="outline">
            <ChevronRight className="h-4 w-4 ml-2" />
            إدارة التوصيلات
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>الفلاتر</CardTitle>
          <CardDescription>نطاق التاريخ، نوع التوصيل</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">من تاريخ</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">إلى تاريخ</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40"
            />
          </div>
          <Button variant="secondary" onClick={handleApplyDateFilter}>
            تطبيق
          </Button>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">نوع التوصيل</label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="الكل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="pickup">{TYPE_LABELS.pickup}</SelectItem>
                <SelectItem value="return">{TYPE_LABELS.return}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* List view */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة التوصيلات</CardTitle>
          <CardDescription>
            التوصيلات في نطاق الفلتر (قيد الانتظار، مجدولة، قيد التوصيل)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : loadError ? (
            <div className="py-12 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <p className="font-medium text-destructive">{loadError}</p>
              <Button variant="outline" className="mt-4" onClick={loadDeliveries}>
                <RefreshCw className="h-4 w-4 ml-2" />
                إعادة المحاولة
              </Button>
            </div>
          ) : deliveries.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">لا توجد توصيلات</p>
              <p className="text-sm">غيّر نطاق التاريخ أو النوع</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الحجز</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التاريخ المقرر</TableHead>
                  <TableHead>الوقت المقدر</TableHead>
                  <TableHead>العنوان</TableHead>
                  <TableHead>جهة الاتصال / هاتف</TableHead>
                  <TableHead>السائق</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Link
                        href={d.bookingId ? `/admin/bookings/${d.bookingId}` : '/admin/bookings'}
                        className="text-primary hover:underline"
                      >
                        {d.bookingNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{TYPE_LABELS[d.type] ?? d.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_LABELS[d.status]?.variant ?? 'default'}>
                        {STATUS_LABELS[d.status]?.ar ?? d.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(d.scheduledDate)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDateTime(d.scheduledDate)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate max-w-[160px]">
                          {d.address}, {d.city}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-sm">{d.contactName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-sm">{d.contactPhone}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {d.driver ? (
                        <span className="text-sm">{d.driver.name || d.driver.email}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 flex-wrap">
                        {d.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updatingId === d.id}
                            onClick={() => handleStatusUpdate(d, 'scheduled')}
                          >
                            جدولة
                          </Button>
                        )}
                        {d.status === 'scheduled' && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updatingId === d.id}
                            onClick={() => handleStatusUpdate(d, 'in_transit')}
                          >
                            بدء التوصيل
                          </Button>
                        )}
                        {d.status === 'in_transit' && (
                          <Button
                            size="sm"
                            disabled={updatingId === d.id}
                            onClick={() => handleStatusUpdate(d, 'delivered')}
                          >
                            تم التوصيل
                          </Button>
                        )}
                        <Link href={d.bookingId ? `/admin/bookings/${d.bookingId}` : '/admin/bookings'}>
                          <Button size="sm" variant="ghost">عرض</Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
