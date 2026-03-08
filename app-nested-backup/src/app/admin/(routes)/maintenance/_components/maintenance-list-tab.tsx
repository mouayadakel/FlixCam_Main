/**
 * @file maintenance-list-tab.tsx
 * @description Maintenance list tab content
 * @module app/admin/(routes)/maintenance/_components
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Eye, Download, Wrench } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { formatCurrency, formatDate } from '@/lib/utils/format.utils'
import { exportToCSV } from '@/lib/utils/export.utils'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/states/empty-state'
import { TablePagination } from '@/components/tables/table-pagination'
import type {
  MaintenanceStatus,
  MaintenanceType,
  MaintenancePriority,
} from '@/lib/types/maintenance.types'

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
  cost?: number
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

const STATUS_LABELS: Record<
  MaintenanceStatus,
  { ar: string; en: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
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

export default function MaintenanceListTab() {
  const { toast } = useToast()
  const [maintenance, setMaintenance] = useState<Maintenance[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

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

  const priorities: Array<MaintenancePriority | 'all'> = ['all', 'low', 'medium', 'high', 'urgent']

  useEffect(() => {
    loadMaintenance()
  }, [statusFilter, typeFilter, priorityFilter, page, pageSize, dateFrom, dateTo])

  const loadMaintenance = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (priorityFilter !== 'all') params.set('priority', priorityFilter)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))

      const response = await fetch(`/api/maintenance?${params.toString()}`)
      if (!response.ok) {
        throw new Error('فشل تحميل طلبات الصيانة')
      }

      const data = await response.json()
      setMaintenance(data.data || [])
      setTotal(data.total ?? 0)
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

  const filteredMaintenance = useMemo(() => maintenance, [maintenance])

  const getStatusLabel = (status: MaintenanceStatus) => {
    return STATUS_LABELS[status]?.ar || status
  }

  const getTypeLabel = (type: MaintenanceType) => {
    return TYPE_LABELS[type]?.ar || type
  }

  const getPriorityLabel = (priority: MaintenancePriority) => {
    return PRIORITY_LABELS[priority]?.ar || priority
  }

  const durationDays = (item: Maintenance): number | null => {
    const start = new Date(item.scheduledDate).getTime()
    const end = item.completedDate ? new Date(item.completedDate).getTime() : Date.now()
    if (end <= start) return null
    return Math.floor((end - start) / 86400000)
  }

  const handleExportCSV = () => {
    const rows = filteredMaintenance.map((m) => ({
      maintenanceNumber: m.maintenanceNumber,
      equipmentSku: m.equipment.sku,
      type: getTypeLabel(m.type),
      status: getStatusLabel(m.status),
      priority: getPriorityLabel(m.priority),
      cost: m.cost != null ? formatCurrency(m.cost) : '',
      scheduledDate: formatDate(m.scheduledDate),
      completedDate: m.completedDate ? formatDate(m.completedDate) : '',
      technicianName: m.technician?.name ?? '',
    }))
    exportToCSV(rows, `maintenance-${new Date().toISOString().slice(0, 10)}`, [
      { key: 'maintenanceNumber', label: 'رقم الطلب' },
      { key: 'equipmentSku', label: 'المعدة' },
      { key: 'type', label: 'النوع' },
      { key: 'status', label: 'الحالة' },
      { key: 'priority', label: 'الأولوية' },
      { key: 'cost', label: 'التكلفة' },
      { key: 'scheduledDate', label: 'التاريخ المقرر' },
      { key: 'completedDate', label: 'تاريخ الإكمال' },
      { key: 'technicianName', label: 'الفني' },
    ])
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          disabled={filteredMaintenance.length === 0}
        >
          <Download className="ms-2 h-4 w-4" />
          تصدير CSV
        </Button>
        <Button asChild>
          <Link href="/admin/maintenance/new">
            <Plus className="ms-2 h-4 w-4" />
            طلب صيانة جديد
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor="maint-date-from" className="sr-only">
          من تاريخ
        </Label>
        <Input
          id="maint-date-from"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="h-9 rounded-md border border-input"
          aria-label="من تاريخ"
        />
        <Label htmlFor="maint-date-to" className="sr-only">
          إلى تاريخ
        </Label>
        <Input
          id="maint-date-to"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="h-9 rounded-md border border-input"
          aria-label="إلى تاريخ"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 rounded-md border border-input" aria-label="فلتر الحالة">
            <SelectValue placeholder="جميع الحالات" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status === 'all'
                  ? 'جميع الحالات'
                  : STATUS_LABELS[status as MaintenanceStatus]?.ar || status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-9 rounded-md border border-input" aria-label="فلتر النوع">
            <SelectValue placeholder="جميع الأنواع" />
          </SelectTrigger>
          <SelectContent>
            {types.map((type) => (
              <SelectItem key={type} value={type}>
                {type === 'all' ? 'جميع الأنواع' : TYPE_LABELS[type as MaintenanceType]?.ar || type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="h-9 rounded-md border border-input" aria-label="فلتر الأولوية">
            <SelectValue placeholder="جميع الأولويات" />
          </SelectTrigger>
          <SelectContent>
            {priorities.map((priority) => (
              <SelectItem key={priority} value={priority}>
                {priority === 'all'
                  ? 'جميع الأولويات'
                  : PRIORITY_LABELS[priority as MaintenancePriority]?.ar || priority}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم الطلب</TableHead>
              <TableHead>المعدات</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الأولوية</TableHead>
              <TableHead>التكلفة</TableHead>
              <TableHead>المدة (أيام)</TableHead>
              <TableHead>التاريخ المقرر</TableHead>
              <TableHead>الفني</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10}>
                  <div className="space-y-2 py-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredMaintenance.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="p-0">
                  <EmptyState
                    title="لا توجد طلبات صيانة"
                    description="لم يتم العثور على طلبات صيانة تطابق الفلتر. أضف طلب صيانة جديد من الزر أدناه."
                    icon={<Wrench className="h-12 w-12" />}
                    actionLabel="طلب صيانة جديد"
                    actionHref="/admin/maintenance/new"
                  />
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
                    <span
                      className={`rounded px-2 py-1 text-xs ${PRIORITY_LABELS[item.priority]?.color || ''}`}
                    >
                      {getPriorityLabel(item.priority)}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.cost != null ? formatCurrency(item.cost) : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {durationDays(item) != null ? `${durationDays(item)} يوم` : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDate(item.scheduledDate)}
                      {item.status === 'overdue' && (
                        <span className="ms-1 text-destructive">!</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.technician ? (
                      <div className="text-sm">{item.technician.name || item.technician.email}</div>
                    ) : (
                      <span className="text-sm text-muted-foreground">غير محدد</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/maintenance/${item.id}`}>
                      <Button size="sm" variant="ghost">
                        <Eye className="ms-1 h-4 w-4" />
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

      {total > 0 && (
        <TablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
          itemLabel="طلب صيانة"
          dir="rtl"
        />
      )}
    </div>
  )
}
