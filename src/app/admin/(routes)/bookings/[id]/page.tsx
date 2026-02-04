/**
 * @file page.tsx
 * @description Booking detail page with state machine UI
 * @module app/admin/(routes)/bookings/[id]
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Calendar, DollarSign, User, Package, FileText, AlertTriangle } from 'lucide-react'
import { BookingStateMachine } from '@/components/features/bookings/booking-state-machine'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatDate } from '@/lib/utils/format.utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { BookingState } from '@/lib/types/booking.types'
import { BookingStatus } from '@prisma/client'

interface Booking {
  id: string
  bookingNumber: string
  status: BookingStatus
  startDate: Date | string
  endDate: Date | string
  totalAmount: number | string
  depositAmount: number | string | null
  vatAmount: number | string
  notes: string | null
  studioId?: string | null
  delivery_required?: boolean
  createdAt: Date | string
  updatedAt: Date | string
  customer: {
    id: string
    name: string | null
    email: string
    phone: string | null
  }
  studio?: {
    id: string
    name: string | null
  } | null
  equipment?: Array<{
    id: string
    quantity: number
    equipment: {
      id: string
      sku: string
      model: string | null
      category?: {
        name: string
      }
      brand?: {
        name: string
      } | null
    }
  }>
  payments?: Array<{
    id: string
    amount: number | string
    status: string
    createdAt: Date | string
  }>
  contracts?: Array<{
    id: string
    status: string
  }>
}

export default function BookingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [transitioning, setTransitioning] = useState(false)
  const [damageClaims, setDamageClaims] = useState<Array<{ id: string; status: string; damageType: string; severity: string; estimatedCost: string }>>([])

  useEffect(() => {
    loadBooking()
  }, [params.id])

  useEffect(() => {
    if (booking?.id) {
      fetch(`/api/bookings/${booking.id}/damage-claims`)
        .then((r) => r.ok ? r.json() : { claims: [] })
        .then((d) => setDamageClaims(d.claims ?? []))
        .catch(() => setDamageClaims([]))
    }
  }, [booking?.id])

  const loadBooking = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/bookings/${params.id}`)
      if (!response.ok) {
        throw new Error('فشل تحميل الحجز')
      }
      const data = await response.json()
      setBooking(data)
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحميل الحجز',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStateTransition = async (toState: BookingState) => {
    if (!booking) return

    setTransitioning(true)
    try {
      const response = await fetch(`/api/bookings/${params.id}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toState,
          reason: `تم تغيير الحالة من ${booking.status} إلى ${toState}`,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'فشل تغيير الحالة')
      }

      toast({
        title: 'نجح',
        description: 'تم تغيير حالة الحجز بنجاح',
      })

      // Reload booking
      await loadBooking()
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تغيير الحالة',
        variant: 'destructive',
      })
    } finally {
      setTransitioning(false)
    }
  }

  const formatAmount = (amount: number | string | null) => {
    if (!amount) return '0.00'
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    return formatCurrency(numAmount)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">الحجز غير موجود</p>
        <Button asChild className="mt-4">
          <Link href="/admin/bookings">العودة إلى الحجوزات</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">حجز #{booking.bookingNumber}</h1>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/bookings">
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة
          </Link>
        </Button>
      </div>

      {/* State Machine */}
      <Card>
        <CardHeader>
          <CardTitle>حالة الحجز</CardTitle>
          <CardDescription>مسار حالة الحجز والانتقالات المتاحة</CardDescription>
        </CardHeader>
        <CardContent>
          <BookingStateMachine
            currentState={booking.status}
            onTransition={handleStateTransition}
            loading={transitioning}
          />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary">ملخص</TabsTrigger>
          <TabsTrigger value="equipment">المعدات</TabsTrigger>
          <TabsTrigger value="schedule">الجدول الزمني</TabsTrigger>
          <TabsTrigger value="payments">الدفعات</TabsTrigger>
          <TabsTrigger value="contracts">العقود</TabsTrigger>
          <TabsTrigger value="damage">مطالبات الأضرار</TabsTrigger>
          <TabsTrigger value="delivery">التوصيل</TabsTrigger>
          <TabsTrigger value="returns">الإرجاع</TabsTrigger>
          <TabsTrigger value="notes">الملاحظات</TabsTrigger>
          <TabsTrigger value="audit">السجل</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  معلومات العميل
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <div className="text-sm text-muted-foreground">الاسم</div>
                  <div className="font-medium">{booking.customer.name || 'بدون اسم'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">البريد الإلكتروني</div>
                  <div className="font-medium">{booking.customer.email}</div>
                </div>
                {booking.customer.phone && (
                  <div>
                    <div className="text-sm text-muted-foreground">الهاتف</div>
                    <div className="font-medium">{booking.customer.phone}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  التواريخ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <div className="text-sm text-muted-foreground">تاريخ البداية</div>
                  <div className="font-medium">{formatDate(booking.startDate)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">تاريخ النهاية</div>
                  <div className="font-medium">{formatDate(booking.endDate)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">تاريخ الإنشاء</div>
                  <div className="font-medium">{formatDate(booking.createdAt)}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  المبالغ المالية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <div className="text-sm text-muted-foreground">المبلغ الإجمالي</div>
                  <div className="font-medium text-lg">{formatAmount(booking.totalAmount)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">العهدة</div>
                  <div className="font-medium">{formatAmount(booking.depositAmount)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">ضريبة القيمة المضافة</div>
                  <div className="font-medium">{formatAmount(booking.vatAmount)}</div>
                </div>
              </CardContent>
            </Card>

            {booking.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    الملاحظات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{booking.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Equipment Tab */}
        <TabsContent value="equipment">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                المعدات المحجوزة
              </CardTitle>
            </CardHeader>
            <CardContent>
              {booking.equipment && booking.equipment.length > 0 ? (
                <div className="space-y-4">
                  {booking.equipment.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{item.equipment.sku}</div>
                        {item.equipment.model && (
                          <div className="text-sm text-muted-foreground">
                            {item.equipment.model}
                          </div>
                        )}
                        {item.equipment.category && (
                          <div className="text-sm text-muted-foreground">
                            {item.equipment.category.name}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline">الكمية: {item.quantity}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">لا توجد معدات</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>الدفعات</CardTitle>
            </CardHeader>
            <CardContent>
              {booking.payments && booking.payments.length > 0 ? (
                <div className="space-y-4">
                  {booking.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{formatAmount(payment.amount)}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(payment.createdAt)}
                        </div>
                      </div>
                      <Badge>{payment.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">لا توجد دفعات</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contracts Tab */}
        <TabsContent value="contracts">
          <Card>
            <CardHeader>
              <CardTitle>العقود</CardTitle>
            </CardHeader>
            <CardContent>
              {booking.contracts && booking.contracts.length > 0 ? (
                <div className="space-y-4">
                  {booking.contracts.map((contract) => (
                    <div
                      key={contract.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">عقد #{contract.id.slice(0, 8)}</div>
                        <div className="text-sm text-muted-foreground">{contract.status}</div>
                      </div>
                      <Button variant="outline" size="sm">
                        عرض
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">لا توجد عقود</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Damage Claims Tab */}
        <TabsContent value="damage">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  مطالبات الأضرار
                </CardTitle>
                <CardDescription>الإبلاغ عن أضرار للمعدات أو الاستوديو ومراجعتها</CardDescription>
              </div>
              <Button asChild>
                <Link href={`/admin/damage-claims/new?bookingId=${booking.id}`}>
                  إبلاغ عن ضرر
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {damageClaims.length > 0 ? (
                <div className="space-y-4">
                  {damageClaims.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{c.damageType.replace(/_/g, ' ')}</div>
                        <div className="text-sm text-muted-foreground">
                          {c.severity} • تقدير: {formatAmount(c.estimatedCost)} ر.س
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge>{c.status}</Badge>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/damage-claims/${c.id}`}>عرض</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">لا توجد مطالبات أضرار. انقر &quot;إبلاغ عن ضرر&quot; للإضافة.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>الجدول الزمني</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">تاريخ البداية</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(booking.startDate)}
                    </div>
                  </div>
                  <Badge variant="outline">بداية</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">تاريخ النهاية</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(booking.endDate)}
                    </div>
                  </div>
                  <Badge variant="outline">نهاية</Badge>
                </div>
                {booking.studioId && (
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">استوديو</div>
                      <div className="text-sm text-muted-foreground">
                        {booking.studio?.name || 'استوديو'}
                      </div>
                    </div>
                    <Badge variant="outline">استوديو</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivery Tab */}
        <TabsContent value="delivery">
          <Card>
            <CardHeader>
              <CardTitle>التوصيل</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {booking.delivery_required
                  ? 'التوصيل مطلوب - سيتم إضافة تفاصيل التوصيل قريباً'
                  : 'التوصيل غير مطلوب'}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Returns Tab */}
        <TabsContent value="returns">
          <Card>
            <CardHeader>
              <CardTitle>الإرجاع</CardTitle>
            </CardHeader>
            <CardContent>
              {booking.status === 'RETURNED' || booking.status === 'CLOSED' ? (
                <div className="space-y-2">
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium">تاريخ الإرجاع</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(booking.endDate)}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    تم إرجاع المعدات - في انتظار الفحص النهائي
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  لم يتم إرجاع المعدات بعد
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>الملاحظات</CardTitle>
            </CardHeader>
            <CardContent>
              {booking.notes ? (
                <div className="p-4 border rounded-lg">
                  <p className="whitespace-pre-wrap">{booking.notes}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">لا توجد ملاحظات</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>سجل التغييرات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="p-3 border rounded-lg">
                  <div className="font-medium">تم الإنشاء</div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(booking.createdAt)}
                  </div>
                </div>
                {booking.updatedAt && booking.updatedAt !== booking.createdAt && (
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium">آخر تحديث</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(booking.updatedAt)}
                    </div>
                  </div>
                )}
                <p className="text-sm text-muted-foreground mt-4">
                  سجل التغييرات التفصيلي سيتم إضافته قريباً
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
