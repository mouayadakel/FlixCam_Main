/**
 * @file delivery/page.tsx
 * @description Delivery management page (Overview + Schedule tabs)
 * @module app/admin/(routes)/ops/delivery
 * @author Engineering Team
 * @created 2026-01-28
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Truck, Calendar, MapPin, Phone, User, RefreshCw, AlertTriangle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DeliveryScheduleTab } from './_components/delivery-schedule-tab'
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

const STATUS_LABELS: Record<
  string,
  { ar: string; en: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
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
  const searchParams = useSearchParams()
  const tabParam = searchParams?.get('tab') ?? 'overview'
  const [activeTab, setActiveTab] = useState(tabParam === 'schedule' ? 'schedule' : 'overview')
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'scheduled' | 'in_transit'>('all')

  useEffect(() => {
    const t = searchParams?.get('tab') ?? 'overview'
    setActiveTab(t === 'schedule' ? 'schedule' : 'overview')
  }, [searchParams])

  const summary = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return {
      pending: deliveries.filter((d) => d.status === 'pending').length,
      scheduled: deliveries.filter((d) => d.status === 'scheduled').length,
      inTransit: deliveries.filter((d) => d.status === 'in_transit').length,
      today: deliveries.filter((d) => {
        const date = new Date(d.scheduledDate)
        return date >= today && date < tomorrow
      }).length,
      noDriver: deliveries.filter(
        (d) => !d.driver && (d.status === 'pending' || d.status === 'scheduled')
      ).length,
    }
  }, [deliveries])

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

  const updateTab = (value: string) => {
    setActiveTab(value)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', value)
    window.history.replaceState({}, '', url.toString())
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">إدارة التوصيلات</h1>
          <p className="mt-2 text-muted-foreground">جدولة ومتابعة توصيل المعدات</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadDeliveries} disabled={loading}>
            <RefreshCw className={`ml-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          <Button onClick={() => updateTab('schedule')}>
            <Calendar className="ml-2 h-4 w-4" />
            جدولة التوصيل
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={updateTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="schedule">جدولة التوصيل</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
      {/* KPI Summary */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card>
          <CardContent className="pb-3 pt-4">
            <p className="text-sm text-muted-foreground">قيد الانتظار</p>
            <p className={`text-2xl font-bold ${summary.pending > 0 ? 'text-amber-600' : ''}`}>
              {summary.pending}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-3 pt-4">
            <p className="text-sm text-muted-foreground">مجدولة</p>
            <p className="text-2xl font-bold text-blue-600">{summary.scheduled}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-3 pt-4">
            <p className="text-sm text-muted-foreground">قيد التوصيل</p>
            <p className="text-2xl font-bold text-green-600">{summary.inTransit}</p>
          </CardContent>
        </Card>
        <Card className={summary.today > 0 ? 'border-primary/50' : ''}>
          <CardContent className="pb-3 pt-4">
            <p className="text-sm text-muted-foreground">اليوم</p>
            <p className={`text-2xl font-bold ${summary.today > 0 ? 'text-primary' : ''}`}>
              {summary.today}
            </p>
          </CardContent>
        </Card>
        <Card className={summary.noDriver > 0 ? 'border-red-300' : ''}>
          <CardContent className="pb-3 pt-4">
            <div className="flex items-center gap-1">
              {summary.noDriver > 0 && <AlertTriangle className="h-3 w-3 text-red-500" />}
              <p className="text-sm text-muted-foreground">بدون سائق</p>
            </div>
            <p className={`text-2xl font-bold ${summary.noDriver > 0 ? 'text-red-600' : ''}`}>
              {summary.noDriver}
            </p>
          </CardContent>
        </Card>
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
            <p className="py-8 text-center text-sm text-muted-foreground">لا توجد توصيلات</p>
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
                    <TableCell>{formatDate(delivery.scheduledDate)}</TableCell>
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
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                          <span className="text-sm text-amber-600">غير محدد</span>
                        </div>
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
                          <Button size="sm" onClick={() => updateStatus(delivery.id, 'delivered')}>
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
        </TabsContent>

        <TabsContent value="schedule" className="mt-4">
          <DeliveryScheduleTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
