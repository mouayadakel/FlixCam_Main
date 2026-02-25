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
  BUSINESS_RECIPIENT_ROLE_LABELS,
  NOTIFICATION_TRIGGERS_GROUPED,
} from '@/lib/constants/messaging'

interface RecipientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipientId: string | null
  onSuccess: () => void
}

interface RecipientFormData {
  name: string
  arabicName: string
  englishName: string
  role: string
  department: string
  jobTitle: string
  phone: string
  email: string
  whatsappNumber: string
  preferredChannel: string
  preferredLanguage: string
  receiveTriggers: string[]
  isActive: boolean
  priority: number
  receiveUrgent: boolean
  receiveLate: boolean
  receiveDamage: boolean
  dndEnabled: boolean
  dndStart: string
  dndEnd: string
  digestEnabled: boolean
  digestFrequency: string
  digestTime: string
  isPrimary: boolean
  isBackup: boolean
}

const DEFAULT_FORM: RecipientFormData = {
  name: '',
  arabicName: '',
  englishName: '',
  role: 'WAREHOUSE_MANAGER',
  department: '',
  jobTitle: '',
  phone: '',
  email: '',
  whatsappNumber: '',
  preferredChannel: '',
  preferredLanguage: 'ar',
  receiveTriggers: [],
  isActive: true,
  priority: 5,
  receiveUrgent: true,
  receiveLate: true,
  receiveDamage: true,
  dndEnabled: false,
  dndStart: '',
  dndEnd: '',
  digestEnabled: false,
  digestFrequency: '',
  digestTime: '',
  isPrimary: false,
  isBackup: false,
}

export function RecipientDialog({
  open,
  onOpenChange,
  recipientId,
  onSuccess,
}: RecipientDialogProps) {
  const { toast } = useToast()
  const [form, setForm] = useState<RecipientFormData>(DEFAULT_FORM)
  const [loading, setLoading] = useState(false)

  const isEdit = !!recipientId

  useEffect(() => {
    if (open && recipientId) {
      setLoading(true)
      fetch(`/api/admin/messaging/recipients/${recipientId}`)
        .then((r) => r.json())
        .then((data) => {
          const rec = data.recipient
          if (rec) {
            setForm({
              name: rec.name ?? '',
              arabicName: rec.arabicName ?? '',
              englishName: rec.englishName ?? '',
              role: rec.role ?? 'WAREHOUSE_MANAGER',
              department: rec.department ?? '',
              jobTitle: rec.jobTitle ?? '',
              phone: rec.phone ?? '',
              email: rec.email ?? '',
              whatsappNumber: rec.whatsappNumber ?? '',
              preferredChannel: rec.preferredChannel ?? '',
              preferredLanguage: rec.preferredLanguage ?? 'ar',
              receiveTriggers: Array.isArray(rec.receiveTriggers) ? rec.receiveTriggers : [],
              isActive: rec.isActive ?? true,
              priority: rec.priority ?? 5,
              receiveUrgent: rec.receiveUrgent ?? true,
              receiveLate: rec.receiveLate ?? true,
              receiveDamage: rec.receiveDamage ?? true,
              dndEnabled: rec.dndEnabled ?? false,
              dndStart: rec.dndStart ?? '',
              dndEnd: rec.dndEnd ?? '',
              digestEnabled: rec.digestEnabled ?? false,
              digestFrequency: rec.digestFrequency ?? '',
              digestTime: rec.digestTime ?? '',
              isPrimary: rec.isPrimary ?? false,
              isBackup: rec.isBackup ?? false,
            })
          }
        })
        .catch(() =>
          toast({ title: 'خطأ', description: 'فشل تحميل المستلم', variant: 'destructive' })
        )
        .finally(() => setLoading(false))
    } else if (open && !recipientId) {
      setForm(DEFAULT_FORM)
    }
  }, [open, recipientId, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast({ title: 'خطأ', description: 'الاسم مطلوب', variant: 'destructive' })
      return
    }
    if (!form.phone && !form.email && !form.whatsappNumber) {
      toast({
        title: 'خطأ',
        description: 'يجب إدخال واحد على الأقل: الهاتف، البريد، أو واتساب',
        variant: 'destructive',
      })
      return
    }

    const payload = {
      name: form.name.trim(),
      arabicName: form.arabicName.trim() || null,
      englishName: form.englishName.trim() || null,
      role: form.role,
      department: form.department.trim() || null,
      jobTitle: form.jobTitle.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      whatsappNumber: form.whatsappNumber.trim() || null,
      preferredChannel: form.preferredChannel || null,
      preferredLanguage: form.preferredLanguage,
      receiveTriggers:
        form.receiveTriggers.length > 0 ? form.receiveTriggers : null,
      isActive: form.isActive,
      priority: form.priority,
      receiveUrgent: form.receiveUrgent,
      receiveLate: form.receiveLate,
      receiveDamage: form.receiveDamage,
      dndEnabled: form.dndEnabled,
      dndStart: form.dndStart || null,
      dndEnd: form.dndEnd || null,
      digestEnabled: form.digestEnabled,
      digestFrequency: form.digestFrequency || null,
      digestTime: form.digestTime || null,
      isPrimary: form.isPrimary,
      isBackup: form.isBackup,
    }

    setLoading(true)
    try {
      const url = isEdit
        ? `/api/admin/messaging/recipients/${recipientId}`
        : '/api/admin/messaging/recipients'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      toast({ title: 'تم', description: isEdit ? 'تم تحديث المستلم' : 'تم إضافة المستلم' })
      onOpenChange(false)
      onSuccess()
    } catch {
      toast({ title: 'خطأ', description: 'فشل الحفظ', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const toggleTrigger = (t: string) => {
    setForm((prev) => ({
      ...prev,
      receiveTriggers: prev.receiveTriggers.includes(t)
        ? prev.receiveTriggers.filter((tr) => tr !== t)
        : [...prev.receiveTriggers, t],
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'تعديل المستلم' : 'إضافة مستلم جديد'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'تعديل بيانات المستلم الداخلي' : 'إضافة مستلم داخلي جديد'}
          </DialogDescription>
        </DialogHeader>

        {loading && !form.name ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">الاسم *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="محمد أحمد العلي"
                maxLength={120}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="arabicName">الاسم بالعربية</Label>
                <Input
                  id="arabicName"
                  value={form.arabicName}
                  onChange={(e) => setForm((p) => ({ ...p, arabicName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="englishName">الاسم بالإنجليزية</Label>
                <Input
                  id="englishName"
                  value={form.englishName}
                  onChange={(e) => setForm((p) => ({ ...p, englishName: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>الدور الوظيفي *</Label>
              <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BUSINESS_RECIPIENT_ROLE_LABELS).map(([val, lbl]) => (
                    <SelectItem key={val} value={val}>
                      {lbl.ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">القسم</Label>
                <Input
                  id="department"
                  value={form.department}
                  onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                  placeholder="إدارة العمليات"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobTitle">المسمى الوظيفي</Label>
                <Input
                  id="jobTitle"
                  value={form.jobTitle}
                  onChange={(e) => setForm((p) => ({ ...p, jobTitle: e.target.value }))}
                  placeholder="مشرف المعدات"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>معلومات الاتصال * (واحد على الأقل)</Label>
              <div className="space-y-2">
                <Input
                  placeholder="+966501234567"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                />
                <Input
                  type="email"
                  placeholder="email@company.com"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                />
                <Input
                  placeholder="واتساب +966501234567"
                  value={form.whatsappNumber}
                  onChange={(e) => setForm((p) => ({ ...p, whatsappNumber: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>القناة المفضلة</Label>
              <Select
                value={form.preferredChannel || 'auto'}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, preferredChannel: v === 'auto' ? '' : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="تلقائي" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">تلقائي</SelectItem>
                  {CHANNEL_OPTIONS.map((ch) => (
                    <SelectItem key={ch.value} value={ch.value}>
                      {ch.label.ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>اللغة المفضلة</Label>
              <Select
                value={form.preferredLanguage}
                onValueChange={(v) => setForm((p) => ({ ...p, preferredLanguage: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>الأحداث المستلمة (فارغ = كل الأحداث)</Label>
              <div className="max-h-32 overflow-y-auto rounded-md border p-2">
                {NOTIFICATION_TRIGGERS_GROUPED.map((g) => (
                  <div key={g.group} className="mb-2">
                    <div className="text-xs font-medium text-muted-foreground">{g.group}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {g.triggers.map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => toggleTrigger(t.value)}
                          className={`rounded px-2 py-0.5 text-xs ${
                            form.receiveTriggers.includes(t.value)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted hover:bg-muted/80'
                          }`}
                        >
                          {t.label.ar}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>الأولوية (1-10)</Label>
              <Slider
                value={[form.priority]}
                onValueChange={([v]) => setForm((p) => ({ ...p, priority: v ?? 5 }))}
                min={1}
                max={10}
                step={1}
              />
              <span className="text-xs text-muted-foreground">{form.priority}</span>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>مستلم نشط</Label>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>مستلم رئيسي</Label>
                <Switch
                  checked={form.isPrimary}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, isPrimary: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>استلام العاجل دائماً</Label>
                <Switch
                  checked={form.receiveUrgent}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, receiveUrgent: v }))}
                />
              </div>
            </div>

            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium">
                أوقات عدم الإزعاج والملخص
                <ChevronDown className="h-4 w-4" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Label>تفعيل عدم الإزعاج</Label>
                  <Switch
                    checked={form.dndEnabled}
                    onCheckedChange={(v) => setForm((p) => ({ ...p, dndEnabled: v }))}
                  />
                </div>
                {form.dndEnabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>من</Label>
                      <Input
                        type="time"
                        value={form.dndStart}
                        onChange={(e) => setForm((p) => ({ ...p, dndStart: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>إلى</Label>
                      <Input
                        type="time"
                        value={form.dndEnd}
                        onChange={(e) => setForm((p) => ({ ...p, dndEnd: e.target.value }))}
                      />
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <Label>تفعيل الملخص الدوري</Label>
                  <Switch
                    checked={form.digestEnabled}
                    onCheckedChange={(v) => setForm((p) => ({ ...p, digestEnabled: v }))}
                  />
                </div>
                {form.digestEnabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>تكرار الملخص</Label>
                      <Select
                        value={form.digestFrequency}
                        onValueChange={(v) => setForm((p) => ({ ...p, digestFrequency: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HOURLY">كل ساعة</SelectItem>
                          <SelectItem value="DAILY">يومي</SelectItem>
                          <SelectItem value="WEEKLY">أسبوعي</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>وقت الإرسال</Label>
                      <Input
                        type="time"
                        value={form.digestTime}
                        onChange={(e) => setForm((p) => ({ ...p, digestTime: e.target.value }))}
                      />
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
                {isEdit ? 'حفظ' : 'إضافة'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
