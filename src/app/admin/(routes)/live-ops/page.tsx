/**
 * @file live-ops/page.tsx
 * @description Live Operations Dashboard - Real-time monitoring of active bookings and operations
 * @module app/admin/(routes)/live-ops
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { 
  Activity, 
  Clock, 
  MapPin, 
  Phone,
  Calendar,
  Package,
  Truck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  User,
  Timer
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatCurrency } from '@/lib/utils/format.utils'

interface ActiveBooking {
  id: string
  bookingNumber: string
  status: string
  customer: {
    id: string
    name: string
    phone?: string
  }
  startDate: string
  endDate: string
  equipmentCount: number
  totalAmount: number
  progress: number // 0-100 percentage of rental period completed
  daysRemaining: number
  isOverdue: boolean
}

interface OperationStats {
  activeBookings: number
  pickupsToday: number
  returnsToday: number
  overdueReturns: number
  equipmentOut: number
  totalEquipment: number
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  ACTIVE: { label: 'نشط', color: 'text-green-600', bgColor: 'bg-green-100' },
  CONFIRMED: { label: 'مؤكد', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  RETURNED: { label: 'مرتجع', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  OVERDUE: { label: 'متأخر', color: 'text-red-600', bgColor: 'bg-red-100' },
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

  const loadData = useCallback(async () => {
    try {
      // Fetch active bookings
      const [activeRes, confirmedRes, equipmentRes] = await Promise.all([
        fetch('/api/bookings?status=ACTIVE&limit=50').catch(() => null),
        fetch('/api/bookings?status=CONFIRMED&limit=50').catch(() => null),
        fetch('/api/equipment?isActive=true&limit=1').catch(() => null),
      ])

      const bookings: ActiveBooking[] = []
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      // Process active bookings
      if (activeRes?.ok) {
        const data = await activeRes.json()
        const activeData = data.data || []
        
        activeData.forEach((booking: any) => {
          const startDate = new Date(booking.startDate)
          const endDate = new Date(booking.endDate)
          const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
          const daysElapsed = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
          const progress = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100))
          const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
          const isOverdue = endDate < now

          bookings.push({
            id: booking.id,
            bookingNumber: booking.bookingNumber,
            status: isOverdue ? 'OVERDUE' : 'ACTIVE',
            customer: {
              id: booking.customerId,
              name: booking.customer?.name || booking.customer?.email || 'عميل',
              phone: booking.customer?.phone,
            },
            startDate: booking.startDate,
            endDate: booking.endDate,
            equipmentCount: booking.equipment?.length || 0,
            totalAmount: Number(booking.totalAmount),
            progress,
            daysRemaining,
            isOverdue,
          })
        })
      }

      // Process confirmed bookings (pickups today)
      let pickupsToday = 0
      if (confirmedRes?.ok) {
        const data = await confirmedRes.json()
        const confirmedData = data.data || []
        
        confirmedData.forEach((booking: any) => {
          const startDate = new Date(booking.startDate)
          const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
          
          if (startDay.getTime() === today.getTime()) {
            pickupsToday++
            bookings.push({
              id: booking.id,
              bookingNumber: booking.bookingNumber,
              status: 'CONFIRMED',
              customer: {
                id: booking.customerId,
                name: booking.customer?.name || booking.customer?.email || 'عميل',
                phone: booking.customer?.phone,
              },
              startDate: booking.startDate,
              endDate: booking.endDate,
              equipmentCount: booking.equipment?.length || 0,
              totalAmount: Number(booking.totalAmount),
              progress: 0,
              daysRemaining: Math.ceil((new Date(booking.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
              isOverdue: false,
            })
          }
        })
      }

      // Calculate returns today
      const returnsToday = bookings.filter(b => {
        const endDate = new Date(b.endDate)
        const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
        return endDay.getTime() === today.getTime()
      }).length

      // Calculate overdue
      const overdueReturns = bookings.filter(b => b.isOverdue).length

      // Equipment stats
      let totalEquipment = 0
      if (equipmentRes?.ok) {
        const eqData = await equipmentRes.json()
        totalEquipment = eqData.total || 0
      }

      const equipmentOut = bookings.reduce((sum, b) => sum + b.equipmentCount, 0)

      setActiveBookings(bookings)
      setStats({
        activeBookings: bookings.filter(b => b.status === 'ACTIVE' || b.status === 'OVERDUE').length,
        pickupsToday,
        returnsToday,
        overdueReturns,
        equipmentOut,
        totalEquipment,
      })
      setLastRefresh(new Date())
    } catch (error) {
      console.error('Failed to load live ops data:', error)
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
    setLoading(true)
    await loadData()
    toast({
      title: 'تم التحديث',
      description: 'تم تحديث البيانات',
    })
  }

  const filteredBookings = activeTab === 'all' 
    ? activeBookings 
    : activeBookings.filter(b => b.status === activeTab)

  const utilizationRate = stats.totalEquipment > 0 
    ? Math.round((stats.equipmentOut / stats.totalEquipment) * 100) 
    : 0

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8 text-green-500" />
            العمليات الحية
          </h1>
          <p className="text-muted-foreground mt-1">
            مراقبة العمليات النشطة في الوقت الفعلي
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            آخر تحديث: {lastRefresh.toLocaleTimeString('ar-SA')}
          </div>
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Timer className="h-4 w-4 ml-1" />
            {autoRefresh ? 'تحديث تلقائي' : 'تحديث يدوي'}
          </Button>
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">حجوزات نشطة</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeBookings}</p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">استلام اليوم</p>
                <p className="text-2xl font-bold text-blue-600">{stats.pickupsToday}</p>
              </div>
              <Truck className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إرجاع اليوم</p>
                <p className="text-2xl font-bold text-purple-600">{stats.returnsToday}</p>
              </div>
              <Package className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">متأخر</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdueReturns}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">معدات خارجة</p>
                <p className="text-2xl font-bold text-orange-600">{stats.equipmentOut}</p>
              </div>
              <Package className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-gray-500">
          <CardContent className="pt-4">
            <div>
              <p className="text-sm text-muted-foreground">نسبة الإشغال</p>
              <p className="text-2xl font-bold">{utilizationRate}%</p>
              <Progress value={utilizationRate} className="mt-2 h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>الحجوزات النشطة</CardTitle>
          <CardDescription>
            جميع الحجوزات الجارية حالياً
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">الكل ({activeBookings.length})</TabsTrigger>
              <TabsTrigger value="ACTIVE">نشط ({activeBookings.filter(b => b.status === 'ACTIVE').length})</TabsTrigger>
              <TabsTrigger value="CONFIRMED">استلام اليوم ({activeBookings.filter(b => b.status === 'CONFIRMED').length})</TabsTrigger>
              <TabsTrigger value="OVERDUE">متأخر ({activeBookings.filter(b => b.status === 'OVERDUE').length})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : filteredBookings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="text-lg font-medium">لا توجد حجوزات في هذه الفئة</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredBookings.map((booking) => {
                    const statusConfig = STATUS_CONFIG[booking.status] || STATUS_CONFIG.ACTIVE
                    
                    return (
                      <div
                        key={booking.id}
                        className={`p-4 rounded-lg border ${booking.isOverdue ? 'border-red-300 bg-red-50' : 'bg-white'}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-mono font-bold">{booking.bookingNumber}</span>
                              <Badge className={`${statusConfig.bgColor} ${statusConfig.color}`}>
                                {statusConfig.label}
                              </Badge>
                              {booking.isOverdue && (
                                <Badge variant="destructive">
                                  <AlertTriangle className="h-3 w-3 ml-1" />
                                  متأخر
                                </Badge>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span>{booking.customer.name}</span>
                              </div>
                              {booking.customer.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <span dir="ltr">{booking.customer.phone}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>{formatDate(booking.startDate)} - {formatDate(booking.endDate)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-muted-foreground" />
                                <span>{booking.equipmentCount} معدات</span>
                              </div>
                            </div>

                            {booking.status === 'ACTIVE' && (
                              <div className="mt-3">
                                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                  <span>تقدم الإيجار</span>
                                  <span>{booking.daysRemaining} يوم متبقي</span>
                                </div>
                                <Progress 
                                  value={booking.progress} 
                                  className={`h-2 ${booking.isOverdue ? 'bg-red-200' : ''}`}
                                />
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <span className="font-bold text-lg">{formatCurrency(booking.totalAmount)}</span>
                            <Link href={`/admin/bookings/${booking.id}`}>
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4 ml-1" />
                                عرض
                              </Button>
                            </Link>
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
  )
}
