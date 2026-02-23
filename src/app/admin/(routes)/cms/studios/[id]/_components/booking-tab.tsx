/**
 * Booking tab: slots, buffers, pricing, duration, disclaimer
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

interface BookingTabProps {
  studio: Record<string, unknown>
  onSave: (data: Record<string, unknown>) => Promise<void>
  onDirtyChange: (dirty: boolean) => void
  saving: boolean
}

export function CmsStudioBookingTab({ studio, onSave, onDirtyChange, saving }: BookingTabProps) {
  const [form, setForm] = useState({
    slotDurationMinutes: 60,
    setupBuffer: 30,
    cleaningBuffer: 30,
    resetTime: 15,
    minHours: 1,
    hourlyRate: '',
    dailyRate: '',
    vatIncluded: false,
    bookingDisclaimer: '',
  })

  useEffect(() => {
    setForm({
      slotDurationMinutes: (studio.slotDurationMinutes as number) ?? 60,
      setupBuffer: (studio.setupBuffer as number) ?? 30,
      cleaningBuffer: (studio.cleaningBuffer as number) ?? 30,
      resetTime: (studio.resetTime as number) ?? 15,
      minHours: (studio.minHours as number) ?? 1,
      hourlyRate: studio.hourlyRate != null ? String(studio.hourlyRate) : '',
      dailyRate: studio.dailyRate != null ? String(studio.dailyRate) : '',
      vatIncluded: (studio.vatIncluded as boolean) ?? false,
      bookingDisclaimer: (studio.bookingDisclaimer as string) ?? '',
    })
  }, [studio])

  const handleChange = (key: string, value: string | number | boolean) => {
    setForm((f) => ({ ...f, [key]: value }))
    onDirtyChange(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave({
      slotDurationMinutes: form.slotDurationMinutes,
      setupBuffer: form.setupBuffer,
      cleaningBuffer: form.cleaningBuffer,
      resetTime: form.resetTime,
      minHours: form.minHours,
      hourlyRate: form.hourlyRate ? parseFloat(form.hourlyRate) : undefined,
      dailyRate: form.dailyRate ? parseFloat(form.dailyRate) : null,
      vatIncluded: form.vatIncluded,
      bookingDisclaimer: form.bookingDisclaimer.trim() || null,
    })
    onDirtyChange(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>الحجز</CardTitle>
        <CardDescription>فترات الحجز، الأسعار، التنبيهات</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>مدة الفترة (دقيقة)</Label>
              <Select
                value={String(form.slotDurationMinutes)}
                onValueChange={(v) => handleChange('slotDurationMinutes', parseInt(v, 10))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 دقيقة</SelectItem>
                  <SelectItem value="60">60 دقيقة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="minHours">أقل مدة (ساعات)</Label>
              <Input
                id="minHours"
                type="number"
                min={1}
                max={24}
                value={form.minHours}
                onChange={(e) => handleChange('minHours', parseInt(e.target.value, 10) || 1)}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="setupBuffer">وقت التجهيز (دقيقة)</Label>
              <Input
                id="setupBuffer"
                type="number"
                min={0}
                value={form.setupBuffer}
                onChange={(e) => handleChange('setupBuffer', parseInt(e.target.value, 10) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cleaningBuffer">وقت التنظيف (دقيقة)</Label>
              <Input
                id="cleaningBuffer"
                type="number"
                min={0}
                value={form.cleaningBuffer}
                onChange={(e) => handleChange('cleaningBuffer', parseInt(e.target.value, 10) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resetTime">وقت الإعادة (دقيقة)</Label>
              <Input
                id="resetTime"
                type="number"
                min={0}
                max={120}
                value={form.resetTime}
                onChange={(e) => handleChange('resetTime', parseInt(e.target.value, 10) || 0)}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hourlyRate">سعر الساعة (ر.س) *</Label>
              <Input
                id="hourlyRate"
                type="number"
                min={0}
                step={0.01}
                value={form.hourlyRate}
                onChange={(e) => handleChange('hourlyRate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dailyRate">سعر اليوم (ر.س)</Label>
              <Input
                id="dailyRate"
                type="number"
                min={0}
                step={0.01}
                value={form.dailyRate}
                onChange={(e) => handleChange('dailyRate', e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="vatIncluded"
              checked={form.vatIncluded}
              onCheckedChange={(v) => handleChange('vatIncluded', v)}
            />
            <Label htmlFor="vatIncluded">السعر شامل الضريبة</Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bookingDisclaimer">تنبيه الحجز</Label>
            <Textarea
              id="bookingDisclaimer"
              value={form.bookingDisclaimer}
              onChange={(e) => handleChange('bookingDisclaimer', e.target.value)}
              placeholder="لن يتم تأكيد الحجز إلا بعد الدفع"
              rows={2}
              dir="rtl"
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span className="mr-2">حفظ</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
