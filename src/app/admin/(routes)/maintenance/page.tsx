/**
 * @file maintenance/page.tsx
 * @description Maintenance list page
 * @module app/admin/(routes)/maintenance
 * @author Engineering Team
 * @created 2026-01-28
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Eye, Wrench, Calendar, AlertCircle } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils/format.utils'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import type { MaintenanceStatus, MaintenanceType, MaintenancePriority } from '@/lib/types/maintenance.types'

interface Maintenance {
  id: string
  maintenanceNumber: string
  equipmentId: string
  type: MaintenanceType
  status: MaintenanceStatus
  priority: MaintenancePriority
  scheduledDate: string
  completedDate?: string | null
  technicianId?: string | null
  description: string
  equipment: {
    id: string
    sku: string
    model: string | null
  }
  technician?: {
    id: string
    name: string | null
    email: string
  } | null
}

const STATUS_LABELS: Record<MaintenanceStatus, { ar: string; en: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  scheduled: { ar: 'مجدول', en: 'Scheduled', variant: 'secondary' },
  in_progress: { ar: 'قيد التنفيذ', en: 'In Progress', variant: 'default' },
  completed: { ar: 'مكتمل', en: 'Completed', variant: 'default' },
  cancelled: { ar: 'ملغي', en: 'Cancelled', variant: 'destructive' },
  overdue: { ar: 'متأخر', en: 'Overdue', variant: 'destructive' },
}

const TYPE_LABELS: Record<MaintenanceType, { ar: string; en: string }> = {
  preventive: { ar: 'وقائي', en: 'Preventive' },
  corrective: { ar: 'تصحيحي', en: 'Corrective' },
  inspection: { ar: 'فحص', en: 'Inspection' },
  repair: { ar: 'إصلاح', en: 'Repair' },
  calibration: { ar: 'معايرة', en: 'Calibration' },
}

const PRIORITY_LABELS: Record<MaintenancePriority, { ar: string; en: string; color: string }> = {
  low: { ar: 'منخفضة', en: 'Low', color: 'bg-gray-100 text-gray-800' },
  medium: { ar: 'متوسطة', en: 'Medium', color: 'bg-blue-100 text-blue-800' },
  high: { ar: 'عالية', en: 'High', color: 'bg-orange-100 text-orange-800' },
  urgent: { ar: 'عاجل', en: 'Urgent', color: 'bg-red-100 text-red-800' },
}

export default function MaintenancePage() {
  const { toast } = useToast()
  const [maintenance, setMaintenance] = useState<Maintenance[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')

  const statuses: Array<MaintenanceStatus | 'all'> = [
    'all',
    'scheduled',
    'in_progress',
    'completed',
    'cancelled',
    'overdue',
  ]

  const types: Array<MaintenanceType | 'all'> = [
    'all',
    'preventive',
    'corrective',
    'inspection',
    'repair',
    'calibration',
  ]

  const priorities: Array<MaintenancePriority | 'all'> = [
    'all',
    'low',
    'medium',
    'high',
    'urgent',
  ]

  useEffect(() => {
    loadMaintenance()
  }, [statusFilter, typeFilter, priorityFilter])

  const loadMaintenance = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (priorityFilter !== 'all') params.set('priority', priorityFilter)
      params.set('page', '1')
      params.set('pageSize', '50')

      const response = await fetch(`/api/maintenance?${params.toString()}`)
      if (!response.ok) {
        throw new Error('فشل تحميل طلبات الصيانة')
      }

      const data = await response.json()
      setMaintenance(data.data || [])
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحميل طلبات الصيانة',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredMaintenance = useMemo(() => {
    return maintenance
  }, [maintenance])

  const getStatusLabel = (status: MaintenanceStatus) => {
    return STATUS_LABELS[status]?.ar || status
  }

  const getTypeLabel = (type: MaintenanceType) => {
    return TYPE_LABELS[type]?.ar || type
  }

  const getPriorityLabel = (priority: MaintenancePriority) => {
    return PRIORITY_LABELS[priority]?.ar || priority
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">الصيانة</h1>
          <p className="text-muted-foreground mt-2">
            إدارة طلبات صيانة المعدات
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/maintenance/new">
            <Plus className="h-4 w-4 ml-2" />
            طلب صيانة جديد
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status === 'all' ? 'جميع الحالات' : STATUS_LABELS[status as MaintenanceStatus]?.ar || status}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          {types.map((type) => (
            <option key={type} value={type}>
              {type === 'all' ? 'جميع الأنواع' : TYPE_LABELS[type as MaintenanceType]?.ar || type}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          {priorities.map((priority) => (
            <option key={priority} value={priority}>
              {priority === 'all' ? 'جميع الأولويات' : PRIORITY_LABELS[priority as MaintenancePriority]?.ar || priority}
            </option>
          ))}
        </select>
      </div>

      {/* Maintenance Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم الطلب</TableHead>
              <TableHead>المعدات</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الأولوية</TableHead>
              <TableHead>التاريخ المقرر</TableHead>
              <TableHead>الفني</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <div className="space-y-2 py-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredMaintenance.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  لا توجد طلبات صيانة
                </TableCell>
              </TableRow>
            ) : (
              filteredMaintenance.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.maintenanceNumber}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{item.equipment.sku}</div>
                      {item.equipment.model && (
                        <div className="text-sm text-muted-foreground">{item.equipment.model}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getTypeLabel(item.type)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_LABELS[item.status]?.variant || 'default'}>
                      {getStatusLabel(item.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${PRIORITY_LABELS[item.priority]?.color || ''}`}>
                      {getPriorityLabel(item.priority)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDate(item.scheduledDate)}
                      {item.status === 'overdue' && (
                        <AlertCircle className="h-3 w-3 inline-block ml-1 text-destructive" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.technician ? (
                      <div className="text-sm">
                        {item.technician.name || item.technician.email}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">غير محدد</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/maintenance/${item.id}`}>
                      <Button size="sm" variant="ghost">
                        <Eye className="h-4 w-4 ml-1" />
                        عرض
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
