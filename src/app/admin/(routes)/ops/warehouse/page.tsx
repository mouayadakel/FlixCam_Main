/**
 * @file warehouse/page.tsx
 * @description Warehouse operations overview page
 * @module app/admin/(routes)/ops/warehouse
 * @author Engineering Team
 * @created 2026-01-28
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Package, ArrowRight, ArrowLeft, Box, QrCode } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils/format.utils'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

interface Booking {
  id: string
  bookingNumber: string
  startDate: string
  endDate: string
  customer: {
    name: string | null
    email: string
  }
  equipment: Array<{
    id: string
    quantity: number
    equipment: {
      id: string
      sku: string
      model: string | null
    }
  }>
}

export default function WarehousePage() {
  const { toast } = useToast()
  const [checkOutQueue, setCheckOutQueue] = useState<Booking[]>([])
  const [checkInQueue, setCheckInQueue] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadQueues()
  }, [])

  const loadQueues = async () => {
    try {
      setLoading(true)

      const [checkOutRes, checkInRes] = await Promise.all([
        fetch('/api/warehouse/queue/check-out'),
        fetch('/api/warehouse/queue/check-in'),
      ])

      if (!checkOutRes.ok || !checkInRes.ok) {
        throw new Error('فشل تحميل قوائم الانتظار')
      }

      const checkOutData = await checkOutRes.json()
      const checkInData = await checkInRes.json()

      setCheckOutQueue(checkOutData.data || [])
      setCheckInQueue(checkInData.data || [])
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

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold">المستودع</h1>
        <p className="mt-2 text-muted-foreground">إدارة عمليات إخراج وإرجاع المعدات</p>
      </div>

      {/* Mobile: Giant QR scan CTA */}
      <Link
        href="/admin/ops/warehouse/check-out"
        className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary bg-primary/5 py-10 transition-colors active:scale-[0.98] lg:hidden"
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-white">
          <QrCode className="h-10 w-10" />
        </div>
        <span className="text-lg font-bold text-primary">مسح QR للإخراج أو الإرجاع</span>
        <span className="text-sm text-muted-foreground">اضغط للانتقال إلى إخراج / إرجاع معدات</span>
      </Link>

      {/* Quick Stats - 2 col on mobile per plan */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">جاهز للإخراج</CardTitle>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{checkOutQueue.length}</div>
            )}
            <p className="text-xs text-muted-foreground">حجز جاهز للإخراج</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">جاهز للإرجاع</CardTitle>
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{checkInQueue.length}</div>
            )}
            <p className="text-xs text-muted-foreground">حجز جاهز للإرجاع</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المخزون</CardTitle>
            <Box className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">
              <Link href="/admin/ops/warehouse/inventory" className="text-primary hover:underline">
                عرض المخزون
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - stacked full-width on mobile, large tap targets */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
        <Link href="/admin/ops/warehouse/check-out" className="w-full sm:w-auto">
          <Button className="h-12 min-h-[44px] w-full sm:h-auto sm:w-auto" size="lg">
            <ArrowRight className="ml-2 h-5 w-5" />
            إخراج معدات
          </Button>
        </Link>
        <Link href="/admin/ops/warehouse/check-in" className="w-full sm:w-auto">
          <Button
            variant="outline"
            className="h-12 min-h-[44px] w-full sm:h-auto sm:w-auto"
            size="lg"
          >
            <ArrowLeft className="ml-2 h-5 w-5" />
            إرجاع معدات
          </Button>
        </Link>
        <Link href="/admin/ops/warehouse/inventory" className="w-full sm:w-auto">
          <Button
            variant="outline"
            className="h-12 min-h-[44px] w-full sm:h-auto sm:w-auto"
            size="lg"
          >
            <Package className="ml-2 h-5 w-5" />
            عرض المخزون
          </Button>
        </Link>
      </div>

      {/* Check-Out Queue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>قائمة الإخراج</CardTitle>
            <Link href="/admin/ops/warehouse/check-out">
              <Button variant="outline" size="sm">
                عرض الكل
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : checkOutQueue.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              لا توجد حجوزات جاهزة للإخراج
            </p>
          ) : (
            <div className="space-y-4">
              {checkOutQueue.slice(0, 5).map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-lg border p-4 transition-colors hover:bg-neutral-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{booking.bookingNumber}</Badge>
                        <span className="font-medium">
                          {booking.customer.name || booking.customer.email}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {booking.equipment.length} معدات • من {formatDate(booking.startDate)} إلى{' '}
                        {formatDate(booking.endDate)}
                      </p>
                    </div>
                    <Link href={`/admin/ops/warehouse/check-out?booking=${booking.id}`}>
                      <Button size="sm">
                        <ArrowRight className="ml-2 h-4 w-4" />
                        إخراج
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check-In Queue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>قائمة الإرجاع</CardTitle>
            <Link href="/admin/ops/warehouse/check-in">
              <Button variant="outline" size="sm">
                عرض الكل
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : checkInQueue.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              لا توجد حجوزات جاهزة للإرجاع
            </p>
          ) : (
            <div className="space-y-4">
              {checkInQueue.slice(0, 5).map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-lg border p-4 transition-colors hover:bg-neutral-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{booking.bookingNumber}</Badge>
                        <span className="font-medium">
                          {booking.customer.name || booking.customer.email}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {booking.equipment.length} معدات • من {formatDate(booking.startDate)} إلى{' '}
                        {formatDate(booking.endDate)}
                      </p>
                    </div>
                    <Link href={`/admin/ops/warehouse/check-in?booking=${booking.id}`}>
                      <Button size="sm" variant="outline">
                        <ArrowLeft className="ml-2 h-4 w-4" />
                        إرجاع
                      </Button>
                    </Link>
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
