'use client'

/**
 * @description Portal booking actions: request change, extension, cancel, report damage (Phase 4.3, 4.6)
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Edit3, CalendarPlus, XCircle, AlertTriangle } from 'lucide-react'
import type { BookingStatus } from '@prisma/client'

export interface BookingEquipmentOption {
  id: string
  equipmentId: string
  sku: string
  model?: string | null
}

export interface BookingActionsProps {
  bookingId: string
  status: BookingStatus
  currentEndDate: string // ISO
  canCancel: boolean
  cancelNotAllowedMessage?: string
  /** For "Report damage" - equipment in this booking */
  equipmentOptions?: BookingEquipmentOption[]
}

const CANCELABLE_STATUSES: BookingStatus[] = [
  'DRAFT',
  'RISK_CHECK',
  'PAYMENT_PENDING',
  'CONFIRMED',
]
const REQUEST_CHANGE_EXTENSION_STATUSES: BookingStatus[] = ['CONFIRMED', 'ACTIVE']
const REPORT_DAMAGE_STATUSES: BookingStatus[] = ['ACTIVE', 'RETURNED']

const DAMAGE_TYPES = [
  { value: 'PHYSICAL_DAMAGE', label: 'ضرر مادي' },
  { value: 'MALFUNCTION', label: 'عطل' },
  { value: 'MISSING_PARTS', label: 'قطع ناقصة' },
  { value: 'EXCESSIVE_WEAR', label: 'استهلاك زائد' },
  { value: 'LOSS', label: 'فقدان' },
  { value: 'OTHER', label: 'أخرى' },
] as const

const SEVERITIES = [
  { value: 'MINOR', label: 'بسيط' },
  { value: 'MODERATE', label: 'متوسط' },
  { value: 'SEVERE', label: 'جسيم' },
  { value: 'TOTAL_LOSS', label: 'خسارة كاملة' },
] as const

export function BookingActions({
  bookingId,
  status,
  currentEndDate,
  canCancel,
  cancelNotAllowedMessage,
  equipmentOptions = [],
}: BookingActionsProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [changeOpen, setChangeOpen] = useState(false)
  const [extensionOpen, setExtensionOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [damageOpen, setDamageOpen] = useState(false)

  const [changeReason, setChangeReason] = useState('')
  const [extensionReason, setExtensionReason] = useState('')
  const [extensionEndDate, setExtensionEndDate] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [damageDescription, setDamageDescription] = useState('')
  const [damageType, setDamageType] = useState<string>('PHYSICAL_DAMAGE')
  const [damageSeverity, setDamageSeverity] = useState<string>('MINOR')
  const [damageEquipmentId, setDamageEquipmentId] = useState<string>('')
  const [damageEstimatedCost, setDamageEstimatedCost] = useState('')

  const [changeSubmitting, setChangeSubmitting] = useState(false)
  const [extensionSubmitting, setExtensionSubmitting] = useState(false)
  const [cancelSubmitting, setCancelSubmitting] = useState(false)
  const [damageSubmitting, setDamageSubmitting] = useState(false)

  const canRequestChangeOrExtension = REQUEST_CHANGE_EXTENSION_STATUSES.includes(status)
  const showCancel = CANCELABLE_STATUSES.includes(status)
  const showReportDamage = REPORT_DAMAGE_STATUSES.includes(status)

  const minExtensionDate = (() => {
    const d = new Date(currentEndDate)
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  })()

  const handleRequestChange = async () => {
    if (!changeReason.trim()) {
      toast({ title: 'السبب مطلوب', variant: 'destructive' })
      return
    }
    setChangeSubmitting(true)
    try {
      const res = await fetch(`/api/portal/bookings/${bookingId}/request-change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: changeReason.trim(), requestedChanges: undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: data.error ?? 'فشل إرسال الطلب', variant: 'destructive' })
        return
      }
      toast({ title: data.message ?? 'تم إرسال طلب التعديل' })
      setChangeOpen(false)
      setChangeReason('')
      router.refresh()
    } finally {
      setChangeSubmitting(false)
    }
  }

  const handleRequestExtension = async () => {
    if (!extensionReason.trim()) {
      toast({ title: 'السبب مطلوب', variant: 'destructive' })
      return
    }
    if (!extensionEndDate) {
      toast({ title: 'تاريخ النهاية الجديد مطلوب', variant: 'destructive' })
      return
    }
    setExtensionSubmitting(true)
    try {
      const res = await fetch(`/api/portal/bookings/${bookingId}/request-extension`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: extensionReason.trim(),
          requestedEndDate: new Date(extensionEndDate).toISOString(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: data.error ?? 'فشل إرسال الطلب', variant: 'destructive' })
        return
      }
      toast({ title: data.message ?? 'تم إرسال طلب التمديد' })
      setExtensionOpen(false)
      setExtensionReason('')
      setExtensionEndDate('')
      router.refresh()
    } finally {
      setExtensionSubmitting(false)
    }
  }

  const handleCancel = async () => {
    setCancelSubmitting(true)
    try {
      const res = await fetch(`/api/portal/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: data.error ?? 'فشل الإلغاء', variant: 'destructive' })
        return
      }
      toast({ title: data.message ?? 'تم إلغاء الحجز' })
      setCancelOpen(false)
      setCancelReason('')
      router.refresh()
    } finally {
      setCancelSubmitting(false)
    }
  }

  const handleReportDamage = async () => {
    if (!damageDescription.trim()) {
      toast({ title: 'وصف الضرر مطلوب', variant: 'destructive' })
      return
    }
    const cost = parseFloat(damageEstimatedCost)
    if (isNaN(cost) || cost < 0) {
      toast({ title: 'أدخل تكلفة تقديرية صحيحة (≥ 0)', variant: 'destructive' })
      return
    }
    setDamageSubmitting(true)
    try {
      const res = await fetch(`/api/portal/bookings/${bookingId}/report-damage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentId: damageEquipmentId || null,
          damageType: damageType as (typeof DAMAGE_TYPES)[number]['value'],
          severity: damageSeverity as (typeof SEVERITIES)[number]['value'],
          description: damageDescription.trim(),
          estimatedCost: cost,
          insuranceClaim: false,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: data.error ?? 'فشل إرسال البلاغ', variant: 'destructive' })
        return
      }
      toast({ title: data.message ?? 'تم تسجيل بلاغ الضرر' })
      setDamageOpen(false)
      setDamageDescription('')
      setDamageEstimatedCost('')
      setDamageEquipmentId('')
      router.refresh()
    } finally {
      setDamageSubmitting(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {canRequestChangeOrExtension && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setChangeOpen(true)}
              className="justify-start"
            >
              <Edit3 className="h-4 w-4 ml-2" />
              طلب تعديل
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const d = new Date(currentEndDate)
                d.setDate(d.getDate() + 1)
                setExtensionEndDate(d.toISOString().slice(0, 10))
                setExtensionOpen(true)
              }}
              className="justify-start"
            >
              <CalendarPlus className="h-4 w-4 ml-2" />
              طلب تمديد
            </Button>
          </>
        )}
        {showCancel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCancelOpen(true)}
            className="justify-start text-destructive hover:text-destructive"
            title={!canCancel ? cancelNotAllowedMessage : undefined}
            disabled={!canCancel}
          >
            <XCircle className="h-4 w-4 ml-2" />
            إلغاء الحجز
          </Button>
        )}
        {showReportDamage && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDamageOpen(true)}
            className="justify-start"
          >
            <AlertTriangle className="h-4 w-4 ml-2" />
            الإبلاغ عن ضرر
          </Button>
        )}
      </div>

      {/* Report Damage Dialog */}
      <Dialog open={damageOpen} onOpenChange={setDamageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>الإبلاغ عن ضرر</DialogTitle>
            <DialogDescription>
              اذكر نوع الضرر والتفاصيل والتكلفة التقديرية. قد يتم خصم المبلغ من العهدة بعد المراجعة.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {equipmentOptions.length > 0 && (
              <div className="space-y-2">
                <Label>المعدة (اختياري)</Label>
                <Select value={damageEquipmentId} onValueChange={setDamageEquipmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المعدة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— لا تحديد —</SelectItem>
                    {equipmentOptions.map((eq) => (
                      <SelectItem key={eq.id} value={eq.equipmentId}>
                        {eq.sku} {eq.model ? `- ${eq.model}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>نوع الضرر</Label>
              <Select value={damageType} onValueChange={setDamageType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAMAGE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>درجة الخطورة</Label>
              <Select value={damageSeverity} onValueChange={setDamageSeverity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="damage-desc">الوصف</Label>
              <Textarea
                id="damage-desc"
                value={damageDescription}
                onChange={(e) => setDamageDescription(e.target.value)}
                placeholder="وصف تفصيلي للضرر..."
                rows={4}
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="damage-cost">التكلفة التقديرية (ر.س)</Label>
              <Input
                id="damage-cost"
                type="number"
                min={0}
                step={0.01}
                value={damageEstimatedCost}
                onChange={(e) => setDamageEstimatedCost(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDamageOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleReportDamage} disabled={damageSubmitting}>
              {damageSubmitting ? 'جاري الإرسال...' : 'إرسال البلاغ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Change Dialog */}
      <Dialog open={changeOpen} onOpenChange={setChangeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>طلب تعديل الحجز</DialogTitle>
            <DialogDescription>
              اذكر سبب طلب التعديل وما التغييرات المطلوبة. سنراجع الطلب ونتواصل معك.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="change-reason">السبب والتفاصيل</Label>
              <Textarea
                id="change-reason"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="مثال: أحتاج تغيير تاريخ البداية أو إضافة معدة..."
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setChangeOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleRequestChange} disabled={changeSubmitting}>
              {changeSubmitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Extension Dialog */}
      <Dialog open={extensionOpen} onOpenChange={setExtensionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>طلب تمديد الحجز</DialogTitle>
            <DialogDescription>
              حدد تاريخ النهاية الجديد واذكر السبب. سيتم احتساب الفرق في السعر عند الموافقة.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="extension-end-date">تاريخ النهاية الجديد</Label>
              <Input
                id="extension-end-date"
                type="date"
                value={extensionEndDate}
                onChange={(e) => setExtensionEndDate(e.target.value)}
                min={minExtensionDate}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="extension-reason">السبب</Label>
              <Textarea
                id="extension-reason"
                value={extensionReason}
                onChange={(e) => setExtensionReason(e.target.value)}
                placeholder="مثال: أحتاج تمديد التصوير يومين إضافيين..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setExtensionOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleRequestExtension} disabled={extensionSubmitting}>
              {extensionSubmitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel AlertDialog */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد إلغاء الحجز</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من إلغاء هذا الحجز؟ يمكنك ذكر سبب اختياري أدناه.
              {cancelNotAllowedMessage && !canCancel && (
                <span className="block mt-2 text-destructive">{cancelNotAllowedMessage}</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="cancel-reason" className="text-muted-foreground text-sm">
              السبب (اختياري)
            </Label>
            <Input
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="سبب الإلغاء"
              className="mt-1"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>تراجع</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleCancel()
              }}
              disabled={cancelSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelSubmitting ? 'جاري الإلغاء...' : 'نعم، إلغاء الحجز'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
