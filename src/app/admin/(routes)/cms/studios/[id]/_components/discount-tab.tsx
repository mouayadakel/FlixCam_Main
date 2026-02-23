/**
 * Discount / Promotion tab: admin controls discount percentage, message, and active state
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Loader2, Percent, Tag, Eye } from 'lucide-react'

interface DiscountTabProps {
  studio: Record<string, unknown>
  onSave: (data: Record<string, unknown>) => Promise<void>
  onDirtyChange: (dirty: boolean) => void
  saving: boolean
}

export function CmsStudioDiscountTab({ studio, onSave, onDirtyChange, saving }: DiscountTabProps) {
  const [form, setForm] = useState({
    discountPercent: '',
    discountMessage: '',
    discountActive: false,
  })

  useEffect(() => {
    setForm({
      discountPercent: studio.discountPercent != null ? String(studio.discountPercent) : '',
      discountMessage: (studio.discountMessage as string) ?? '',
      discountActive: (studio.discountActive as boolean) ?? false,
    })
  }, [studio])

  const handleChange = (key: string, value: string | boolean) => {
    setForm((f) => ({ ...f, [key]: value }))
    onDirtyChange(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave({
      discountPercent: form.discountPercent ? parseInt(form.discountPercent, 10) : null,
      discountMessage: form.discountMessage.trim() || null,
      discountActive: form.discountActive,
    })
    onDirtyChange(false)
  }

  const previewPercent = form.discountPercent ? parseInt(form.discountPercent, 10) : 0
  const hourlyRate = Number(studio.hourlyRate ?? 0)
  const discountedRate = hourlyRate - (hourlyRate * previewPercent) / 100

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          العروض والخصومات
        </CardTitle>
        <CardDescription>
          تحكم في رسالة الخصم والنسبة التي تظهر للعملاء على صفحة الاستوديو
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-xl border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="discountActive" className="text-base font-medium">
                تفعيل العرض
              </Label>
              <p className="text-sm text-muted-foreground">
                عند التفعيل سيظهر شريط الخصم على صفحة الاستوديو
              </p>
            </div>
            <Switch
              id="discountActive"
              checked={form.discountActive}
              onCheckedChange={(v) => handleChange('discountActive', v)}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Percentage */}
            <div className="space-y-2">
              <Label htmlFor="discountPercent" className="flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5" />
                نسبة الخصم (%)
              </Label>
              <Input
                id="discountPercent"
                type="number"
                min={0}
                max={100}
                value={form.discountPercent}
                onChange={(e) => handleChange('discountPercent', e.target.value)}
                placeholder="مثال: 15"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">أدخل رقم بين 0 و 100</p>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="discountMessage">رسالة العرض</Label>
              <Textarea
                id="discountMessage"
                value={form.discountMessage}
                onChange={(e) => handleChange('discountMessage', e.target.value)}
                rows={3}
                placeholder="مثال: خصم خاص لفترة محدودة! احجز الآن"
                dir="rtl"
              />
              <p className="text-xs text-muted-foreground">
                هذه الرسالة ستظهر للعملاء في شريط الخصم
              </p>
            </div>
          </div>

          {/* Preview */}
          {form.discountActive && previewPercent > 0 && (
            <div className="space-y-3">
              <Label className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                معاينة الشريط
              </Label>
              <div className="overflow-hidden rounded-2xl border" dir="rtl">
                <div className="flex items-center justify-between bg-gradient-to-l from-primary/10 via-primary/5 to-transparent px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-primary px-3 py-1 text-sm text-white">
                      خصم {previewPercent}%
                    </Badge>
                    <span className="text-sm font-medium text-text-heading">
                      {form.discountMessage || 'خصم خاص لفترة محدودة!'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-text-muted line-through">{hourlyRate} ر.س</span>
                    <span className="font-bold text-primary">{Math.round(discountedRate)} ر.س</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span className="mr-2">حفظ</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
