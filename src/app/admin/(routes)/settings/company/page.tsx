/**
 * Admin – Company (creditor) settings for promissory notes
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Building2, ArrowLeft, Save } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

interface CompanySettings {
  creditorName: string
  creditorCommercialReg: string
  creditorTaxNumber: string
  creditorAddress: string
  creditorBankAccount: string
  creditorIban: string
  managerName: string
  managerTitle: string
  managerLetterTemplate: string
}

const DEFAULTS: CompanySettings = {
  creditorName: '',
  creditorCommercialReg: '',
  creditorTaxNumber: '',
  creditorAddress: '',
  creditorBankAccount: '',
  creditorIban: '',
  managerName: '',
  managerTitle: '',
  managerLetterTemplate: '',
}

export default function CompanySettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<CompanySettings>(DEFAULTS)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/settings/company')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed'))))
      .then((data) => {
        if (!cancelled) setForm({ ...DEFAULTS, ...data })
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
      const res = await fetch('/api/admin/settings/company', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error(await res.json().then((j: { error?: string }) => j.error))
      toast({ title: 'تم', description: 'تم حفظ بيانات الشركة' })
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
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/settings">
            <ArrowLeft className="ml-1 h-4 w-4" />
            الإعدادات
          </Link>
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Building2 className="h-8 w-8" />
            بيانات الشركة (سند الأمر)
          </h1>
          <p className="mt-1 text-muted-foreground">
            بيانات المستفيد وخطاب المدير – تُستخدم في سندات الأمر
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>المستفيد (الشركة)</CardTitle>
          <CardDescription>البيانات القانونية والبنكية</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="creditorName">اسم الشركة</Label>
              <Input
                id="creditorName"
                value={form.creditorName}
                onChange={(e) => setForm((f) => ({ ...f, creditorName: e.target.value }))}
                placeholder="FlixCam لتأجير المعدات السينمائية"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditorCommercialReg">السجل التجاري</Label>
              <Input
                id="creditorCommercialReg"
                value={form.creditorCommercialReg}
                onChange={(e) => setForm((f) => ({ ...f, creditorCommercialReg: e.target.value }))}
                placeholder="١٠١٠٦٤٥٣٢١"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditorTaxNumber">الرقم الضريبي</Label>
              <Input
                id="creditorTaxNumber"
                value={form.creditorTaxNumber}
                onChange={(e) => setForm((f) => ({ ...f, creditorTaxNumber: e.target.value }))}
                placeholder="٣٠٠٣٧٥٦٩٨٣٠٠٠٠٣"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="creditorAddress">العنوان</Label>
            <Input
              id="creditorAddress"
              value={form.creditorAddress}
              onChange={(e) => setForm((f) => ({ ...f, creditorAddress: e.target.value }))}
              placeholder="شارع التخصصي، حي المحمدية، الرياض"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="creditorBankAccount">رقم الحساب البنكي</Label>
              <Input
                id="creditorBankAccount"
                value={form.creditorBankAccount}
                onChange={(e) => setForm((f) => ({ ...f, creditorBankAccount: e.target.value }))}
                placeholder="SA12 3456 7890 1234 5678 90"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditorIban">IBAN</Label>
              <Input
                id="creditorIban"
                value={form.creditorIban}
                onChange={(e) => setForm((f) => ({ ...f, creditorIban: e.target.value }))}
                placeholder="SA12 3456 7890 1234 5678 90"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>خطاب المدير العام</CardTitle>
          <CardDescription>الاسم والمسمى وقالب الخطاب</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="managerName">اسم المدير</Label>
              <Input
                id="managerName"
                value={form.managerName}
                onChange={(e) => setForm((f) => ({ ...f, managerName: e.target.value }))}
                placeholder="أحمد محمد"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="managerTitle">المسمى الوظيفي</Label>
              <Input
                id="managerTitle"
                value={form.managerTitle}
                onChange={(e) => setForm((f) => ({ ...f, managerTitle: e.target.value }))}
                placeholder="المدير العام"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="managerLetterTemplate">قالب خطاب المدير (اختياري)</Label>
            <Textarea
              id="managerLetterTemplate"
              value={form.managerLetterTemplate}
              onChange={(e) => setForm((f) => ({ ...f, managerLetterTemplate: e.target.value }))}
              placeholder="السيد/ة [اسم العميل] المحترم/ة..."
              rows={6}
              className="font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving}>
        <Save className="ml-2 h-4 w-4" />
        حفظ
      </Button>
    </div>
  )
}
