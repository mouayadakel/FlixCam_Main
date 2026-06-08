'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { MarketingSettingsEditor } from '@/components/admin/marketing-settings-editor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { Mail, Users, RefreshCw, CheckCircle2, XCircle, ArrowRight, Loader2, Send } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface McStatus {
  ok?: boolean
  listName?: string
  memberCount?: number
  totalLists?: number
  error?: string
}

interface SubscriberGrowthPoint {
  date: string
  count: number
}

// Derive subscriber growth from the marketing events API
// (Newsletter signups tracked as Lead or custom email_subscribe events)
function buildGrowthFromEvents(
  trends: Array<{ date: string; leads: number }>
): SubscriberGrowthPoint[] {
  let cumulative = 0
  return trends.map(t => {
    cumulative += t.leads
    return { date: t.date, count: cumulative }
  })
}

export default function MarketingEmailPage() {
  const { toast } = useToast()
  const [mc, setMc] = useState<McStatus>({})
  const [growth, setGrowth] = useState<SubscriberGrowthPoint[]>([])
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const testConnection = useCallback(async () => {
    setTesting(true)
    try {
      const res = await fetch('/api/admin/marketing/mailchimp/test')
      const data = await res.json() as McStatus
      setMc(data)
      if (data.ok) {
        toast({ title: 'Mailchimp متصل ✓', description: `القائمة: ${data.listName} — ${data.memberCount} مشترك` })
      } else {
        toast({ title: 'فشل الاتصال', description: data.error, variant: 'destructive' })
      }
    } catch (err) {
      setMc({ ok: false, error: String(err) })
      toast({ title: 'خطأ في الاتصال', variant: 'destructive' })
    } finally {
      setTesting(false)
    }
  }, [toast])

  const syncSubscribers = useCallback(async () => {
    setSyncing(true)
    try {
      // Trigger re-sync via the existing newsletter endpoint
      const res = await fetch('/api/admin/marketing/mailchimp/sync', { method: 'POST' })
      if (res.ok) {
        toast({ title: 'تمت المزامنة ✓', description: 'تم رفع المشتركين الجدد إلى Mailchimp.' })
      } else {
        toast({ title: 'فشلت المزامنة', variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'خطأ في المزامنة', description: String(err), variant: 'destructive' })
    } finally {
      setSyncing(false)
    }
  }, [toast])

  useEffect(() => {
    void testConnection()

    // Load subscriber growth from events
    void (async () => {
      try {
        const res = await fetch('/api/admin/marketing/events?days=30')
        if (res.ok) {
          const json = await res.json() as { trends: Array<{ date: string; leads: number }> }
          setGrowth(buildGrowthFromEvents(json.trends || []))
        }
      } catch { /* ignore */ }
    })()
  }, [testConnection])

  return (
    <div className="space-y-8" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-text-heading">مركز البريد الإلكتروني</h1>
          <p className="text-xs text-muted-foreground">تتبع المشتركين والربط مع Mailchimp</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={syncSubscribers} disabled={syncing}>
            {syncing ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Send className="me-2 h-4 w-4" />}
            مزامنة المشتركين
          </Button>
        </div>
      </div>

      {/* Connection Status Card */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className={`shadow-sm border-2 ${mc.ok ? 'border-emerald-500/30' : 'border-amber-500/30'}`}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">حالة الاتصال بـ Mailchimp</CardTitle>
            {mc.ok
              ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              : <XCircle className="h-5 w-5 text-amber-500" />
            }
          </CardHeader>
          <CardContent>
            {mc.ok ? (
              <>
                <p className="text-lg font-semibold text-emerald-600">متصل ✓</p>
                <p className="text-xs text-muted-foreground mt-1">{mc.listName}</p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold text-amber-600">غير متصل</p>
                <p className="text-xs text-muted-foreground mt-1">{mc.error || 'أضف مفتاح API لتفعيل الاتصال'}</p>
              </>
            )}
            <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs px-2" onClick={testConnection} disabled={testing}>
              {testing ? <Loader2 className="h-3 w-3 animate-spin me-1" /> : <RefreshCw className="h-3 w-3 me-1" />}
              إعادة الاختبار
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">إجمالي المشتركين</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{mc.memberCount?.toLocaleString() ?? (mc.ok ? '0' : '—')}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {mc.listName ? `في قائمة: ${mc.listName}` : 'قائمة Mailchimp الافتراضية'}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">قوائم بريدية</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{typeof mc.totalLists === 'number' ? mc.totalLists : '—'}</p>
            <p className="text-xs text-muted-foreground mt-1">Lists على حساب Mailchimp</p>
          </CardContent>
        </Card>
      </div>

      {/* Subscriber Growth Chart */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-brand-primary" />
            نمو المشتركين (Lead Trend — 30 يوم)
          </CardTitle>
          <CardDescription>
            مبني على أحداث Lead المسجلة — يُعكس التراكمي لاحتمالية الاشتراك
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          {growth.length === 0 ? (
            <div className="h-full flex items-center justify-center bg-muted/20 rounded-xl text-sm text-muted-foreground">
              لا توجد بيانات نمو. تأكد من تسجيل أحداث Lead عند إرسال النماذج.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growth} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSubscribers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val: string) => {
                    const d = new Date(val); return `${d.getDate()}/${d.getMonth() + 1}`
                  }}
                />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(val) => [val, 'اشتراكات تراكمية']}
                  labelFormatter={(label) => `تاريخ: ${label}`}
                />
                <Area
                  type="monotone"
                  name="المشتركون"
                  dataKey="count"
                  stroke="#8b5cf6"
                  fillOpacity={1}
                  fill="url(#colorSubscribers)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="h-px bg-border-light/60" />

      {/* Settings */}
      <Card className="shadow-sm border-brand-primary/10">
        <CardHeader className="bg-muted/10 pb-4">
          <CardTitle className="text-base text-brand-primary flex items-center gap-2">
            <Mail className="h-5 w-5" />
            إعدادات Mailchimp & Email
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <MarketingSettingsEditor title="" categories={['email']} />
        </CardContent>
      </Card>
    </div>
  )
}
