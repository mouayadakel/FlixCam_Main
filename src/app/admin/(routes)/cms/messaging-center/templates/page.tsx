'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { ArrowRight, FileText, Edit, Loader2 } from 'lucide-react'

interface Template {
  id: string
  name: string
  slug: string
  trigger: string
  channel: string
  language: string
  isActive: boolean
}

const TRIGGER_GROUP: Record<string, string> = {
  BOOKING_CONFIRMED: 'الحجوزات',
  BOOKING_CREATED: 'الحجوزات',
  BOOKING_CANCELLED: 'الحجوزات',
  BOOKING_UPDATED: 'الحجوزات',
  BOOKING_REMINDER: 'التذكيرات',
  PICKUP_REMINDER_24H: 'التذكيرات',
  PICKUP_REMINDER_3H: 'التذكيرات',
  RETURN_REMINDER_24H: 'التذكيرات',
  RETURN_REMINDER_6H: 'التذكيرات',
  LATE_RETURN_WARNING: 'التذكيرات',
  PAYMENT_RECEIVED: 'الدفع',
  PAYMENT_FAILED: 'الدفع',
  PAYMENT_PENDING: 'الدفع',
  WELCOME_CUSTOMER: 'العميل',
  PASSWORD_RESET: 'الأمان',
  EMAIL_VERIFICATION: 'الأمان',
  OTP_LOGIN: 'الأمان',
  REVIEW_REQUEST: 'التسويق',
}

export default function MessagingTemplatesPage() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  async function fetchTemplates() {
    setLoading(true)
    try {
      const res = await fetch('/api/notification-templates')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Failed to load')
      setTemplates(json.templates ?? [])
    } catch {
      toast({ title: 'خطأ', description: 'فشل تحميل القوالب', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  async function handleToggle(id: string, isActive: boolean) {
    setTogglingId(id)
    try {
      const res = await fetch(`/api/notification-templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      if (!res.ok) throw new Error('Failed to update')
      setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, isActive } : t)))
      toast({ title: 'تم', description: isActive ? 'تم تفعيل القالب' : 'تم إيقاف القالب' })
    } catch {
      toast({ title: 'خطأ', description: 'فشل التحديث', variant: 'destructive' })
    } finally {
      setTogglingId(null)
    }
  }

  const byGroup = templates.reduce<Record<string, Template[]>>((acc, t) => {
    const group = TRIGGER_GROUP[t.trigger] ?? 'أخرى'
    if (!acc[group]) acc[group] = []
    acc[group].push(t)
    return acc
  }, {})

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/cms/messaging-center">
              <ArrowRight className="ml-2 h-4 w-4" />
              مركز الرسائل
            </Link>
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <FileText className="h-8 w-8" />
        <div>
          <h1 className="text-2xl font-bold">قوالب الرسائل</h1>
          <p className="text-muted-foreground">قوالب البريد وواتساب وSMS مع متغيرات مثل {'{{customerName}}'}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>القوالب حسب الحدث</CardTitle>
          <CardDescription>
            تفعيل/إيقاف كل قالب. للتعديل الكامل استخدم صفحة قوالب الإشعارات في الإعدادات.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <div className="space-y-6">
              {Object.entries(byGroup).map(([group, list]) => (
                <div key={group}>
                  <h3 className="mb-2 font-medium">{group}</h3>
                  <div className="space-y-2 rounded-md border p-3">
                    {list.map((t) => (
                      <div
                        key={t.id}
                        className="flex flex-wrap items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{t.name}</span>
                          <Badge variant="outline">{t.trigger}</Badge>
                          <Badge variant="secondary">{t.channel}</Badge>
                          <span className="text-xs text-muted-foreground">{t.language}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={t.isActive}
                            onCheckedChange={(v) => handleToggle(t.id, v)}
                            disabled={togglingId === t.id}
                          />
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/settings/notification-templates?edit=${t.id}`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Button asChild>
        <Link href="/admin/settings/notification-templates">
          <FileText className="ml-2 h-4 w-4" />
          فتح محرر القوالب الكامل
        </Link>
      </Button>
    </div>
  )
}
