'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useToast } from '@/hooks/use-toast'
import { Loader2, ChevronDown } from 'lucide-react'
import {
  CHANNEL_OPTIONS,
  RECIPIENT_TYPE_LABELS,
  NOTIFICATION_TRIGGERS_GROUPED,
} from '@/lib/constants/messaging'

interface AutomationRuleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ruleId: string | null
  onSuccess: () => void
}

interface RuleFormData {
  name: string
  description: string
  trigger: string
  triggerDelay: number
  channels: string[]
  templateId: string
  sendWindowStart: string
  sendWindowEnd: string
  recipientType: string
  isActive: boolean
  priority: number
  conditions: string
  maxRetries: number
  retryDelay: number
  allowDuplicates: boolean
}

const DEFAULT_FORM: RuleFormData = {
  name: '',
  description: '',
  trigger: '',
  triggerDelay: 0,
  channels: [],
  templateId: '',
  sendWindowStart: '',
  sendWindowEnd: '',
  recipientType: 'CUSTOMER',
  isActive: true,
  priority: 50,
  conditions: '{}',
  maxRetries: 3,
  retryDelay: 5,
  allowDuplicates: false,
}

export function AutomationRuleDialog({
  open,
  onOpenChange,
  ruleId,
  onSuccess,
}: AutomationRuleDialogProps) {
  const { toast } = useToast()
  const [form, setForm] = useState<RuleFormData>(DEFAULT_FORM)
  const [templates, setTemplates] = useState<{ id: string; name: string; trigger: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  const isEdit = !!ruleId

  useEffect(() => {
    if (open) {
      setLoadingTemplates(true)
      fetch('/api/notification-templates')
        .then((r) => r.json())
        .then((data) => {
          setTemplates(data.templates ?? [])
        })
        .finally(() => setLoadingTemplates(false))
    }
  }, [open])

  useEffect(() => {
    if (open && ruleId) {
      setLoading(true)
      fetch(`/api/admin/messaging/automation-rules/${ruleId}`)
        .then((r) => r.json())
        .then((data) => {
          const r = data.rule
          if (r) {
            const sw = r.sendWindow as { start?: string; end?: string } | null
            setForm({
              name: r.name ?? '',
              description: r.description ?? '',
              trigger: r.trigger ?? '',
              triggerDelay: r.triggerDelay ?? r.delayMinutes ?? 0,
              channels: Array.isArray(r.channels) ? r.channels : [],
              templateId: r.templateId ?? '',
              sendWindowStart: sw?.start ?? '',
              sendWindowEnd: sw?.end ?? '',
              recipientType: r.recipientType ?? 'CUSTOMER',
              isActive: r.isActive ?? true,
              priority: r.priority ?? 50,
              conditions:
                typeof r.conditions === 'string'
                  ? r.conditions
                  : JSON.stringify(r.conditions ?? {}, null, 2),
              maxRetries: r.maxRetries ?? 3,
              retryDelay: r.retryDelay ?? 5,
              allowDuplicates: r.allowDuplicates ?? false,
            })
          }
        })
        .catch(() => toast({ title: 'خطأ', description: 'فشل تحميل القاعدة', variant: 'destructive' }))
        .finally(() => setLoading(false))
    } else if (open && !ruleId) {
      setForm(DEFAULT_FORM)
    }
  }, [open, ruleId, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast({ title: 'خطأ', description: 'اسم القاعدة مطلوب', variant: 'destructive' })
      return
    }
    if (!form.trigger) {
      toast({ title: 'خطأ', description: 'المشغل مطلوب', variant: 'destructive' })
      return
    }
    if (form.channels.length === 0) {
      toast({ title: 'خطأ', description: 'اختر قناة واحدة على الأقل', variant: 'destructive' })
      return
    }

    let conditionsObj: Record<string, unknown> | null = null
    if (form.conditions.trim()) {
      try {
        conditionsObj = JSON.parse(form.conditions) as Record<string, unknown>
      } catch {
        toast({ title: 'خطأ', description: 'صيغة الشروط JSON غير صحيحة', variant: 'destructive' })
        return
      }
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      trigger: form.trigger,
      triggerDelay: form.triggerDelay,
      channels: form.channels,
      templateId: form.templateId || null,
      sendWindow:
        form.sendWindowStart && form.sendWindowEnd
          ? { start: form.sendWindowStart, end: form.sendWindowEnd }
          : null,
      recipientType: form.recipientType,
      isActive: form.isActive,
      priority: form.priority,
      conditions: conditionsObj,
      maxRetries: form.maxRetries,
      retryDelay: form.retryDelay,
      allowDuplicates: form.allowDuplicates,
    }

    setLoading(true)
    try {
      const url = isEdit
        ? `/api/admin/messaging/automation-rules/${ruleId}`
        : '/api/admin/messaging/automation-rules'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      toast({ title: 'تم', description: isEdit ? 'تم تحديث القاعدة' : 'تم إنشاء القاعدة' })
      onOpenChange(false)
      onSuccess()
    } catch {
      toast({ title: 'خطأ', description: 'فشل الحفظ', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const toggleChannel = (ch: string) => {
    setForm((prev) => ({
      ...prev,
      channels: prev.channels.includes(ch)
        ? prev.channels.filter((c) => c !== ch)
        : [...prev.channels, ch],
    }))
  }

  const filteredTemplates = form.trigger
    ? templates.filter((t) => t.trigger === form.trigger)
    : templates

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'تعديل القاعدة' : 'إضافة قاعدة جديدة'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'تعديل إعدادات قاعدة الأتمتة' : 'إنشاء قاعدة أتمتة جديدة'}
          </DialogDescription>
        </DialogHeader>

        {loading && !form.name ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">اسم القاعدة *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="مثال: تذكير قبل الاستلام 24 ساعة"
                maxLength={120}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">الوصف (اختياري)</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="وصف مختصر..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>المشغل *</Label>
              <Select
                value={form.trigger}
                onValueChange={(v) => setForm((p) => ({ ...p, trigger: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الحدث" />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_TRIGGERS_GROUPED.map((g) => (
                    <div key={g.group}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        {g.group}
                      </div>
                      {g.triggers.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label.ar}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="triggerDelay">التأخير قبل الإرسال (دقيقة)</Label>
              <Input
                id="triggerDelay"
                type="number"
                min={0}
                value={form.triggerDelay}
                onChange={(e) =>
                  setForm((p) => ({ ...p, triggerDelay: parseInt(e.target.value, 10) || 0 }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>قنوات الإرسال *</Label>
              <div className="flex flex-wrap gap-2">
                {CHANNEL_OPTIONS.map((ch) => (
                  <button
                    key={ch.value}
                    type="button"
                    onClick={() => toggleChannel(ch.value)}
                    className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                      form.channels.includes(ch.value)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input hover:bg-muted'
                    }`}
                  >
                    {ch.label.ar}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>القالب (اختياري)</Label>
              <Select
                value={form.templateId || 'none'}
                onValueChange={(v) => setForm((p) => ({ ...p, templateId: v === 'none' ? '' : v }))}
                disabled={loadingTemplates}
              >
                <SelectTrigger>
                  <SelectValue placeholder="بدون قالب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون قالب</SelectItem>
                  {filteredTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.trigger})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sendWindowStart">نافذة الإرسال من</Label>
                <Input
                  id="sendWindowStart"
                  type="time"
                  value={form.sendWindowStart}
                  onChange={(e) => setForm((p) => ({ ...p, sendWindowStart: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sendWindowEnd">إلى</Label>
                <Input
                  id="sendWindowEnd"
                  type="time"
                  value={form.sendWindowEnd}
                  onChange={(e) => setForm((p) => ({ ...p, sendWindowEnd: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>نوع المستلمين</Label>
              <Select
                value={form.recipientType}
                onValueChange={(v) => setForm((p) => ({ ...p, recipientType: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RECIPIENT_TYPE_LABELS).map(([val, lbl]) => (
                    <SelectItem key={val} value={val}>
                      {lbl.ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>الأولوية (0-100)</Label>
              <Slider
                value={[form.priority]}
                onValueChange={([v]) => setForm((p) => ({ ...p, priority: v ?? 50 }))}
                min={0}
                max={100}
                step={1}
              />
              <span className="text-xs text-muted-foreground">{form.priority}</span>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">تفعيل القاعدة</Label>
              <Switch
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
              />
            </div>

            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium">
                إعدادات متقدمة
                <ChevronDown className="h-4 w-4" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="conditions">الشروط (JSON)</Label>
                  <Textarea
                    id="conditions"
                    value={form.conditions}
                    onChange={(e) => setForm((p) => ({ ...p, conditions: e.target.value }))}
                    placeholder='{"key": "value"}'
                    rows={3}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxRetries">عدد المحاولات</Label>
                    <Input
                      id="maxRetries"
                      type="number"
                      min={0}
                      max={10}
                      value={form.maxRetries}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, maxRetries: parseInt(e.target.value, 10) || 0 }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="retryDelay">التأخير بين المحاولات (دقيقة)</Label>
                    <Input
                      id="retryDelay"
                      type="number"
                      min={1}
                      value={form.retryDelay}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, retryDelay: parseInt(e.target.value, 10) || 5 }))
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="allowDuplicates">السماح بالإرسال المكرر</Label>
                  <Switch
                    id="allowDuplicates"
                    checked={form.allowDuplicates}
                    onCheckedChange={(v) => setForm((p) => ({ ...p, allowDuplicates: v }))}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
                {isEdit ? 'حفظ' : 'إنشاء'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
