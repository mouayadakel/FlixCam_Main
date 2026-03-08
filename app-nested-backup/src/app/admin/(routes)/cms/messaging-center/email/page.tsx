'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { ArrowRight, Mail, Send, Loader2 } from 'lucide-react'

interface Config {
  channel: string
  id: string | null
  isEnabled: boolean
  businessPhone: string | null
  config: Record<string, unknown> | null
}

export default function EmailSettingsPage() {
  const { toast } = useToast()
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testSending, setTestSending] = useState(false)
  const [form, setForm] = useState({
    fromAddress: '',
    fromName: '',
    replyTo: '',
  })

  async function fetchConfig() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/messaging/config')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Failed to load')
      const list = json.configs ?? []
      const emailConfig = list.find((c: { channel: string }) => c.channel === 'EMAIL')
      if (emailConfig) {
        setConfig(emailConfig)
        const c = (emailConfig.config ?? {}) as Record<string, string>
        setForm({
          fromAddress: c.fromAddress ?? '',
          fromName: c.fromName ?? '',
          replyTo: c.replyTo ?? '',
        })
      } else {
        setConfig({ channel: 'EMAIL', id: null, isEnabled: false, businessPhone: null, config: null })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل تحميل الإعدادات', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  async function handleToggle(enabled: boolean) {
    setToggling(true)
    try {
      const res = await fetch('/api/admin/messaging/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: 'EMAIL', isEnabled: enabled }),
      })
      if (!res.ok) throw new Error('Failed to update')
      setConfig((p) => (p ? { ...p, isEnabled: enabled } : null))
      toast({ title: 'تم', description: enabled ? 'تم تفعيل البريد' : 'تم إيقاف البريد' })
    } catch {
      toast({ title: 'خطأ', description: 'فشل التحديث', variant: 'destructive' })
    } finally {
      setToggling(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/messaging/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'EMAIL',
          config: {
            fromAddress: form.fromAddress || undefined,
            fromName: form.fromName || undefined,
            replyTo: form.replyTo || undefined,
          },
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast({ title: 'تم', description: 'تم حفظ إعدادات البريد' })
    } catch {
      toast({ title: 'خطأ', description: 'فشل الحفظ', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleTestSend() {
    if (!testEmail.trim()) {
      toast({ title: 'أدخل البريد الإلكتروني', variant: 'destructive' })
      return
    }
    setTestSending(true)
    try {
      const res = await fetch('/api/admin/messaging/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'EMAIL',
          to: testEmail.trim(),
          subject: 'رسالة تجريبية – FlixCam',
          body: 'هذه رسالة تجريبية من مركز الرسائل.',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to send')
      toast({ title: 'تم', description: 'تم إرسال الرسالة التجريبية' })
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل الإرسال',
        variant: 'destructive',
      })
    } finally {
      setTestSending(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6" dir="rtl">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/cms/messaging-center">
            <ArrowRight className="ms-2 h-4 w-4" />
            مركز الرسائل
          </Link>
        </Button>
      </div>
      <div className="flex items-center gap-3">
        <Mail className="h-8 w-8" />
        <div>
          <h1 className="text-2xl font-bold">إعدادات البريد الإلكتروني</h1>
          <p className="text-muted-foreground">Resend / SMTP – تفعيل وإعداد المرسل</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>التفعيل</CardTitle>
            <CardDescription>إيقاف التشغيل يمنع إرسال أي بريد من النظام</CardDescription>
          </div>
          <Switch
            checked={config?.isEnabled ?? false}
            onCheckedChange={handleToggle}
            disabled={toggling}
          />
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>المرسل (من)</CardTitle>
          <CardDescription>
            يُستخدم من متغيرات البيئة أيضاً (RESEND_FROM, RESEND_FROM_NAME)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>عنوان البريد (From)</Label>
            <Input
              value={form.fromAddress}
              onChange={(e) => setForm((f) => ({ ...f, fromAddress: e.target.value }))}
              placeholder="noreply@flixcam.rent"
            />
          </div>
          <div>
            <Label>الاسم (From Name)</Label>
            <Input
              value={form.fromName}
              onChange={(e) => setForm((f) => ({ ...f, fromName: e.target.value }))}
              placeholder="FlixCam.rent"
            />
          </div>
          <div>
            <Label>Reply-To (اختياري)</Label>
            <Input
              value={form.replyTo}
              onChange={(e) => setForm((f) => ({ ...f, replyTo: e.target.value }))}
              placeholder="support@flixcam.rent"
            />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="ms-2 h-4 w-4 animate-spin" /> : null}
            حفظ
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>إرسال تجريبي</CardTitle>
          <CardDescription>أرسل بريداً تجريبياً للتحقق من الإعداد</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="your@email.com"
            className="max-w-xs"
          />
          <Button onClick={handleTestSend} disabled={testSending}>
            {testSending ? <Loader2 className="ms-2 h-4 w-4 animate-spin" /> : <Send className="ms-2 h-4 w-4" />}
            إرسال تجريبي
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
