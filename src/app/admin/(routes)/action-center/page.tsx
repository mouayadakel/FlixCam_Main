/**
 * @file action-center/page.tsx
 * @description Action Center - Central hub for pending actions, alerts, and tasks
 * @module app/admin/(routes)/action-center
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Bell, 
  Calendar,
  Package,
  DollarSign,
  Users,
  ArrowRight,
  RefreshCw,
  Filter
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatCurrency } from '@/lib/utils/format.utils'

interface ActionItem {
  id: string
  type: 'booking' | 'payment' | 'equipment' | 'client' | 'system'
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  actionUrl: string
  actionLabel: string
  createdAt: string
  dueDate?: string
  metadata?: Record<string, any>
}

interface ActionStats {
  critical: number
  high: number
  medium: number
  low: number
  total: number
}

const PRIORITY_CONFIG = {
  critical: { 
    label: 'حرج', 
    color: 'bg-red-500', 
    textColor: 'text-red-600',
    bgLight: 'bg-red-50',
    icon: AlertTriangle 
  },
  high: { 
    label: 'عالي', 
    color: 'bg-orange-500', 
    textColor: 'text-orange-600',
    bgLight: 'bg-orange-50',
    icon: Clock 
  },
  medium: { 
    label: 'متوسط', 
    color: 'bg-yellow-500', 
    textColor: 'text-yellow-600',
    bgLight: 'bg-yellow-50',
    icon: Bell 
  },
  low: { 
    label: 'منخفض', 
    color: 'bg-blue-500', 
    textColor: 'text-blue-600',
    bgLight: 'bg-blue-50',
    icon: CheckCircle2 
  },
}

const TYPE_CONFIG = {
  booking: { label: 'حجز', icon: Calendar, color: 'text-blue-600' },
  payment: { label: 'دفع', icon: DollarSign, color: 'text-green-600' },
  equipment: { label: 'معدات', icon: Package, color: 'text-purple-600' },
  client: { label: 'عميل', icon: Users, color: 'text-orange-600' },
  system: { label: 'نظام', icon: Bell, color: 'text-gray-600' },
}

export default function ActionCenterPage() {
  const { toast } = useToast()
  const [actions, setActions] = useState<ActionItem[]>([])
  const [stats, setStats] = useState<ActionStats>({ critical: 0, high: 0, medium: 0, low: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [refreshing, setRefreshing] = useState(false)
  const [isLoadingRef, setIsLoadingRef] = useState(false)

  useEffect(() => {
    if (!isLoadingRef) {
      setIsLoadingRef(true)
      loadActions()
    }
  }, [])

  const loadActions = async () => {
    setLoading(true)
    try {
      // Fetch pending actions from multiple sources
      const [bookingsRes, paymentsRes] = await Promise.all([
        fetch('/api/bookings?status=RISK_CHECK&limit=20').catch(() => null),
        fetch('/api/payments?status=PENDING&limit=20').catch(() => null),
      ])

      const pendingActions: ActionItem[] = []

      // Process pending risk check bookings
      if (bookingsRes?.ok) {
        const bookingsData = await bookingsRes.json()
        const bookings = bookingsData?.data ?? []
        bookings.forEach((booking: any) => {
          pendingActions.push({
            id: `booking-${booking.id}`,
            type: 'booking',
            priority: 'high',
            title: `حجز يحتاج مراجعة المخاطر`,
            description: `الحجز #${booking.bookingNumber} - ${booking.customer?.name || booking.customer?.email || 'عميل'}`,
            actionUrl: `/admin/bookings/${booking.id}`,
            actionLabel: 'مراجعة',
            createdAt: booking.createdAt,
            metadata: { bookingNumber: booking.bookingNumber, customerId: booking.customerId }
          })
        })
      }

      // Process pending payments
      if (paymentsRes?.ok) {
        const paymentsData = await paymentsRes.json()
        const payments = paymentsData?.data ?? []
        payments.forEach((payment: any) => {
          pendingActions.push({
            id: `payment-${payment.id}`,
            type: 'payment',
            priority: 'medium',
            title: `دفعة معلقة`,
            description: `${formatCurrency(payment.amount)} - ${payment.booking?.bookingNumber || 'غير مرتبط'}`,
            actionUrl: `/admin/payments/${payment.id}`,
            actionLabel: 'معالجة',
            createdAt: payment.createdAt,
            dueDate: payment.dueDate,
            metadata: { amount: payment.amount }
          })
        })
      }

      // Add sample system actions for demo (these would come from a real notifications/tasks API)
      const sampleSystemActions: ActionItem[] = [
        {
          id: 'system-1',
          type: 'equipment',
          priority: 'critical',
          title: 'معدات تحتاج صيانة عاجلة',
          description: '3 معدات في حالة صيانة تحتاج اهتمام',
          actionUrl: '/admin/inventory/equipment?condition=MAINTENANCE',
          actionLabel: 'عرض',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'system-2',
          type: 'booking',
          priority: 'high',
          title: 'حجوزات تبدأ اليوم',
          description: 'يوجد حجوزات مجدولة للبدء اليوم',
          actionUrl: '/admin/calendar',
          actionLabel: 'عرض',
          createdAt: new Date().toISOString(),
        },
      ]

      const allActions = [...pendingActions, ...sampleSystemActions]
      
      // Calculate stats
      const newStats: ActionStats = {
        critical: allActions.filter(a => a.priority === 'critical').length,
        high: allActions.filter(a => a.priority === 'high').length,
        medium: allActions.filter(a => a.priority === 'medium').length,
        low: allActions.filter(a => a.priority === 'low').length,
        total: allActions.length,
      }

      setActions(allActions)
      setStats(newStats)
    } catch (error) {
      console.error('Failed to load actions:', error)
      toast({
        title: 'خطأ',
        description: 'فشل تحميل الإجراءات المعلقة',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadActions()
    setRefreshing(false)
    toast({
      title: 'تم التحديث',
      description: 'تم تحديث قائمة الإجراءات',
    })
  }

  const handleDismiss = (actionId: string) => {
    setActions(prev => prev.filter(a => a.id !== actionId))
    toast({
      title: 'تم',
      description: 'تم إخفاء الإجراء',
    })
  }

  const filteredActions = activeTab === 'all' 
    ? actions 
    : actions.filter(a => a.priority === activeTab)

  const sortedActions = [...filteredActions].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">مركز الإجراءات</h1>
          <p className="text-muted-foreground mt-1">
            إدارة جميع الإجراءات والتنبيهات المعلقة
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 ml-2 ${refreshing ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">حرج</p>
                <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">عالي</p>
                <p className="text-2xl font-bold text-orange-600">{stats.high}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">متوسط</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.medium}</p>
              </div>
              <Bell className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">منخفض</p>
                <p className="text-2xl font-bold text-blue-600">{stats.low}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-gray-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">الإجمالي</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Filter className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions List */}
      <Card>
        <CardHeader>
          <CardTitle>الإجراءات المعلقة</CardTitle>
          <CardDescription>
            قائمة بجميع الإجراءات التي تحتاج انتباهك
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">الكل ({stats.total})</TabsTrigger>
              <TabsTrigger value="critical">حرج ({stats.critical})</TabsTrigger>
              <TabsTrigger value="high">عالي ({stats.high})</TabsTrigger>
              <TabsTrigger value="medium">متوسط ({stats.medium})</TabsTrigger>
              <TabsTrigger value="low">منخفض ({stats.low})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : sortedActions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="text-lg font-medium">لا توجد إجراءات معلقة</p>
                  <p className="text-sm">جميع الأمور تحت السيطرة!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedActions.map((action) => {
                    const priorityConfig = PRIORITY_CONFIG[action.priority]
                    const typeConfig = TYPE_CONFIG[action.type]
                    const TypeIcon = typeConfig.icon
                    
                    return (
                      <div
                        key={action.id}
                        className={`p-4 rounded-lg border ${priorityConfig.bgLight} flex items-center justify-between gap-4`}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`p-2 rounded-full ${priorityConfig.color} bg-opacity-20`}>
                            <TypeIcon className={`h-5 w-5 ${typeConfig.color}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{action.title}</h4>
                              <Badge variant="outline" className={priorityConfig.textColor}>
                                {priorityConfig.label}
                              </Badge>
                              <Badge variant="secondary">
                                {typeConfig.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{action.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(action.createdAt)}
                              {action.dueDate && ` • مستحق: ${formatDate(action.dueDate)}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDismiss(action.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                          <Link href={action.actionUrl}>
                            <Button size="sm">
                              {action.actionLabel}
                              <ArrowRight className="h-4 w-4 mr-2" />
                            </Button>
                          </Link>
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
