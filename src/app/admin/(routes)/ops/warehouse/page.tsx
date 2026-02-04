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
import { Package, ArrowRight, ArrowLeft, Box } from 'lucide-react'
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
        <p className="text-muted-foreground mt-2">
          إدارة عمليات إخراج وإرجاع المعدات
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              جاهز للإخراج
            </CardTitle>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{checkOutQueue.length}</div>
            )}
            <p className="text-xs text-muted-foreground">
              حجز جاهز للإخراج
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              جاهز للإرجاع
            </CardTitle>
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{checkInQueue.length}</div>
            )}
            <p className="text-xs text-muted-foreground">
              حجز جاهز للإرجاع
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              المخزون
            </CardTitle>
            <Box className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">
              <Link
                href="/admin/ops/warehouse/inventory"
                className="text-primary hover:underline"
              >
                عرض المخزون
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4">
        <Link href="/admin/ops/warehouse/check-out">
          <Button>
            <ArrowRight className="h-4 w-4 ml-2" />
            إخراج معدات
          </Button>
        </Link>
        <Link href="/admin/ops/warehouse/check-in">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 ml-2" />
            إرجاع معدات
          </Button>
        </Link>
        <Link href="/admin/ops/warehouse/inventory">
          <Button variant="outline">
            <Package className="h-4 w-4 ml-2" />
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
            <p className="text-sm text-muted-foreground text-center py-8">
              لا توجد حجوزات جاهزة للإخراج
            </p>
          ) : (
            <div className="space-y-4">
              {checkOutQueue.slice(0, 5).map((booking) => (
                <div
                  key={booking.id}
                  className="border rounded-lg p-4 hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{booking.bookingNumber}</Badge>
                        <span className="font-medium">
                          {booking.customer.name || booking.customer.email}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {booking.equipment.length} معدات • من{' '}
                        {formatDate(booking.startDate)} إلى{' '}
                        {formatDate(booking.endDate)}
                      </p>
                    </div>
                    <Link href={`/admin/ops/warehouse/check-out?booking=${booking.id}`}>
                      <Button size="sm">
                        <ArrowRight className="h-4 w-4 ml-2" />
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
            <p className="text-sm text-muted-foreground text-center py-8">
              لا توجد حجوزات جاهزة للإرجاع
            </p>
          ) : (
            <div className="space-y-4">
              {checkInQueue.slice(0, 5).map((booking) => (
                <div
                  key={booking.id}
                  className="border rounded-lg p-4 hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{booking.bookingNumber}</Badge>
                        <span className="font-medium">
                          {booking.customer.name || booking.customer.email}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {booking.equipment.length} معدات • من{' '}
                        {formatDate(booking.startDate)} إلى{' '}
                        {formatDate(booking.endDate)}
                      </p>
                    </div>
                    <Link href={`/admin/ops/warehouse/check-in?booking=${booking.id}`}>
                      <Button size="sm" variant="outline">
                        <ArrowLeft className="h-4 w-4 ml-2" />
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
