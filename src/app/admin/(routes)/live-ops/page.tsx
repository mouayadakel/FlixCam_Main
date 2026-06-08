/**
 * @file page.tsx
 * @description Premium Live Operations Command Center – real-time risk scoring, dynamic surge pricing controls, ID verifications, and WhatsApp logs
 * @module app/admin/(routes)/live-ops
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Activity,
  Phone,
  Calendar,
  Package,
  Truck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  User,
  Timer,
  ShieldAlert,
  UserCheck,
  Coins,
  TrendingUp,
  Fingerprint
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatCurrency } from '@/lib/utils/format.utils'
import { EMBED_LTR } from '@/lib/i18n/bidi'
import { AdminBookingStatusChip } from '@/components/shared/admin-booking-status-chip'

interface ActiveBooking {
  id: string
  bookingNumber: string
  status: string
  customer: {
    id: string
    name: string
    phone?: string
    isIdVerified: boolean
    hasSignedPromissory: boolean
  }
  startDate: string
  endDate: string
  equipmentCount: number
  totalAmount: number
  progress: number // 0-100 percentage of rental period completed
  daysRemaining: number
  isOverdue: boolean
  riskScore: 'LOW' | 'MEDIUM' | 'HIGH'
  riskReason?: string
}

interface OperationStats {
  activeBookings: number
  pickupsToday: number
  returnsToday: number
  overdueReturns: number
  equipmentOut: number
  totalEquipment: number
}

export default function LiveOpsPage() {
  const { toast } = useToast()
  const [activeBookings, setActiveBookings] = useState<ActiveBooking[]>([])
  const [stats, setStats] = useState<OperationStats>({
    activeBookings: 0,
    pickupsToday: 0,
    returnsToday: 0,
    overdueReturns: 0,
    equipmentOut: 0,
    totalEquipment: 0,
  })
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [activeTab, setActiveTab] = useState('all')

  // Dynamic pricing surge multiplier state
  const [surgeMultiplier, setSurgeMultiplier] = useState<number>(1.0)

  // Verification Split-screen audit detail
  const [selectedVerification, setSelectedVerification] = useState<ActiveBooking | null>(null)

  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/live-ops', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = await response.json()
      setActiveBookings(Array.isArray(data.activeBookings) ? data.activeBookings : [])
      if (data.stats) {
        setStats(data.stats)
      }
      setLastRefresh(new Date())
    } catch (err) {
      console.error('Failed to load live operations data:', err)
      setError('تعذّر تحميل بيانات العمليات. يرجى المحاولة مرة أخرى.')
      setActiveBookings([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [autoRefresh, loadData])

  const handleRefresh = async () => {
    await loadData()
    toast({
      title: 'تحديث فوري للعمليات 📡',
      description: 'تم مزامنة لوحة التحكم مع آخر الحجوزات ونسب الإشغال.',
    })
  }

  // Adjust Demand Pricing surge multiplier
  const changeSurgePricing = (multiplier: number) => {
    setSurgeMultiplier(multiplier)
    toast({
      title: 'تحديث تسعير الذروة! ⚡',
      description: `تم تعيين مضاعف سعر الطلب الديناميكي بنجاح إلى ${multiplier}x.`,
    })
  }

  // Approve ID & promissory verification override
  const approveVerification = async (bookingId: string) => {
    try {
      const res = await fetch('/api/admin/live-ops/actions/verify-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error || `HTTP ${res.status}`)
      }
      setActiveBookings(prev => prev.map(b => {
        if (b.id === bookingId) {
          return {
            ...b,
            riskScore: 'LOW',
            customer: {
              ...b.customer,
              isIdVerified: true,
              hasSignedPromissory: true
            }
          }
        }
        return b
      }))
      setSelectedVerification(null)
      toast({
        title: 'تم اعتماد العميل وتجاوز الخطر! 🛡️',
        description: 'تم ترقية حالة التوثيق بنجاح وخفض التقييم الأمني للحجز.',
      })
    } catch (err) {
      toast({
        title: 'خطأ',
        description: err instanceof Error ? err.message : 'فشل اعتماد التوثيق',
        variant: 'destructive',
      })
    }
  }

  // Dispatch manual WhatsApp clearance alert
  const dispatchWhatsAppReminder = async (booking: ActiveBooking) => {
    try {
      const res = await fetch('/api/admin/live-ops/actions/whatsapp-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error || `HTTP ${res.status}`)
      }
      toast({
        title: 'تم إرسال تذكير التوثيق! 💬',
        description: `تم إرسال تنبيه واتساب ثنائي اللغة للمطالبة بالهوية الوطنية للعميل ${booking.customer.name}.`,
      })
    } catch (err) {
      toast({
        title: 'خطأ',
        description: err instanceof Error ? err.message : 'فشل إرسال التذكير',
        variant: 'destructive',
      })
    }
  }

  const filteredBookings =
    activeTab === 'all' ? activeBookings : activeBookings.filter((b) => b.status === activeTab)

  const utilizationRate =
    stats.totalEquipment > 0 ? Math.round((stats.equipmentOut / stats.totalEquipment) * 100) : 0

  return (
    <div className="space-y-6 select-none" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-slate-900/5 dark:bg-slate-900/40 p-4 rounded-xl border">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-black text-slate-800 dark:text-slate-100">
            <Activity className="h-8 w-8 text-green-500 animate-pulse" />
            مركز إدارة المخاطر وتعديل تسعير الذروة
          </h1>
          <p className="mt-1 text-sm text-slate-500">تقييم سلامة الحجوزات النشطة وتعديل مضاعفات الأسعار ديناميكياً.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="font-bold"
          >
            <Timer className="ms-1.5 h-4 w-4" />
            {autoRefresh ? 'تحديث تلقائي' : 'تحديث يدوي'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="font-bold">
            <RefreshCw className={`ms-1.5 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            مزامنة البيانات
          </Button>
        </div>
      </div>

      {/* Dynamic pricing controller & Risk score indicator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dynamic Pricing Console */}
        <Card className="border-2 border-primary/20 bg-primary/5 shadow-md">
          <CardHeader className="pb-3 border-b border-primary/10">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-primary">
              <Coins className="h-5 w-5" />
              مضاعف تسعير الذروة والطلب النشط
            </CardTitle>
            <CardDescription>تعديل فوري لأسعار الكتالوج لزيادة الأرباح</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex justify-between items-center bg-white dark:bg-slate-950 p-3 rounded-lg border">
              <span className="text-sm font-semibold">المضاعف النشط حالياً:</span>
              <Badge className="text-lg font-black bg-primary px-3 py-1 text-white">
                {surgeMultiplier.toFixed(2)}x
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              تعديل التسعير الديناميكي قريباً — استخدم قواعد التسعير من لوحة التحكم.
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={surgeMultiplier === 1.0 ? 'default' : 'outline'}
                disabled
                title="قريباً — ربط بقواعد التسعير"
                className="font-bold text-xs"
              >
                1.0x (طبيعي)
              </Button>
              <Button
                variant={surgeMultiplier === 1.15 ? 'default' : 'outline'}
                disabled
                title="قريباً — ربط بقواعد التسعير"
                className="font-bold text-xs"
              >
                1.15x (ويكيند)
              </Button>
              <Button
                variant={surgeMultiplier === 1.30 ? 'default' : 'outline'}
                disabled
                title="قريباً — ربط بقواعد التسعير"
                className="font-bold text-xs"
              >
                1.30x (موسم ذروة)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Risk Check Summary */}
        <Card className="border shadow-md">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-500" />
              تقييم أمان العمليات والعهد
            </CardTitle>
            <CardDescription>تحليلات الحجوزات معلقة التوثيق الأمني</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-slate-500">حجوزات عالية الخطورة (🚨):</span>
              <span className="font-bold text-red-600">
                {activeBookings.filter(b => b.riskScore === 'HIGH').length}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-slate-500">سندات لأمر الرقمية مفقودة:</span>
              <span className="font-bold text-amber-600">
                {activeBookings.filter(b => !b.customer.hasSignedPromissory).length}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* occupancy tracking */}
        <Card className="border shadow-md">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              أداء إشغال العهد والمعدات
            </CardTitle>
            <CardDescription>الموازنة اللوجستية للأصول المؤجرة</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold">نسبة إشغال أسطول التصوير:</span>
              <span className="font-black text-primary">{utilizationRate}%</span>
            </div>
            <Progress value={utilizationRate} className="h-2.5" />
            <span className="text-[10px] text-slate-400 font-bold block mt-1">
              مجموع {stats.equipmentOut} قطعة خارج المستودع من إجمالي {stats.totalEquipment} قطعة مسجلة.
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Active Bookings Telemetry & Risk Check Indicators */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="border shadow-lg">
          <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-primary" />
              لوحة الفحص والتحقق الأمني للحجوزات النشطة
            </CardTitle>
            <CardDescription>تقييم المخاطر والمطابقة الفورية للمستندات والتوثيقات</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="all" className="font-bold">الكل ({activeBookings.length})</TabsTrigger>
                <TabsTrigger value="ACTIVE" className="font-bold">
                  نشط ({activeBookings.filter((b) => b.status === 'ACTIVE').length})
                </TabsTrigger>
                <TabsTrigger value="CONFIRMED" className="font-bold">
                  استلام اليوم ({activeBookings.filter((b) => b.status === 'CONFIRMED').length})
                </TabsTrigger>
                <TabsTrigger value="OVERDUE" className="font-bold">
                  متأخر ({activeBookings.filter((b) => b.status === 'OVERDUE').length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-0">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
                  </div>
                ) : error ? (
                  <div className="py-12 text-center text-muted-foreground border border-dashed border-red-200 rounded-lg">
                    <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
                    <p className="text-lg font-medium">{error}</p>
                    <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-4 font-bold">
                      <RefreshCw className="ms-1.5 h-4 w-4" />
                      إعادة المحاولة
                    </Button>
                  </div>
                ) : filteredBookings.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground border border-dashed rounded-lg">
                    <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-500" />
                    <p className="text-lg font-medium">كل العمليات نشطة وآمنة تماماً.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredBookings.map((booking) => {

                      return (
                        <div
                          key={booking.id}
                          className={`rounded-lg border p-4 shadow-sm hover:shadow transition-shadow bg-white dark:bg-slate-950`}
                        >
                          <div className="flex flex-col lg:flex-row justify-between gap-4">
                            <div className="flex-1 space-y-3">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="font-mono font-bold text-base">{booking.bookingNumber}</span>
                                <AdminBookingStatusChip status={booking.status} />
                                
                                {/* Risk score badges */}
                                {booking.riskScore === 'HIGH' ? (
                                  <Badge className="bg-red-500/20 text-red-700 border-red-300 font-bold gap-1 animate-pulse">
                                    🚨 خطر عالٍ (High Risk)
                                  </Badge>
                                ) : booking.riskScore === 'MEDIUM' ? (
                                  <Badge className="bg-amber-500/20 text-amber-700 border-amber-300 font-bold gap-1">
                                    ⚠️ خطر متوسط
                                  </Badge>
                                ) : (
                                  <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-300 font-bold gap-1">
                                    🛡️ آمن (Secure)
                                  </Badge>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                  <User className="h-4 w-4 text-slate-400 shrink-0" />
                                  <span className="font-medium">{booking.customer.name}</span>
                                </div>
                                {booking.customer.phone && (
                                  <div className="flex items-center gap-1.5 text-slate-750 dark:text-slate-350">
                                    <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                                    <span dir={EMBED_LTR} className="font-semibold">{booking.customer.phone}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                  <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                                  <span>
                                    {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                  <Package className="h-4 w-4 text-slate-400 shrink-0" />
                                  <span>{booking.equipmentCount} قطع في العهدة</span>
                                </div>
                              </div>

                              {booking.riskReason && (
                                <p className="text-xs font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/20 p-2.5 rounded border border-rose-100 dark:border-rose-900 w-fit">
                                  سبب التقييم: {booking.riskReason}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-col sm:flex-row lg:flex-col items-end gap-3 shrink-0 lg:border-r pr-0 lg:pr-6 justify-center">
                              <span className="text-xl font-black text-slate-800 dark:text-slate-200">
                                {formatCurrency(booking.totalAmount)}
                              </span>
                              <div className="flex gap-2 w-full justify-end">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => setSelectedVerification(booking)}
                                  className="font-bold gap-1.5"
                                >
                                  <UserCheck className="h-4 w-4 text-primary" />
                                  التوثيق والمطابقة
                                </Button>
                                <Button 
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => dispatchWhatsAppReminder(booking)}
                                  className="font-bold text-slate-650"
                                >
                                  واتساب
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Selected Verification Override Modal Popover */}
      {selectedVerification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-150 border-2 border-primary/20">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b p-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-black text-primary flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  اعتماد العميل والمستندات أمنياً
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedVerification(null)}
                  className="h-8 w-8 p-0"
                >
                  ✕
                </Button>
              </div>
              <CardDescription className="text-xs">تجاوز قيود الدقة للمستندات والعهد الرقمية</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-sm">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-bold block">العميل المطلوب توثيقه</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-base">{selectedVerification.customer.name}</span>
                <span className="text-xs text-slate-500 block">رقم الحجز المفحوص: {selectedVerification.bookingNumber}</span>
              </div>

              {/* Document status checkpoints */}
              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between items-center p-2 rounded bg-slate-50 dark:bg-slate-900/50">
                  <span className="text-xs font-bold text-slate-650">بطاقة الهوية / الإقامة:</span>
                  <Badge variant={selectedVerification.customer.isIdVerified ? 'default' : 'destructive'} className="font-bold text-[10px]">
                    {selectedVerification.customer.isIdVerified ? 'مرتجع / متوفرة' : 'مفقودة / مرفوضة'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-slate-50 dark:bg-slate-900/50">
                  <span className="text-xs font-bold text-slate-650">سند لأمر الرقمي المعتمد:</span>
                  <Badge variant={selectedVerification.customer.hasSignedPromissory ? 'default' : 'destructive'} className="font-bold text-[10px]">
                    {selectedVerification.customer.hasSignedPromissory ? 'موقع الكترونياً' : 'لم يتم التوقيع'}
                  </Badge>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  className="flex-1 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => approveVerification(selectedVerification.id)}
                >
                  اعتماد فوري (Approve & Secure)
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedVerification(null)}
                  className="font-bold"
                >
                  إغلاق
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
