// ============================================================================
// Component: Specifications Audit & Convert Dialog
// Purpose: Audit all equipment specs and bulk convert flat to structured
// ============================================================================

'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import {
  ClipboardCheck,
  Package,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Image,
  FileQuestion,
  Loader2,
  ExternalLink,
  CheckSquare,
  Square,
} from 'lucide-react'
import type {
  AuditResponse,
  EquipmentAuditItem,
} from '@/app/api/admin/equipment/audit-specifications/route'
import type { ConversionResponse } from '@/app/api/admin/equipment/convert-specifications/route'

// ============================================================================
// Types
// ============================================================================

interface StatCardProps {
  label: string
  value: number
  icon: React.ElementType
  variant?: 'default' | 'success' | 'warning' | 'error'
}

// ============================================================================
// Stat Card Component
// ============================================================================

function StatCard({ label, value, icon: Icon, variant = 'default' }: StatCardProps) {
  const variants = {
    default: 'bg-surface-light border-border-light text-text-heading',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    error: 'bg-red-50 border-red-200 text-red-900',
  }

  return (
    <div className={`rounded-lg border p-4 ${variants[variant]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-70">{label}</p>
          <p className="mt-1 text-3xl font-bold">{value}</p>
        </div>
        <Icon className="h-8 w-8 opacity-40" />
      </div>
    </div>
  )
}

// ============================================================================
// Equipment List Component
// ============================================================================

interface EquipmentListProps {
  items: EquipmentAuditItem[]
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
  showActions?: boolean
}

function EquipmentList({
  items,
  selectedIds = new Set(),
  onSelectionChange,
  showActions = false,
}: EquipmentListProps) {
  const handleToggle = (id: string) => {
    if (!onSelectionChange) return

    const newSelection = new Set(selectedIds)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    onSelectionChange(newSelection)
  }

  const handleSelectAll = () => {
    if (!onSelectionChange) return

    if (selectedIds.size === items.length) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(items.map((i) => i.id)))
    }
  }

  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-text-muted">
        <FileQuestion className="mx-auto mb-3 h-12 w-12 opacity-50" />
        <p>لا توجد معدات في هذه الفئة</p>
      </div>
    )
  }

  const statusColors = {
    complete: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    flat: 'bg-amber-100 text-amber-800 border-amber-200',
    missing: 'bg-red-100 text-red-800 border-red-200',
    invalid: 'bg-red-100 text-red-800 border-red-200',
  }

  const statusLabels = {
    complete: 'مكتملة',
    flat: 'تحتاج تحويل',
    missing: 'ناقصة',
    invalid: 'غير صالحة',
  }

  return (
    <div className="space-y-3">
      {/* Select All */}
      {showActions && items.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-surface-light p-3">
          <Checkbox checked={selectedIds.size === items.length} onCheckedChange={handleSelectAll} />
          <span className="text-sm font-medium">
            تحديد الكل ({selectedIds.size}/{items.length})
          </span>
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-lg border border-border-light bg-white p-4 transition-colors hover:border-brand-primary/30"
          >
            {/* Checkbox */}
            {showActions && (
              <Checkbox
                checked={selectedIds.has(item.id)}
                onCheckedChange={() => handleToggle(item.id)}
                className="mt-1"
              />
            )}

            {/* Content */}
            <div className="min-w-0 flex-1">
              {/* Header */}
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className="truncate font-semibold text-text-heading">{item.model}</h4>
                  <p className="text-sm text-text-muted">
                    {item.sku} • {item.category}
                  </p>
                </div>

                <Badge variant="outline" className={statusColors[item.status]}>
                  {statusLabels[item.status]}
                </Badge>
              </div>

              {/* Stats */}
              <div className="mb-2 flex items-center gap-4 text-sm text-text-muted">
                <span className="flex items-center gap-1">
                  <Package className="h-3.5 w-3.5" />
                  {item.specsFormat}
                </span>
                <span className="flex items-center gap-1">
                  <Image className="h-3.5 w-3.5" />
                  {item.imageCount} صور
                </span>
              </div>

              {/* Issues */}
              {item.issues.length > 0 && (
                <div className="space-y-1">
                  {item.issues.map((issue, idx) => (
                    <p key={idx} className="flex items-start gap-1 text-xs text-amber-600">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                      {issue}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Edit Link */}
            <a
              href={item.editUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded p-2 transition-colors hover:bg-surface-light"
            >
              <ExternalLink className="h-4 w-4 text-text-muted" />
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Main Dialog Component
// ============================================================================

export function SpecificationsAuditDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [converting, setConverting] = useState(false)
  const [auditResults, setAuditResults] = useState<AuditResponse | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showConfirm, setShowConfirm] = useState(false)
  const [conversionPreview, setConversionPreview] = useState<ConversionResponse | null>(null)

  // Run audit
  const runAudit = async () => {
    setLoading(true)
    setAuditResults(null)
    setSelectedIds(new Set())

    try {
      const response = await fetch('/api/admin/equipment/audit-specifications')
      const data: AuditResponse = await response.json()

      if (data.success) {
        setAuditResults(data)
        toast.success('تم فحص المعدات بنجاح')
      } else {
        throw new Error('Audit failed')
      }
    } catch (error) {
      toast.error('فشل فحص المعدات')
      console.error('Audit error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Convert specifications (dry run or actual)
  const handleConvert = async (dryRun: boolean) => {
    if (selectedIds.size === 0) {
      toast.error('الرجاء تحديد معدات للتحويل')
      return
    }

    setConverting(true)

    try {
      const response = await fetch('/api/admin/equipment/convert-specifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentIds: Array.from(selectedIds),
          dryRun,
        }),
      })

      const data: ConversionResponse = await response.json()

      if (dryRun) {
        // Show preview and ask for confirmation
        setConversionPreview(data)
        setShowConfirm(true)

        toast.info(
          `سيتم تحويل ${data.summary.converted} معدة\n` +
            `متخطى: ${data.summary.skipped}\n` +
            `فشل: ${data.summary.failed}`
        )
      } else {
        // Actual conversion done
        setShowConfirm(false)
        toast.success(`تم تحويل ${data.summary.converted} معدة بنجاح!`)

        // Refresh audit
        await runAudit()
      }
    } catch (error) {
      toast.error('فشل التحويل')
      console.error('Conversion error:', error)
    } finally {
      setConverting(false)
    }
  }

  // Open dialog and run audit
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (newOpen && !auditResults) {
      runAudit()
    }
  }

  // Get filterable equipment lists
  const needsConversion = auditResults?.equipment.filter((e) => e.specsFormat === 'flat') || []
  const missing = auditResults?.equipment.filter((e) => e.specsFormat === 'empty') || []
  const invalid = auditResults?.equipment.filter((e) => e.specsFormat === 'invalid') || []

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <ClipboardCheck className="mr-2 h-4 w-4" />
            فحص اكتمال المواصفات
          </Button>
        </DialogTrigger>

        <DialogContent className="flex max-h-[85vh] max-w-5xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>تقرير فحص المواصفات الشامل</DialogTitle>
            <DialogDescription>فحص حالة المواصفات لجميع المعدات في النظام</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="mb-4 h-12 w-12 animate-spin text-brand-primary" />
                <p className="text-text-muted">جاري فحص المعدات...</p>
              </div>
            )}

            {/* Results */}
            {!loading && auditResults && (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <StatCard
                    label="إجمالي المعدات"
                    value={auditResults.summary.total}
                    icon={Package}
                  />
                  <StatCard
                    label="مكتملة"
                    value={auditResults.summary.complete}
                    icon={CheckCircle}
                    variant="success"
                  />
                  <StatCard
                    label="تحتاج تحويل"
                    value={auditResults.summary.needsConversion}
                    icon={RefreshCw}
                    variant="warning"
                  />
                  <StatCard
                    label="بدون مواصفات"
                    value={auditResults.summary.missingSpecs}
                    icon={AlertTriangle}
                    variant="error"
                  />
                  <StatCard
                    label="غير صالحة"
                    value={auditResults.summary.invalidSpecs}
                    icon={XCircle}
                    variant="error"
                  />
                  <StatCard
                    label="بدون صور"
                    value={auditResults.summary.missingImages}
                    icon={Image}
                    variant="warning"
                  />
                </div>

                {/* Completion Progress */}
                <div className="rounded-lg border border-border-light bg-surface-light p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-text-heading">نسبة الاكتمال</span>
                    <span className="text-2xl font-bold text-brand-primary">
                      {auditResults.summary.percentComplete}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-brand-primary transition-all duration-500"
                      style={{ width: `${auditResults.summary.percentComplete}%` }}
                    />
                  </div>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="needsConversion">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="needsConversion">
                      تحتاج تحويل ({needsConversion.length})
                    </TabsTrigger>
                    <TabsTrigger value="missing">ناقصة ({missing.length})</TabsTrigger>
                    <TabsTrigger value="invalid">غير صالحة ({invalid.length})</TabsTrigger>
                    <TabsTrigger value="all">الكل ({auditResults.equipment.length})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="needsConversion" className="mt-4">
                    <EquipmentList
                      items={needsConversion}
                      selectedIds={selectedIds}
                      onSelectionChange={setSelectedIds}
                      showActions
                    />
                  </TabsContent>

                  <TabsContent value="missing" className="mt-4">
                    <EquipmentList items={missing} />
                  </TabsContent>

                  <TabsContent value="invalid" className="mt-4">
                    <EquipmentList items={invalid} />
                  </TabsContent>

                  <TabsContent value="all" className="mt-4">
                    <EquipmentList items={auditResults.equipment} />
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {!loading && auditResults && needsConversion.length > 0 && (
            <DialogFooter className="border-t pt-4">
              <Button variant="outline" onClick={() => runAudit()} disabled={loading}>
                <RefreshCw className="mr-2 h-4 w-4" />
                تحديث
              </Button>
              <Button
                onClick={() => handleConvert(true)}
                disabled={converting || selectedIds.size === 0}
              >
                {converting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {!converting && <RefreshCw className="mr-2 h-4 w-4" />}
                تحويل المحددة ({selectedIds.size})
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد التحويل</AlertDialogTitle>
            <AlertDialogDescription>
              أنت على وشك تحويل {selectedIds.size} معدة من الشكل المسطح إلى الشكل المنظم.
              <br />
              <br />
              هذه العملية لا يمكن التراجع عنها. هل أنت متأكد؟
            </AlertDialogDescription>
          </AlertDialogHeader>

          {conversionPreview && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between rounded bg-emerald-50 p-2">
                <span>سيتم التحويل:</span>
                <span className="font-semibold">{conversionPreview.summary.converted}</span>
              </div>
              <div className="flex justify-between rounded bg-amber-50 p-2">
                <span>سيتم التخطي:</span>
                <span className="font-semibold">{conversionPreview.summary.skipped}</span>
              </div>
              {conversionPreview.summary.failed > 0 && (
                <div className="flex justify-between rounded bg-red-50 p-2">
                  <span>فشل:</span>
                  <span className="font-semibold">{conversionPreview.summary.failed}</span>
                </div>
              )}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={converting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleConvert(false)} disabled={converting}>
              {converting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              نعم، حوّل الآن
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
