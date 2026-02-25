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
import { ArrowRight, MessageSquare, Send, Loader2 } from 'lucide-react'

interface Config {
  channel: string
  id: string | null
  isEnabled: boolean
  businessPhone: string | null
  config: { phoneNumberId?: string; businessAccountId?: string; accessToken?: string; verifyToken?: string } | null
}

export default function WhatsAppSettingsPage() {
  const { toast } = useToast()
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const [testSending, setTestSending] = useState(false)
  const [form, setForm] = useState({
    phoneNumberId: '',
    businessAccountId: '',
    accessToken: '',
    verifyToken: '',
    businessPhone: '',
  })

  async function fetchConfig() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/messaging/config')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Failed to load')
      const list = json.configs ?? []
      const whatsapp = list.find((c: { channel: string }) => c.channel === 'WHATSAPP')
      if (whatsapp) {
        setConfig(whatsapp)
        const c = (whatsapp.config ?? {}) as Record<string, string>
        setForm({
          phoneNumberId: c.phoneNumberId ?? '',
          businessAccountId: c.businessAccountId ?? '',
          accessToken: c.accessToken ?? '',
          verifyToken: c.verifyToken ?? '',
          businessPhone: whatsapp.businessPhone ?? '',
        })
      } else {
        setConfig({ channel: 'WHATSAPP', id: null, isEnabled: false, businessPhone: null, config: null })
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
        body: JSON.stringify({ channel: 'WHATSAPP', isEnabled: enabled }),
      })
      if (!res.ok) throw new Error('Failed to update')
      setConfig((p) => (p ? { ...p, isEnabled: enabled } : null))
      toast({ title: 'تم', description: enabled ? 'تم تفعيل واتساب' : 'تم إيقاف واتساب' })
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
          channel: 'WHATSAPP',
          config: {
            phoneNumberId: form.phoneNumberId || undefined,
            businessAccountId: form.businessAccountId || undefined,
            accessToken: form.accessToken || undefined,
            verifyToken: form.verifyToken || undefined,
          },
          businessPhone: form.businessPhone || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast({ title: 'تم', description: 'تم حفظ إعدادات واتساب' })
    } catch {
      toast({ title: 'خطأ', description: 'فشل الحفظ', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleTestSend() {
    if (!testPhone.trim()) {
      toast({ title: 'أدخل رقم الهاتف', variant: 'destructive' })
      return
    }
    setTestSending(true)
    try {
      const res = await fetch('/api/admin/messaging/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'WHATSAPP',
          to: testPhone.trim(),
          body: 'رسالة تجريبية من FlixCam – مركز الرسائل.',
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
            <ArrowRight className="ml-2 h-4 w-4" />
            مركز الرسائل
          </Link>
        </Button>
      </div>
      <div className="flex items-center gap-3">
        <MessageSquare className="h-8 w-8" />
        <div>
          <h1 className="text-2xl font-bold">إعدادات واتساب</h1>
          <p className="text-muted-foreground">Meta WhatsApp Business API – تفعيل وإعداد الحساب</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>التفعيل</CardTitle>
            <CardDescription>إيقاف التشغيل يمنع إرسال أي رسائل واتساب</CardDescription>
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
          <CardTitle>بيانات الحساب</CardTitle>
          <CardDescription>
            من تطبيق Meta for Developers – WhatsApp &gt; API Setup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Phone Number ID</Label>
              <Input
                value={form.phoneNumberId}
                onChange={(e) => setForm((f) => ({ ...f, phoneNumberId: e.target.value }))}
                placeholder="رقم معرف الهاتف"
              />
            </div>
            <div>
              <Label>Business Account ID</Label>
              <Input
                value={form.businessAccountId}
                onChange={(e) => setForm((f) => ({ ...f, businessAccountId: e.target.value }))}
                placeholder="معرف حساب الأعمال"
              />
            </div>
          </div>
          <div>
            <Label>Access Token</Label>
            <Input
              type="password"
              value={form.accessToken}
              onChange={(e) => setForm((f) => ({ ...f, accessToken: e.target.value }))}
              placeholder="رمز الوصول"
            />
          </div>
          <div>
            <Label>Verify Token (للمسار webhook)</Label>
            <Input
              value={form.verifyToken}
              onChange={(e) => setForm((f) => ({ ...f, verifyToken: e.target.value }))}
              placeholder="رمز التحقق"
            />
          </div>
          <div>
            <Label>رقم الهاتف (للعرض)</Label>
            <Input
              value={form.businessPhone}
              onChange={(e) => setForm((f) => ({ ...f, businessPhone: e.target.value }))}
              placeholder="+966..."
            />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
            حفظ
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>إرسال تجريبي</CardTitle>
          <CardDescription>أرسل رسالة واتساب إلى رقمك للتحقق من الإعداد</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            placeholder="+9665xxxxxxxx"
            className="max-w-xs"
          />
          <Button onClick={handleTestSend} disabled={testSending}>
            {testSending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Send className="ml-2 h-4 w-4" />}
            إرسال تجريبي
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
