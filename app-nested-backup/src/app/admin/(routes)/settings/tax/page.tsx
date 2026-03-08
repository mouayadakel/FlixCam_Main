/**
 * @file page.tsx
 * @description Settings – Tax/VAT configuration
 * @module app/admin/(routes)/settings/tax
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Percent, ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

interface TaxSettings {
  vat_rate: number
  vat_number: string
  tax_name: string
  is_inclusive: boolean
}

export default function SettingsTaxPage() {
  const { toast } = useToast()
  const [data, setData] = useState<TaxSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<TaxSettings>({
    vat_rate: 15,
    vat_number: '',
    tax_name: 'VAT',
    is_inclusive: false,
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/admin/settings/tax')
        if (!res.ok) throw new Error('Failed to load')
        const json = await res.json()
        if (!cancelled) {
          setData(json)
          setForm({
            vat_rate: typeof json.vat_rate === 'number' ? json.vat_rate : 15,
            vat_number: String(json.vat_number ?? ''),
            tax_name: String(json.tax_name ?? 'VAT'),
            is_inclusive: Boolean(json.is_inclusive),
          })
        }
      } catch {
        if (!cancelled)
          setData({ vat_rate: 15, vat_number: '', tax_name: 'VAT', is_inclusive: false })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings/tax', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error(await res.json().then((j: { error?: string }) => j.error))
      toast({ title: 'تم', description: 'تم حفظ إعدادات الضريبة' })
      setData(form)
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

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/settings">
              <ArrowLeft className="ms-1 h-4 w-4" />
              الإعدادات
            </Link>
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <Percent className="h-8 w-8" />
              الضريبة / ض.ق.م
            </h1>
            <p className="mt-1 text-muted-foreground">معدل الضريبة ورقم التسجيل وطريقة العرض</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>إعدادات الضريبة</CardTitle>
          <CardDescription>
            معدل ضريبة القيمة المضافة، الرقم الضريبي، والاسم. الأسعار يمكن أن تكون شاملة أو غير
            شاملة للضريبة.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <div className="grid max-w-md gap-6">
              <div className="grid gap-2">
                <Label>معدل الضريبة (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.vat_rate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, vat_rate: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>الرقم الضريبي</Label>
                <Input
                  value={form.vat_number}
                  onChange={(e) => setForm((f) => ({ ...f, vat_number: e.target.value }))}
                  placeholder="رقم التسجيل الضريبي"
                />
              </div>
              <div className="grid gap-2">
                <Label>اسم الضريبة</Label>
                <Input
                  value={form.tax_name}
                  onChange={(e) => setForm((f) => ({ ...f, tax_name: e.target.value }))}
                  placeholder="VAT / ض.ق.م"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_inclusive"
                  checked={form.is_inclusive}
                  onChange={(e) => setForm((f) => ({ ...f, is_inclusive: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="is_inclusive">الأسعار شاملة للضريبة</Label>
              </div>
              <Button onClick={save} disabled={saving}>
                <Save className="ms-2 h-4 w-4" />
                حفظ
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
