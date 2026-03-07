/**
 * Admin – Promissory note enable/disable for equipment & studio
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FileSignature, ArrowLeft, Save, Package, Building, FileText } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

interface PNSettings {
  pn_enabled_for_equipment: boolean
  pn_enabled_for_studio: boolean
  letter_template: string
}

const PLACEHOLDERS = [
  { key: '{{client_name}}', desc: 'اسم العميل' },
  { key: '{{client_id}}', desc: 'رقم العميل' },
  { key: '{{date}}', desc: 'التاريخ' },
  { key: '{{order_number}}', desc: 'رقم السند أو الحجز' },
  { key: '{{equipment_name}}', desc: 'أسماء المعدات' },
]

export default function PromissoryNoteSettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<PNSettings>({
    pn_enabled_for_equipment: false,
    pn_enabled_for_studio: false,
    letter_template: '',
  })

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/settings/promissory-note')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed'))))
      .then((data) => {
        if (!cancelled) setForm(data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings/promissory-note', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error(await res.json().then((j: { error?: string }) => j.error))
      toast({ title: 'تم', description: 'تم حفظ إعدادات سند الأمر' })
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل الحفظ',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6" dir="rtl">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/settings">
            <ArrowLeft className="ms-1 h-4 w-4" />
            الإعدادات
          </Link>
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <FileSignature className="h-8 w-8" />
            إعدادات سند الأمر
          </h1>
          <p className="mt-1 text-muted-foreground">
            تفعيل أو تعطيل سند الأمر حسب نوع الحجز (معدات / استوديو)
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>متى يُطلب سند الأمر؟</CardTitle>
          <CardDescription>
            عند التفعيل، سيُطلب من العميل التوقيع على سند أمر قبل إتمام الدفع
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="pn-equipment" className="text-base font-medium">
                  حجوزات المعدات
                </Label>
                <p className="text-sm text-muted-foreground">
                  طلب سند أمر عند حجز معدات (كاميرات، عدسات، إلخ)
                </p>
              </div>
            </div>
            <Switch
              id="pn-equipment"
              checked={form.pn_enabled_for_equipment}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, pn_enabled_for_equipment: v }))
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Building className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="pn-studio" className="text-base font-medium">
                  حجوزات الاستوديو
                </Label>
                <p className="text-sm text-muted-foreground">
                  طلب سند أمر عند حجز استوديو فقط
                </p>
              </div>
            </div>
            <Switch
              id="pn-studio"
              checked={form.pn_enabled_for_studio}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, pn_enabled_for_studio: v }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            نص خطاب سند الأمر
          </CardTitle>
          <CardDescription>
            اكتب قالب الخطاب مع المتغيرات. سيُستبدل كل متغير ببيانات العميل عند إنشاء السند.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="letter_template">القالب</Label>
              <Textarea
                id="letter_template"
                value={form.letter_template}
                onChange={(e) => setForm((f) => ({ ...f, letter_template: e.target.value }))}
                placeholder={'السيد/ة {{client_name}} المحترم/ة،\nنفيدكم بأنه تم إصدار سند أمر رقم {{order_number}} بتاريخ {{date}}\nللمعدات: {{equipment_name}}'}
                rows={10}
                className="font-mono text-sm"
              />
            </div>
            <div className="w-48 shrink-0 space-y-2">
              <Label>المتغيرات المتاحة</Label>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {PLACEHOLDERS.map((p) => (
                  <li key={p.key} className="rounded border px-2 py-1 font-mono">
                    {p.key}
                    <span className="block text-[10px]">{p.desc}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving}>
        <Save className="ms-2 h-4 w-4" />
        حفظ
      </Button>
    </div>
  )
}
