/**
 * @file page.tsx
 * @description Notification templates – list, create, edit (trigger, channel, subject/body)
 * @module app/admin/(routes)/settings/notification-templates
 */

'use client'

import { useState, useEffect } from 'react'
import { Mail, Plus, Edit, Trash2, RefreshCw, Eye } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Skeleton } from '@/components/ui/skeleton'

const TRIGGERS = [
  'BOOKING_CONFIRMED',
  'BOOKING_REMINDER',
  'PAYMENT_RECEIVED',
  'PAYMENT_FAILED',
  'EQUIPMENT_READY',
  'DELIVERY_SCHEDULED',
  'RETURN_REMINDER',
  'RETURN_OVERDUE',
  'DAMAGE_CLAIM_FILED',
  'INVOICE_SENT',
  'REVIEW_REQUEST',
] as const

const CHANNELS = ['EMAIL', 'SMS', 'IN_APP', 'WHATSAPP'] as const

interface Template {
  id: string
  name: string
  slug: string
  description: string | null
  trigger: string
  channel: string
  subject: string | null
  bodyText: string
  bodyHtml: string | null
  variables: string[] | null
  isActive: boolean
  language: string
  variant: string | null
  createdAt: string
  updatedAt: string
}

export default function NotificationTemplatesPage() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [triggerFilter, setTriggerFilter] = useState<string>('all')
  const [channelFilter, setChannelFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [previewResult, setPreviewResult] = useState<{
    subject: string | null
    bodyText: string
    bodyHtml: string | null
  } | null>(null)
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    trigger: '' as string,
    channel: '' as string,
    subject: '',
    bodyText: '',
    bodyHtml: '',
    isActive: true,
    language: 'en',
  })

  useEffect(() => {
    loadTemplates()
  }, [triggerFilter, channelFilter])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (triggerFilter !== 'all') params.set('trigger', triggerFilter)
      if (channelFilter !== 'all') params.set('channel', channelFilter)
      const res = await fetch(`/api/notification-templates?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load templates')
      const data = await res.json()
      setTemplates(data.templates ?? [])
    } catch {
      toast({ title: 'خطأ', description: 'فشل تحميل القوالب', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditingId(null)
    setForm({
      name: '',
      slug: '',
      description: '',
      trigger: '',
      channel: '',
      subject: '',
      bodyText:
        'Hello {{customerName}},\n\nYour booking {{bookingId}} is confirmed.\n\nTotal: {{totalAmount}}',
      bodyHtml: '',
      isActive: true,
      language: 'en',
    })
    setDialogOpen(true)
  }

  const openEdit = (t: Template) => {
    setEditingId(t.id)
    setForm({
      name: t.name,
      slug: t.slug,
      description: t.description ?? '',
      trigger: t.trigger,
      channel: t.channel,
      subject: t.subject ?? '',
      bodyText: t.bodyText,
      bodyHtml: t.bodyHtml ?? '',
      isActive: t.isActive,
      language: t.language,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.trigger || !form.channel || !form.bodyText.trim()) {
      toast({
        title: 'تحقق',
        description: 'الاسم والمشغّل والقناة والنص مطلوبة',
        variant: 'destructive',
      })
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name || form.slug || form.trigger,
        slug: form.slug || form.trigger.toLowerCase().replace(/_/g, '-'),
        description: form.description || null,
        trigger: form.trigger,
        channel: form.channel,
        subject: form.subject || null,
        bodyText: form.bodyText,
        bodyHtml: form.bodyHtml || null,
        isActive: form.isActive,
        language: form.language,
      }
      if (editingId) {
        const res = await fetch(`/api/notification-templates/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Failed to update')
        toast({ title: 'تم', description: 'تم تحديث القالب' })
      } else {
        const res = await fetch('/api/notification-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Failed to create')
        toast({ title: 'تم', description: 'تم إنشاء القالب' })
      }
      setDialogOpen(false)
      loadTemplates()
    } catch {
      toast({ title: 'خطأ', description: 'فشل حفظ القالب', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/notification-templates/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast({ title: 'تم', description: 'تم حذف القالب' })
      setDeleteId(null)
      loadTemplates()
    } catch {
      toast({ title: 'خطأ', description: 'فشل حذف القالب', variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  const handlePreview = async () => {
    const templateId = editingId || (form.slug ? undefined : null)
    const slug = form.slug || undefined
    if (!templateId && !slug) {
      setPreviewResult({
        subject: form.subject || null,
        bodyText: form.bodyText.replace(/\{\{(\w+)\}\}/g, (_, k) => {
          const d: Record<string, string> = {
            customerName: 'Ahmed',
            bookingId: 'BK-001',
            totalAmount: '500 SAR',
          }
          return d[k] ?? `{{${k}}}`
        }),
        bodyHtml: form.bodyHtml || null,
      })
      setPreviewOpen(true)
      return
    }
    try {
      const res = await fetch('/api/notification-templates/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: templateId || undefined,
          slug: slug || undefined,
          language: form.language,
          data: { customerName: 'Ahmed', bookingId: 'BK-001', totalAmount: '500 SAR' },
        }),
      })
      if (!res.ok) throw new Error('Preview failed')
      const data = await res.json()
      setPreviewResult({ subject: data.subject, bodyText: data.bodyText, bodyHtml: data.bodyHtml })
      setPreviewOpen(true)
    } catch {
      setPreviewResult({
        subject: form.subject || null,
        bodyText: form.bodyText.replace(/\{\{(\w+)\}\}/g, (_, k) => {
          const d: Record<string, string> = {
            customerName: 'Ahmed',
            bookingId: 'BK-001',
            totalAmount: '500 SAR',
          }
          return d[k] ?? `{{${k}}}`
        }),
        bodyHtml: form.bodyHtml || null,
      })
      setPreviewOpen(true)
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <Mail className="h-8 w-8" />
            قوالب الإشعارات
          </h1>
          <p className="mt-1 text-muted-foreground">
            قوالب البريد والرسائل النصية وإشعارات التطبيق مع متغيرات (مثل {`{{customerName}}`})
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadTemplates}>
            <RefreshCw className="ms-2 h-4 w-4" />
            تحديث
          </Button>
          <Button onClick={openCreate}>
            <Plus className="ms-2 h-4 w-4" />
            إضافة قالب
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>القوالب</CardTitle>
          <CardDescription>
            فلتر حسب المشغّل والقناة. استخدم متغيرات في النص: {`{{customerName}}`}،{' '}
            {`{{bookingId}}`}، {`{{totalAmount}}`}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4">
            <Select value={triggerFilter} onValueChange={setTriggerFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="المشغّل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المشغّلات</SelectItem>
                {TRIGGERS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="القناة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل القنوات</SelectItem>
                {CHANNELS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>المشغّل</TableHead>
                  <TableHead>القناة</TableHead>
                  <TableHead>اللغة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="w-[140px]">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ) : templates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      لا توجد قوالب
                    </TableCell>
                  </TableRow>
                ) : (
                  templates.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{t.trigger}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{t.channel}</Badge>
                      </TableCell>
                      <TableCell>{t.language}</TableCell>
                      <TableCell>
                        {t.isActive ? (
                          <Badge className="bg-green-100 text-green-800">مفعّل</Badge>
                        ) : (
                          <Badge variant="secondary">معطّل</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteId(t.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'تعديل القالب' : 'قالب جديد'}</DialogTitle>
            <DialogDescription>
              الموضوع يستخدم للبريد. النص يدعم متغيرات مثل {`{{customerName}}`}، {`{{bookingId}}`}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">الاسم</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="اسم القالب"
                />
              </div>
              <div>
                <label className="text-sm font-medium">المعرّف (فريد لكل لغة)</label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="booking-confirmed"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">المشغّل</label>
                <Select
                  value={form.trigger}
                  onValueChange={(v) => setForm((f) => ({ ...f, trigger: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المشغّل" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGERS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">القناة</label>
                <Select
                  value={form.channel}
                  onValueChange={(v) => setForm((f) => ({ ...f, channel: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر القناة" />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">الموضوع (للبريد)</label>
              <Input
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="Booking {{bookingId}} confirmed"
              />
            </div>
            <div>
              <label className="text-sm font-medium">النص</label>
              <Textarea
                value={form.bodyText}
                onChange={(e) => setForm((f) => ({ ...f, bodyText: e.target.value }))}
                rows={6}
                placeholder="Hello {{customerName}}..."
                className="font-mono text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
              <span className="text-sm">مفعّل</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handlePreview}>
              <Eye className="ms-2 h-4 w-4" /> معاينة
            </Button>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>معاينة</DialogTitle>
            <DialogDescription>تم العرض ببيانات تجريبية</DialogDescription>
          </DialogHeader>
          {previewResult && (
            <div className="space-y-2 text-sm">
              {previewResult.subject != null && (
                <p>
                  <strong>الموضوع:</strong> {previewResult.subject}
                </p>
              )}
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-muted p-3">
                {previewResult.bodyText}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف القالب؟</AlertDialogTitle>
            <AlertDialogDescription>لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground"
            >
              {deleting ? 'جاري الحذف...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
