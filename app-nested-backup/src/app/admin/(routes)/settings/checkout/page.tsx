/**
 * @file page.tsx
 * @description Admin – Checkout settings (editable). Price lock TTL, cancellation, deposit, max rental days.
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ShoppingCart, ArrowLeft, Save } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

interface CheckoutSettings {
  price_lock_ttl_minutes: number
  cancellation_window_hours: number
  min_deposit_percent: number
  max_rental_days: number
}

export default function CheckoutSettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<CheckoutSettings>({
    price_lock_ttl_minutes: 15,
    cancellation_window_hours: 48,
    min_deposit_percent: 20,
    max_rental_days: 365,
  })

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/settings/checkout')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed'))))
      .then((data) => {
        if (!cancelled) {
          setForm({
            price_lock_ttl_minutes: data.price_lock_ttl_minutes ?? 15,
            cancellation_window_hours: data.cancellation_window_hours ?? 48,
            min_deposit_percent: data.min_deposit_percent ?? 20,
            max_rental_days: data.max_rental_days ?? 365,
          })
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
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
      const res = await fetch('/api/admin/settings/checkout', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error(await res.json().then((j: { error?: string }) => j.error))
      toast({ title: 'تم', description: 'تم حفظ إعدادات الدفع' })
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/settings">
            <ArrowLeft className="ms-1 h-4 w-4" />
            الإعدادات
          </Link>
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <ShoppingCart className="h-8 w-8" />
            إعدادات الدفع والحجز
          </h1>
          <p className="mt-1 text-muted-foreground">
            مدة قفل السعر، نافذة الإلغاء، الحد الأدنى للعربون، أقصى مدة حجز
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الإعدادات الحالية</CardTitle>
          <CardDescription>قفل السعر، الإلغاء، العربون، ومدة الحجز القصوى</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="grid max-w-md gap-6">
              <div className="grid gap-2">
                <Label>قفل السعر (دقيقة)</Label>
                <Input
                  type="number"
                  min="1"
                  max="1440"
                  value={form.price_lock_ttl_minutes}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      price_lock_ttl_minutes: parseInt(e.target.value, 10) || 15,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>نافذة الإلغاء (ساعة) – قبل بدء الحجز</Label>
                <Input
                  type="number"
                  min="0"
                  max="720"
                  value={form.cancellation_window_hours}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      cancellation_window_hours: parseInt(e.target.value, 10) || 48,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>الحد الأدنى للعربون (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={form.min_deposit_percent}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      min_deposit_percent: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>أقصى مدة حجز (يوم)</Label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={form.max_rental_days}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, max_rental_days: parseInt(e.target.value, 10) || 365 }))
                  }
                />
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
