/**
 * @file delivery/page.tsx
 * @description Delivery management page
 * @module app/admin/(routes)/ops/delivery
 * @author Engineering Team
 * @created 2026-01-28
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Truck, Plus, Calendar, MapPin, Phone, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils/format.utils'
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

interface Delivery {
  id: string
  bookingNumber: string
  type: 'pickup' | 'return'
  status: 'pending' | 'scheduled' | 'in_transit' | 'delivered' | 'failed' | 'cancelled'
  scheduledDate: string
  address: string
  city: string
  contactName: string
  contactPhone: string
  driver?: {
    id: string
    name: string | null
    email: string
  } | null
  equipment: Array<{
    id: string
    sku: string
    model: string | null
    quantity: number
  }>
  createdAt: string
  updatedAt: string
}

const STATUS_LABELS: Record<string, { ar: string; en: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { ar: 'قيد الانتظار', en: 'Pending', variant: 'outline' },
  scheduled: { ar: 'مجدولة', en: 'Scheduled', variant: 'secondary' },
  in_transit: { ar: 'قيد التوصيل', en: 'In Transit', variant: 'default' },
  delivered: { ar: 'تم التوصيل', en: 'Delivered', variant: 'default' },
  failed: { ar: 'فشل', en: 'Failed', variant: 'destructive' },
  cancelled: { ar: 'ملغي', en: 'Cancelled', variant: 'outline' },
}

const TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  pickup: { ar: 'استلام', en: 'Pickup' },
  return: { ar: 'إرجاع', en: 'Return' },
}

export default function DeliveryPage() {
  const { toast } = useToast()
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'scheduled' | 'in_transit'>('all')

  useEffect(() => {
    loadDeliveries()
  }, [filter])

  const loadDeliveries = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filter !== 'all') {
        params.set('status', filter)
      }

      const response = await fetch(`/api/delivery/pending?${params.toString()}`)
      if (!response.ok) {
        throw new Error('فشل تحميل التوصيلات')
      }

      const data = await response.json()
      setDeliveries(data.data || [])
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'حدث خطأ أثناء تحميل البيانات',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (bookingId: string, status: Delivery['status']) => {
    try {
      const response = await fetch(`/api/delivery/${bookingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        throw new Error('فشل تحديث الحالة')
      }

      toast({
        title: 'نجح',
        description: 'تم تحديث حالة التوصيل بنجاح',
      })

      loadDeliveries()
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'حدث خطأ أثناء تحديث الحالة',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">إدارة التوصيلات</h1>
          <p className="text-muted-foreground mt-2">
            جدولة ومتابعة توصيل المعدات
          </p>
        </div>
        <Link href="/admin/ops/delivery/schedule">
          <Button>
            <Plus className="h-4 w-4 ml-2" />
            جدولة توصيل
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          size="sm"
        >
          الكل
        </Button>
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          onClick={() => setFilter('pending')}
          size="sm"
        >
          قيد الانتظار
        </Button>
        <Button
          variant={filter === 'scheduled' ? 'default' : 'outline'}
          onClick={() => setFilter('scheduled')}
          size="sm"
        >
          مجدولة
        </Button>
        <Button
          variant={filter === 'in_transit' ? 'default' : 'outline'}
          onClick={() => setFilter('in_transit')}
          size="sm"
        >
          قيد التوصيل
        </Button>
      </div>

      {/* Deliveries Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة التوصيلات</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : deliveries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              لا توجد توصيلات
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الحجز</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التاريخ المقرر</TableHead>
                  <TableHead>العنوان</TableHead>
                  <TableHead>جهة الاتصال</TableHead>
                  <TableHead>السائق</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell>
                      <Link
                        href={`/admin/bookings/${delivery.id}`}
                        className="text-primary hover:underline"
                      >
                        {delivery.bookingNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {TYPE_LABELS[delivery.type]?.ar || delivery.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_LABELS[delivery.status]?.variant || 'default'}>
                        {STATUS_LABELS[delivery.status]?.ar || delivery.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDate(delivery.scheduledDate)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">
                          {delivery.address}, {delivery.city}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{delivery.contactName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{delivery.contactPhone}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {delivery.driver ? (
                        <span className="text-sm">
                          {delivery.driver.name || delivery.driver.email}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">غير محدد</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {delivery.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(delivery.id, 'scheduled')}
                          >
                            جدولة
                          </Button>
                        )}
                        {delivery.status === 'scheduled' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(delivery.id, 'in_transit')}
                          >
                            بدء التوصيل
                          </Button>
                        )}
                        {delivery.status === 'in_transit' && (
                          <Button
                            size="sm"
                            onClick={() => updateStatus(delivery.id, 'delivered')}
                          >
                            تم التوصيل
                          </Button>
                        )}
                        <Link href={`/admin/bookings/${delivery.id}`}>
                          <Button size="sm" variant="ghost">
                            عرض
                          </Button>
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
