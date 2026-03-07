/**
 * @file page.tsx
 * @description Booking detail page with state machine UI
 * @module app/admin/(routes)/bookings/[id]
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight,
  Calendar,
  DollarSign,
  User,
  Package,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
} from 'lucide-react'
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
import { Loader2 } from 'lucide-react'

function ContractSection({
  bookingId,
  contracts,
  onGenerated,
}: {
  bookingId: string
  contracts: Array<{ id: string; status: string }>
  onGenerated: () => void
}) {
  const [generating, setGenerating] = useState(false)
  const { toast } = useToast()

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل إنشاء العقد')
      toast({ title: 'تم', description: 'تم إنشاء العقد بنجاح' })
      onGenerated()
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل إنشاء العقد',
        variant: 'destructive',
      })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>العقود</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {contracts.length > 0 ? (
          <div className="space-y-4">
            {contracts.map((contract) => (
              <div
                key={contract.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <div className="font-medium">عقد #{contract.id.slice(0, 8)}</div>
                  <Badge
                    variant={contract.status === 'SIGNED' ? 'default' : 'secondary'}
                    className="mt-1"
                  >
                    {contract.status === 'SIGNED'
                      ? 'موقع'
                      : contract.status === 'PENDING_SIGNATURE'
                        ? 'في انتظار التوقيع'
                        : contract.status}
                  </Badge>
                </div>
                <Button size="sm" asChild>
                  <a
                    href={`/api/contracts/${contract.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FileText className="ms-1 h-4 w-4" />
                    تحميل عقد PDF
                  </a>
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">لا توجد عقود لهذا الحجز.</p>
        )}
        <Button type="button" variant="outline" onClick={handleGenerate} disabled={generating}>
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'إنشاء عقد'}
        </Button>
      </CardContent>
    </Card>
  )
}

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
  const [damageClaims, setDamageClaims] = useState<
    Array<{
      id: string
      status: string
      damageType: string
      severity: string
      estimatedCost: string
    }>
  >([])
  const [auditLogs, setAuditLogs] = useState<
    Array<{ id: string; action: string; description: string | null; createdAt: string }>
  >([])

  const loadBooking = useCallback(async () => {
    const id = params?.id
    if (!id) return
    setLoading(true)
    try {
      const response = await fetch(`/api/bookings/${id}`)
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
  }, [params?.id, toast])

  useEffect(() => {
    loadBooking()
  }, [loadBooking])

  useEffect(() => {
    if (booking?.id) {
      fetch(`/api/bookings/${booking.id}/damage-claims`)
        .then((r) => (r.ok ? r.json() : { claims: [] }))
        .then((d) => setDamageClaims(d.claims ?? []))
        .catch(() => setDamageClaims([]))
      fetch(`/api/audit-logs?resourceType=Booking&resourceId=${booking.id}&limit=30`)
        .then((r) => (r.ok ? r.json() : { logs: [] }))
        .then((d) => setAuditLogs(d.logs ?? d.data ?? []))
        .catch(() => setAuditLogs([]))
    }
  }, [booking?.id])

  const handleStateTransition = async (toState: BookingState) => {
    if (!booking) return

    setTransitioning(true)
    try {
      const response = await fetch(`/api/bookings/${params?.id}/transition`, {
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

  const isLateReturn =
    booking && booking.status === 'ACTIVE' && new Date(booking.endDate) < new Date()

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
      <div className="py-12 text-center">
        <p className="text-muted-foreground">الحجز غير موجود</p>
        <Button asChild className="mt-4">
          <Link href="/admin/bookings">العودة إلى الحجوزات</Link>
        </Button>
      </div>
    )
  }

  const PAYMENT_STATUS_LABELS: Record<
    string,
    { ar: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    PENDING: { ar: 'معلق', variant: 'secondary' },
    COMPLETED: { ar: 'مكتمل', variant: 'default' },
    FAILED: { ar: 'فشل', variant: 'destructive' },
    REFUNDED: { ar: 'مسترد', variant: 'outline' },
    PARTIAL: { ar: 'جزئي', variant: 'secondary' },
  }

  return (
    <div className="space-y-6" dir="rtl">
      {isLateReturn && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="font-medium text-red-800">تأخر في الإرجاع</p>
            <p className="text-sm text-red-700">
              كان المفترض إرجاع المعدات في {formatDate(booking.endDate)} — الحجز لا يزال نشطاً
            </p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">حجز #{booking.bookingNumber}</h1>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/bookings">
            <ArrowRight className="ms-2 h-4 w-4" />
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                  تفصيل المبالغ
                </CardTitle>
                <CardDescription>ملخص الأسعار والضريبة والعهدة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">الإجمالي الفرعي</span>
                  <span>
                    {formatAmount(
                      Number(booking.totalAmount ?? 0) - Number(booking.vatAmount ?? 0)
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ضريبة القيمة المضافة</span>
                  <span>{formatAmount(booking.vatAmount)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-medium">
                  <span>الإجمالي النهائي</span>
                  <span className="text-lg">{formatAmount(booking.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">العهدة (مبلغ محجوز)</span>
                  <span>{formatAmount(booking.depositAmount)}</span>
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
                      className="flex items-center justify-between rounded-lg border p-4"
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
                <div className="space-y-3">
                  {/* Payment summary */}
                  <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3 md:grid-cols-4">
                    <div>
                      <p className="text-xs text-muted-foreground">الإجمالي</p>
                      <p className="font-semibold">{formatAmount(booking.totalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">ضريبة القيمة المضافة</p>
                      <p className="font-semibold">{formatAmount(booking.vatAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">عدد الدفعات</p>
                      <p className="font-semibold">{booking.payments.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">المجموع المدفوع</p>
                      <p className="font-semibold text-green-700">
                        {formatAmount(
                          booking.payments
                            .filter((p) => p.status === 'COMPLETED')
                            .reduce((s, p) => s + Number(p.amount), 0)
                        )}
                      </p>
                    </div>
                  </div>
                  {booking.payments.map((payment) => {
                    const statusInfo = PAYMENT_STATUS_LABELS[payment.status] ?? {
                      ar: payment.status,
                      variant: 'secondary' as const,
                    }
                    return (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex items-center gap-3">
                          {payment.status === 'COMPLETED' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : payment.status === 'FAILED' ? (
                            <XCircle className="h-5 w-5 text-red-500" />
                          ) : (
                            <Clock className="h-5 w-5 text-amber-500" />
                          )}
                          <div>
                            <div className="font-medium">{formatAmount(payment.amount)}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(payment.createdAt)}
                            </div>
                          </div>
                        </div>
                        <Badge variant={statusInfo.variant}>{statusInfo.ar}</Badge>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground">لا توجد دفعات</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contracts Tab */}
        <TabsContent value="contracts">
          <ContractSection
            bookingId={booking.id}
            contracts={booking.contracts ?? []}
            onGenerated={loadBooking}
          />
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
                <Link href={`/admin/damage-claims/new?bookingId=${booking.id}`}>إبلاغ عن ضرر</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {damageClaims.length > 0 ? (
                <div className="space-y-4">
                  {damageClaims.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-lg border p-4"
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
                <p className="text-muted-foreground">
                  لا توجد مطالبات أضرار. انقر &quot;إبلاغ عن ضرر&quot; للإضافة.
                </p>
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
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-medium">تاريخ البداية</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(booking.startDate)}
                    </div>
                  </div>
                  <Badge variant="outline">بداية</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-medium">تاريخ النهاية</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(booking.endDate)}
                    </div>
                  </div>
                  <Badge variant="outline">نهاية</Badge>
                </div>
                {booking.studioId && (
                  <div className="flex items-center justify-between rounded-lg border p-3">
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
              <CardDescription>
                {booking.delivery_required
                  ? 'هذا الحجز يتطلب توصيلاً'
                  : 'التوصيل غير مطلوب لهذا الحجز'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                {booking.delivery_required
                  ? 'تم طلب التوصيل. يمكنك إدارة المواعيد وتعيين السائق من جدول التوصيل.'
                  : 'التوصيل غير مطلوب'}
              </p>
              {booking.delivery_required && (
                <Button variant="outline" asChild>
                  <Link href="/admin/ops/delivery/schedule">فتح جدول التوصيل</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Returns Tab */}
        <TabsContent value="returns">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                الإرجاع
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <p className="text-sm text-muted-foreground">تاريخ الإرجاع المخطط</p>
                  <p className="font-medium">{formatDate(booking.endDate)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-sm text-muted-foreground">حالة الإرجاع</p>
                  <div className="mt-1">
                    {booking.status === 'RETURNED' || booking.status === 'CLOSED' ? (
                      <Badge className="bg-green-100 text-green-800">تم الإرجاع</Badge>
                    ) : isLateReturn ? (
                      <Badge variant="destructive">تأخر في الإرجاع</Badge>
                    ) : (
                      <Badge variant="secondary">لم يُرجع بعد</Badge>
                    )}
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-sm text-muted-foreground">عدد المعدات</p>
                  <p className="font-medium">{booking.equipment?.length ?? 0} عنصر</p>
                </div>
              </div>
              {isLateReturn && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-sm font-medium text-red-800">تجاوز تاريخ الإرجاع</p>
                  <p className="mt-1 text-xs text-red-700">
                    الحجز لا يزال نشطاً بعد {formatDate(booking.endDate)}. قد تنطبق رسوم تأخير.
                  </p>
                </div>
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
                <div className="rounded-lg border p-4">
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
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                سجل التغييرات
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Always show creation + last update */}
              <div className="relative space-y-0">
                {[
                  { label: 'تم الإنشاء', date: booking.createdAt },
                  ...(booking.updatedAt && booking.updatedAt !== booking.createdAt
                    ? [{ label: 'آخر تحديث', date: booking.updatedAt }]
                    : []),
                  ...auditLogs.map((l) => ({
                    label: l.action,
                    date: l.createdAt,
                    description: l.description,
                  })),
                ].map((entry, i) => (
                  <div key={i} className="flex gap-3 pb-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <Clock className="h-4 w-4 text-primary" />
                      </div>
                      <div className="mt-1 w-px flex-1 bg-border" />
                    </div>
                    <div className="min-w-0 flex-1 pb-2">
                      <p className="font-medium">{entry.label}</p>
                      {'description' in entry && entry.description && (
                        <p className="text-sm text-muted-foreground">{entry.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{formatDate(entry.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
