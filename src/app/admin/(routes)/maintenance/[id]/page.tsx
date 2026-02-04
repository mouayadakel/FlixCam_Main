/**
 * @file maintenance/[id]/page.tsx
 * @description Maintenance request detail page
 * @module app/admin/(routes)/maintenance/[id]
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowRight, 
  Wrench, 
  Calendar,
  User,
  CheckCircle,
  Clock,
  AlertCircle,
  Package,
  FileText,
  Play,
  Pause,
  XCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils/format.utils'

interface Maintenance {
  id: string
  maintenanceNumber: string
  equipmentId: string
  type: 'preventive' | 'corrective' | 'inspection' | 'repair' | 'calibration'
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'overdue'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  scheduledDate: string
  completedDate?: string | null
  technicianId?: string | null
  description: string
  notes?: string | null
  cost?: number | null
  equipment: {
    id: string
    sku: string
    model: string | null
    serialNumber?: string | null
  }
  technician?: {
    id: string
    name: string | null
    email: string
  } | null
  createdAt: string
  updatedAt: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  scheduled: { label: 'مجدول', color: 'bg-blue-100 text-blue-800', icon: Calendar },
  in_progress: { label: 'قيد التنفيذ', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  completed: { label: 'مكتمل', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'ملغي', color: 'bg-gray-100 text-gray-800', icon: XCircle },
  overdue: { label: 'متأخر', color: 'bg-red-100 text-red-800', icon: AlertCircle },
}

const TYPE_CONFIG: Record<string, { label: string }> = {
  preventive: { label: 'وقائي' },
  corrective: { label: 'تصحيحي' },
  inspection: { label: 'فحص' },
  repair: { label: 'إصلاح' },
  calibration: { label: 'معايرة' },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: 'منخفضة', color: 'bg-gray-100 text-gray-800' },
  medium: { label: 'متوسطة', color: 'bg-blue-100 text-blue-800' },
  high: { label: 'عالية', color: 'bg-orange-100 text-orange-800' },
  urgent: { label: 'عاجل', color: 'bg-red-100 text-red-800' },
}

export default function MaintenanceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [maintenance, setMaintenance] = useState<Maintenance | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [completionNotes, setCompletionNotes] = useState('')

  useEffect(() => {
    if (params?.id) {
      loadMaintenance()
    }
  }, [params?.id])

  const loadMaintenance = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/maintenance/${params?.id}`)
      if (!response.ok) {
        throw new Error('فشل تحميل طلب الصيانة')
      }
      const data = await response.json()
      setMaintenance(data.data || data)
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحميل طلب الصيانة',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string, notes?: string) => {
    setUpdating(true)
    try {
      const body: any = { status: newStatus }
      if (notes) body.notes = notes
      if (newStatus === 'completed') body.completedDate = new Date().toISOString()

      const response = await fetch(`/api/maintenance/${params?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error('فشل تحديث الحالة')
      }

      toast({
        title: 'تم التحديث',
        description: 'تم تحديث حالة طلب الصيانة',
      })

      loadMaintenance()
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحديث الحالة',
        variant: 'destructive',
      })
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6" dir="rtl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!maintenance) {
    return (
      <div className="text-center py-12" dir="rtl">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg font-medium">طلب الصيانة غير موجود</p>
        <Button asChild className="mt-4">
          <Link href="/admin/maintenance">العودة إلى الصيانة</Link>
        </Button>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[maintenance.status] || STATUS_CONFIG.scheduled
  const StatusIcon = statusConfig.icon
  const typeConfig = TYPE_CONFIG[maintenance.type] || { label: maintenance.type }
  const priorityConfig = PRIORITY_CONFIG[maintenance.priority] || PRIORITY_CONFIG.medium

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Wrench className="h-8 w-8" />
            طلب صيانة #{maintenance.maintenanceNumber}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge className={statusConfig.color}>
              <StatusIcon className="h-3 w-3 ml-1" />
              {statusConfig.label}
            </Badge>
            <Badge className={priorityConfig.color}>{priorityConfig.label}</Badge>
            <Badge variant="outline">{typeConfig.label}</Badge>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/maintenance">
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Equipment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                معلومات المعدات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">رمز المعدات</p>
                  <Link 
                    href={`/admin/inventory/equipment/${maintenance.equipment.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {maintenance.equipment.sku}
                  </Link>
                </div>
                {maintenance.equipment.model && (
                  <div>
                    <p className="text-sm text-muted-foreground">الموديل</p>
                    <p className="font-medium">{maintenance.equipment.model}</p>
                  </div>
                )}
                {maintenance.equipment.serialNumber && (
                  <div>
                    <p className="text-sm text-muted-foreground">الرقم التسلسلي</p>
                    <p className="font-medium font-mono">{maintenance.equipment.serialNumber}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>وصف المشكلة / العمل المطلوب</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{maintenance.description}</p>
            </CardContent>
          </Card>

          {/* Completion Notes */}
          {maintenance.status === 'in_progress' && (
            <Card>
              <CardHeader>
                <CardTitle>إكمال الصيانة</CardTitle>
                <CardDescription>أضف ملاحظات الإكمال وحدد الحالة كمكتملة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>ملاحظات الإكمال</Label>
                  <Textarea
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    placeholder="وصف العمل المنجز..."
                    rows={4}
                  />
                </div>
                <Button 
                  onClick={() => handleStatusChange('completed', completionNotes)}
                  disabled={updating}
                >
                  <CheckCircle className="h-4 w-4 ml-2" />
                  {updating ? 'جاري التحديث...' : 'تحديد كمكتمل'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {maintenance.notes && (
            <Card>
              <CardHeader>
                <CardTitle>ملاحظات</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap bg-muted p-4 rounded-lg">{maintenance.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>الإجراءات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {maintenance.status === 'scheduled' && (
                <Button 
                  className="w-full" 
                  onClick={() => handleStatusChange('in_progress')}
                  disabled={updating}
                >
                  <Play className="h-4 w-4 ml-2" />
                  بدء العمل
                </Button>
              )}
              {maintenance.status === 'in_progress' && (
                <>
                  <Button 
                    className="w-full" 
                    onClick={() => handleStatusChange('completed')}
                    disabled={updating}
                  >
                    <CheckCircle className="h-4 w-4 ml-2" />
                    تحديد كمكتمل
                  </Button>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => handleStatusChange('scheduled')}
                    disabled={updating}
                  >
                    <Pause className="h-4 w-4 ml-2" />
                    إيقاف مؤقت
                  </Button>
                </>
              )}
              {maintenance.status !== 'cancelled' && maintenance.status !== 'completed' && (
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => handleStatusChange('cancelled')}
                  disabled={updating}
                >
                  <XCircle className="h-4 w-4 ml-2" />
                  إلغاء
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle>التفاصيل</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">التاريخ المقرر</p>
                <p className="font-medium">{formatDate(maintenance.scheduledDate)}</p>
              </div>
              {maintenance.completedDate && (
                <div>
                  <p className="text-sm text-muted-foreground">تاريخ الإكمال</p>
                  <p className="font-medium">{formatDate(maintenance.completedDate)}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">النوع</p>
                <p className="font-medium">{typeConfig.label}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الأولوية</p>
                <Badge className={priorityConfig.color}>{priorityConfig.label}</Badge>
              </div>
              {maintenance.technician && (
                <div>
                  <p className="text-sm text-muted-foreground">الفني المسؤول</p>
                  <p className="font-medium">
                    {maintenance.technician.name || maintenance.technician.email}
                  </p>
                </div>
              )}
              {maintenance.cost && (
                <div>
                  <p className="text-sm text-muted-foreground">التكلفة</p>
                  <p className="font-medium">{maintenance.cost} ر.س</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">تاريخ الإنشاء</p>
                <p className="font-medium">{formatDate(maintenance.createdAt)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
