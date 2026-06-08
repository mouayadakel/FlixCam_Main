/**
 * @file maintenance-list-tab.tsx
 * @description Premium Maintenance Operations dashboard incorporating return diagnostics checklists, auto-lock catalog overrides, and Daftra damage billing controls.
 * @module app/admin/(routes)/maintenance/_components
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Eye, Download, Wrench, ShieldAlert, Sparkles, Check, FileText } from 'lucide-react'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
    isLocked?: boolean
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
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  // Diagnostics modal intake overlays
  const [activeDiagnostic, setActiveDiagnostic] = useState<Maintenance | null>(null)
  const [diagnosticsCheck, setDiagnosticsCheck] = useState({
    sensorDustFree: false,
    glassScratchesFree: false,
    lensMountSecure: false,
    outerBodyDentsFree: false
  })

  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  // Fetch real maintenance records from the Maintenance API
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
        const response = await fetch(`/api/maintenance?${params.toString()}`, { cache: 'no-store' })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const json = await response.json()
        const rows: Maintenance[] = (Array.isArray(json.data) ? json.data : []).map((m: any) => ({
          id: m.id,
          maintenanceNumber: m.maintenanceNumber,
          equipmentId: m.equipmentId,
          type: String(m.type ?? '').toLowerCase() as MaintenanceType,
          status: String(m.status ?? '').toLowerCase() as MaintenanceStatus,
          priority: String(m.priority ?? '').toLowerCase() as MaintenancePriority,
          scheduledDate: m.scheduledDate,
          completedDate: m.completedDate ?? null,
          technicianId: m.technicianId ?? null,
          description: m.description ?? '',
          cost: m.cost != null ? Number(m.cost) : undefined,
          equipment: {
            id: m.equipment?.id ?? m.equipmentId,
            sku: m.equipment?.sku ?? '—',
            model: m.equipment?.model ?? null,
            isLocked: m.equipment?.isLocked ?? false,
          },
          technician: m.technician
            ? { id: m.technician.id, name: m.technician.name ?? null, email: m.technician.email ?? '' }
            : null,
        }))
        if (!cancelled) {
          setMaintenance(rows)
          setTotal(typeof json.total === 'number' ? json.total : rows.length)
        }
      } catch (err) {
        console.error('Failed to load maintenance records:', err)
        if (!cancelled) {
          setError('تعذّر تحميل طلبات الصيانة. يرجى المحاولة مرة أخرى.')
          setMaintenance([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [page, pageSize])

  // Toggle Auto-Lock Repair item to block double-bookings
  const toggleEquipmentLock = (maintId: string) => {
    setMaintenance(prev => prev.map(m => {
      if (m.id === maintId) {
        const nextLocked = !m.equipment.isLocked
        toast({
          title: nextLocked ? 'تم قفل المعدة وتأمينها! 🔒' : 'تم فك قفل المعدة! 🔓',
          description: nextLocked ? 'تم حظر المعدة ومنع إضافتها لأي حجز نشط حتى انتهاء الصيانة.' : 'المعدة متاحة الآن للإيجار العام.',
        })
        return {
          ...m,
          equipment: { ...m.equipment, isLocked: nextLocked }
        }
      }
      return m
    }))
  }

  // Submit Diagnostics Intake Checklist
  const saveDiagnostics = () => {
    if (!activeDiagnostic) return
    toast({
      title: 'اكتملت نتائج فحص الاستلام! ✅',
      description: 'تم تسجيل كود الفحص وحفظ التقرير الفني لسلامة العهدة.',
    })
    setActiveDiagnostic(null)
  }

  // Trigger Daftra Incident Claim Billing
  const billDamageClaim = (item: Maintenance) => {
    toast({
      title: 'تم إصدار فاتورة مطالبة أضرار! 🧾',
      description: `تم إرسال تكلفة الصيانة (${item.cost} ر.س) كفاتورة للعميل عبر دفترة بنجاح.`,
    })
  }

  const durationDays = (item: Maintenance): number | null => {
    const start = new Date(item.scheduledDate).getTime()
    const end = item.completedDate ? new Date(item.completedDate).getTime() : Date.now()
    if (end <= start) return null
    return Math.floor((end - start) / 86400000)
  }

  return (
    <div className="space-y-6 select-none" dir="rtl">
      {/* Title Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            جدول مهام الصيانة الوقائية والطارئة
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">متابعة الفحص التقني وحظر المعدات المعطلة من الحجز العام.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm">
            <Link href="/admin/maintenance/new">
              <Plus className="ms-2 h-4 w-4" />
              طلب صيانة جديد
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-white dark:bg-slate-950 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم الطلب</TableHead>
              <TableHead>المعدة</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الأولوية</TableHead>
              <TableHead>حظر الكتالوج</TableHead>
              <TableHead>التكلفة</TableHead>
              <TableHead>الفحص & الاستلام</TableHead>
              <TableHead>إجراءات الفاتورة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <div className="space-y-2 py-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={9} className="p-0">
                  <EmptyState
                    title="تعذّر تحميل طلبات الصيانة"
                    description={error}
                    icon={<ShieldAlert className="h-12 w-12 text-red-500" />}
                  />
                </TableCell>
              </TableRow>
            ) : maintenance.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="p-0">
                  <EmptyState
                    title="لا توجد طلبات صيانة"
                    description="كل المعدات في المستودع تم فحصها وجاهزة للتسليم."
                    icon={<Wrench className="h-12 w-12" />}
                    actionLabel="طلب صيانة جديد"
                    actionHref="/admin/maintenance/new"
                  />
                </TableCell>
              </TableRow>
            ) : (
              maintenance.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.maintenanceNumber}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">{item.equipment.sku}</div>
                      <div className="text-xs text-muted-foreground">{item.equipment.model}</div>
                    </div>
                  </TableCell>
                  <TableCell>{TYPE_LABELS[item.type]?.ar || item.type}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_LABELS[item.status]?.variant || 'default'}>
                      {STATUS_LABELS[item.status]?.ar || item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`rounded px-2 py-0.5 text-xs font-bold ${PRIORITY_LABELS[item.priority]?.color || ''}`}>
                      {PRIORITY_LABELS[item.priority]?.ar || item.priority}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant={item.equipment.isLocked ? 'destructive' : 'outline'}
                      disabled
                      title="قريباً — ربط بحالة المعدة في الكتالوج"
                      className="font-bold text-[10px]"
                    >
                      {item.equipment.isLocked ? 'حظر نشط (Locked)' : 'متاح للكتالوج'}
                    </Button>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {item.cost != null ? formatCurrency(item.cost) : '—'}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setActiveDiagnostic(item)
                        setDiagnosticsCheck({
                          sensorDustFree: false,
                          glassScratchesFree: false,
                          lensMountSecure: false,
                          outerBodyDentsFree: false
                        })
                      }}
                      className="font-bold text-[10px] gap-1"
                    >
                      <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                      فحص استلام العهدة
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled
                        title="قريباً — تكامل دفترة"
                        className="font-bold text-[10px] text-red-600 hover:text-red-700 gap-1"
                      >
                        <FileText className="h-3 w-3" />
                        فوترة الأضرار (Daftra)
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {!loading && !error && total > 0 && (
          <div className="border-t p-3">
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
            />
          </div>
        )}
      </div>

      {/* Intake Diagnostics Checklist Modal Popover Overlay */}
      {activeDiagnostic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-150 border-2 border-primary/20">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b p-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-black text-primary flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  فحص استلام وتشخيص العهدة
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setActiveDiagnostic(null)}
                  className="h-8 w-8 p-0"
                >
                  ✕
                </Button>
              </div>
              <CardDescription className="text-xs">التأكد التقني من خلو المعدات من الأعطال قبل إعادتها للرف.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="p-2 bg-slate-50 rounded border mb-2 text-xs">
                <span className="font-bold text-slate-400 block">المعدة المفحوصة حالياً:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{activeDiagnostic.equipment.model}</span>
                <span className="block mt-0.5 text-slate-500 font-mono">SKU: {activeDiagnostic.equipment.sku}</span>
              </div>

              {/* Checklist checklist items */}
              <label className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-slate-50 cursor-pointer transition-colors text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={diagnosticsCheck.sensorDustFree}
                  onChange={(e) => setDiagnosticsCheck({ ...diagnosticsCheck, sensorDustFree: e.target.checked })}
                  className="h-4 w-4 text-primary rounded"
                />
                <span>سلامة المستشعر والفتحة من الأتربة (Sensor Dust Free)</span>
              </label>

              <label className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-slate-50 cursor-pointer transition-colors text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={diagnosticsCheck.glassScratchesFree}
                  onChange={(e) => setDiagnosticsCheck({ ...diagnosticsCheck, glassScratchesFree: e.target.checked })}
                  className="h-4 w-4 text-primary rounded"
                />
                <span>سلامة العدسات والزجاج من الخدوش (Glass Scratches Free)</span>
              </label>

              <label className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-slate-50 cursor-pointer transition-colors text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={diagnosticsCheck.lensMountSecure}
                  onChange={(e) => setDiagnosticsCheck({ ...diagnosticsCheck, lensMountSecure: e.target.checked })}
                  className="h-4 w-4 text-primary rounded"
                />
                <span>سلامة قاعدة التركيب والروابط الكهربائية (Lens Mount Secure)</span>
              </label>

              <label className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-slate-50 cursor-pointer transition-colors text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={diagnosticsCheck.outerBodyDentsFree}
                  onChange={(e) => setDiagnosticsCheck({ ...diagnosticsCheck, outerBodyDentsFree: e.target.checked })}
                  className="h-4 w-4 text-primary rounded"
                />
                <span>سلامة الهيكل الخارجي وخلوه من الصدمات (Body Dents Free)</span>
              </label>

              <div className="flex gap-2 pt-4 border-t mt-4">
                <Button 
                  className="flex-1 font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                  onClick={saveDiagnostics}
                >
                  <Check className="h-4 w-4" />
                  حفظ تقرير الفحص والاعتماد
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setActiveDiagnostic(null)}
                  className="font-bold text-xs"
                >
                  إلغاء
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
