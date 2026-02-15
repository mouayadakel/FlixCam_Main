'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
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
import { useToast } from '@/hooks/use-toast'
import { Loader2, ClipboardCheck, RefreshCw } from 'lucide-react'

// Types matching API response
interface EquipmentAuditItem {
  id: string
  sku: string
  model: string
  category: string
  status: 'complete' | 'flat' | 'missing' | 'invalid'
  specsFormat: 'structured' | 'flat' | 'empty' | 'invalid'
  hasSpecs: boolean
  hasImages: boolean
  imageCount: number
  issues: string[]
  editUrl: string
}

interface AuditSummary {
  total: number
  complete: number
  needsConversion: number
  missingSpecs: number
  invalidSpecs: number
  missingImages: number
  percentComplete: number
}

interface AuditResponse {
  success: boolean
  timestamp: string
  summary: AuditSummary
  equipment: EquipmentAuditItem[]
}

type TabValue = 'flat' | 'empty' | 'invalid' | 'all'

function filterByTab(
  equipment: EquipmentAuditItem[],
  tab: TabValue
): EquipmentAuditItem[] {
  switch (tab) {
    case 'flat':
      return equipment.filter((i) => i.specsFormat === 'flat')
    case 'empty':
      return equipment.filter((i) => i.specsFormat === 'empty')
    case 'invalid':
      return equipment.filter(
        (i) => i.status === 'invalid' && i.specsFormat !== 'empty'
      )
    default:
      return equipment
  }
}

export function SpecificationsAuditDialog() {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [audit, setAudit] = useState<AuditResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [convertLoading, setConvertLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [dryRunSummary, setDryRunSummary] = useState<{
    converted: number
    skipped: number
    failed: number
  } | null>(null)

  const fetchAudit = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/equipment/audit-specifications')
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'فشل جلب التقرير')
      }
      setAudit(data)
      setSelectedIds(new Set())
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل فحص المواصفات',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (open) {
      fetchAudit()
    }
  }, [open, fetchAudit])

  const flatItems = audit?.equipment?.filter((i) => i.specsFormat === 'flat') ?? []
  const allSelected =
    flatItems.length > 0 &&
    flatItems.every((i) => selectedIds.has(i.id))
  const someSelected = flatItems.some((i) => selectedIds.has(i.id))

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(flatItems.map((i) => i.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const handleConvertClick = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) {
      toast({
        title: 'تنبيه',
        description: 'اختر معدات لتحويلها',
        variant: 'destructive',
      })
      return
    }
    setConvertLoading(true)
    try {
      const res = await fetch('/api/admin/equipment/convert-specifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipmentIds: ids, dryRun: true }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'فشل المحاكاة')
      }
      setDryRunSummary(data.summary)
      setConfirmOpen(true)
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل محاكاة التحويل',
        variant: 'destructive',
      })
    } finally {
      setConvertLoading(false)
    }
  }

  const handleConfirmConvert = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setConvertLoading(true)
    setConfirmOpen(false)
    try {
      const res = await fetch('/api/admin/equipment/convert-specifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipmentIds: ids, dryRun: false }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'فشل التحويل')
      }
      const s = data.summary
      toast({
        title: 'تم التحويل',
        description: `تم تحويل ${s.converted} معدّة. تخطي: ${s.skipped}. فشل: ${s.failed}.`,
      })
      setDryRunSummary(null)
      fetchAudit()
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل التحويل',
        variant: 'destructive',
      })
    } finally {
      setConvertLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" type="button" aria-label="فحص اكتمال المواصفات">
            <ClipboardCheck className="ml-2 h-4 w-4" />
            فحص اكتمال المواصفات
          </Button>
        </DialogTrigger>
        <DialogContent
          className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          dir="rtl"
          aria-label="تقرير فحص المواصفات"
        >
          <DialogHeader>
            <DialogTitle>فحص اكتمال المواصفات</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !audit ? (
            <div className="py-6 text-center text-muted-foreground">
              لم يتم تحميل التقرير بعد.
            </div>
          ) : (
            <div className="flex flex-col gap-4 overflow-hidden min-h-0">
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">إجمالي</p>
                    <p className="text-2xl font-semibold">{audit.summary.total}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">مكتملة</p>
                    <p className="text-2xl font-semibold text-green-600">
                      {audit.summary.complete}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">تحتاج تحويل</p>
                    <p className="text-2xl font-semibold text-amber-600">
                      {audit.summary.needsConversion}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">بدون مواصفات</p>
                    <p className="text-2xl font-semibold">
                      {audit.summary.missingSpecs}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">غير صالحة</p>
                    <p className="text-2xl font-semibold text-red-600">
                      {audit.summary.invalidSpecs}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">بدون صور</p>
                    <p className="text-2xl font-semibold">
                      {audit.summary.missingImages}
                    </p>
                  </CardContent>
                </Card>
              </div>
              <p className="text-sm text-muted-foreground">
                نسبة الاكتمال: {audit.summary.percentComplete}%
              </p>

              {/* Tabs */}
              <Tabs defaultValue="flat" className="flex flex-col min-h-0 overflow-hidden">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <TabsList>
                    <TabsTrigger value="flat">تحتاج تحويل</TabsTrigger>
                    <TabsTrigger value="empty">ناقصة</TabsTrigger>
                    <TabsTrigger value="invalid">غير صالحة</TabsTrigger>
                    <TabsTrigger value="all">الكل</TabsTrigger>
                  </TabsList>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={fetchAudit}
                      disabled={loading}
                      aria-label="إعادة الفحص"
                    >
                      <RefreshCw className="ml-1 h-4 w-4" />
                      إعادة الفحص
                    </Button>
                    {flatItems.length > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleConvertClick}
                        disabled={convertLoading || selectedIds.size === 0}
                        aria-label="تحويل المحددة"
                      >
                        {convertLoading ? (
                          <Loader2 className="ml-1 h-4 w-4 animate-spin" />
                        ) : null}
                        تحويل المحددة ({selectedIds.size})
                      </Button>
                    )}
                  </div>
                </div>

                {(['flat', 'empty', 'invalid', 'all'] as const).map((tab) => {
                  const items = filterByTab(audit.equipment, tab)
                  return (
                    <TabsContent
                      key={tab}
                      value={tab}
                      className="mt-3 overflow-auto flex-1 min-h-0 data-[state=inactive]:hidden"
                    >
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {tab === 'flat' && (
                              <TableHead className="w-10">
                                <Checkbox
                                  checked={
                                    allSelected
                                      ? true
                                      : someSelected
                                        ? 'indeterminate'
                                        : false
                                  }
                                  onCheckedChange={handleSelectAll}
                                  aria-label="تحديد الكل"
                                />
                              </TableHead>
                            )}
                            <TableHead>SKU</TableHead>
                            <TableHead>الموديل</TableHead>
                            <TableHead>الفئة</TableHead>
                            <TableHead>المشكلات</TableHead>
                            <TableHead className="text-left">إجراء</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={tab === 'flat' ? 5 : 4}
                                className="text-center text-muted-foreground"
                              >
                                لا توجد عناصر
                              </TableCell>
                            </TableRow>
                          ) : (
                            items.map((item) => (
                              <TableRow key={item.id}>
                                {tab === 'flat' && (
                                  <TableCell>
                                    <Checkbox
                                      checked={selectedIds.has(item.id)}
                                      onCheckedChange={(checked) =>
                                        handleSelectOne(
                                          item.id,
                                          checked === true
                                        )
                                      }
                                      aria-label={`تحديد ${item.sku}`}
                                    />
                                  </TableCell>
                                )}
                                <TableCell className="font-mono text-sm">
                                  {item.sku}
                                </TableCell>
                                <TableCell>{item.model}</TableCell>
                                <TableCell>{item.category}</TableCell>
                                <TableCell className="max-w-[200px]">
                                  <ul className="list-disc list-inside text-xs text-muted-foreground">
                                    {item.issues.slice(0, 3).map((issue, idx) => (
                                      <li key={idx}>{issue}</li>
                                    ))}
                                    {item.issues.length > 3 && (
                                      <li>+{item.issues.length - 3} أخرى</li>
                                    )}
                                  </ul>
                                </TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="sm" asChild>
                                    <Link href={item.editUrl}>تعديل</Link>
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </TabsContent>
                  )
                })}
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد التحويل</AlertDialogTitle>
            <AlertDialogDescription>
              {dryRunSummary != null && (
                <>
                  محاكاة التحويل: سيتم تحويل {dryRunSummary.converted} معدّة،
                  تخطي {dryRunSummary.skipped}، فشل {dryRunSummary.failed}.
                  هل تريد تنفيذ التحويل فعلياً؟
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmConvert}
              disabled={convertLoading}
            >
              {convertLoading ? (
                <Loader2 className="ml-1 h-4 w-4 animate-spin" />
              ) : null}
              تأكيد التحويل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
