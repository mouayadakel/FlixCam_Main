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
import { ArrowRight, MessageCircle, Send, Loader2 } from 'lucide-react'

interface Config {
  channel: string
  id: string | null
  isEnabled: boolean
  businessPhone: string | null
  config: Record<string, unknown> | null
}

export default function SmsSettingsPage() {
  const { toast } = useToast()
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const [testSending, setTestSending] = useState(false)
  const [form, setForm] = useState({
    accountSid: '',
    authToken: '',
    phoneNumber: '',
  })

  async function fetchConfig() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/messaging/config')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Failed to load')
      const list = json.configs ?? []
      const smsConfig = list.find((c: { channel: string }) => c.channel === 'SMS')
      if (smsConfig) {
        setConfig(smsConfig)
        const c = (smsConfig.config ?? {}) as Record<string, string>
        setForm({
          accountSid: c.accountSid ?? '',
          authToken: c.authToken ?? '',
          phoneNumber: c.phoneNumber ?? '',
        })
      } else {
        setConfig({ channel: 'SMS', id: null, isEnabled: false, businessPhone: null, config: null })
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
        body: JSON.stringify({ channel: 'SMS', isEnabled: enabled }),
      })
      if (!res.ok) throw new Error('Failed to update')
      setConfig((p) => (p ? { ...p, isEnabled: enabled } : null))
      toast({ title: 'تم', description: enabled ? 'تم تفعيل SMS' : 'تم إيقاف SMS' })
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
          channel: 'SMS',
          config: {
            accountSid: form.accountSid || undefined,
            authToken: form.authToken || undefined,
            phoneNumber: form.phoneNumber || undefined,
          },
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast({ title: 'تم', description: 'تم حفظ إعدادات SMS' })
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
          channel: 'SMS',
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
        <MessageCircle className="h-8 w-8" />
        <div>
          <h1 className="text-2xl font-bold">إعدادات SMS</h1>
          <p className="text-muted-foreground">Twilio – تفعيل وإعداد الإرسال</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>التفعيل</CardTitle>
            <CardDescription>إيقاف التشغيل يمنع إرسال أي رسائل SMS</CardDescription>
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
          <CardTitle>Twilio</CardTitle>
          <CardDescription>
            من لوحة تحكم Twilio – Account SID و Auth Token ورقم الإرسال
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Account SID</Label>
            <Input
              value={form.accountSid}
              onChange={(e) => setForm((f) => ({ ...f, accountSid: e.target.value }))}
              placeholder="AC..."
            />
          </div>
          <div>
            <Label>Auth Token</Label>
            <Input
              type="password"
              value={form.authToken}
              onChange={(e) => setForm((f) => ({ ...f, authToken: e.target.value }))}
              placeholder="رمز المصادقة"
            />
          </div>
          <div>
            <Label>رقم الإرسال (Twilio Phone Number)</Label>
            <Input
              value={form.phoneNumber}
              onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
              placeholder="+966..."
            />
          </div>
          <p className="text-xs text-muted-foreground">
            يمكن أيضاً تعيين TWILIO_ACCOUNT_SID و TWILIO_AUTH_TOKEN و TWILIO_PHONE_NUMBER في .env
          </p>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
            حفظ
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>إرسال تجريبي</CardTitle>
          <CardDescription>أرسل رسالة SMS إلى رقمك للتحقق من الإعداد</CardDescription>
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
