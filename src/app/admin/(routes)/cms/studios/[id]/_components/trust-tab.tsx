/**
 * Trust tab: reviewsText, whatsappNumber
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'

interface TrustTabProps {
  studio: Record<string, unknown>
  onSave: (data: Record<string, unknown>) => Promise<void>
  onDirtyChange: (dirty: boolean) => void
  saving: boolean
}

export function CmsStudioTrustTab({ studio, onSave, onDirtyChange, saving }: TrustTabProps) {
  const [form, setForm] = useState({
    reviewsText: '',
    whatsappNumber: '',
    bookingCountDisplay: '',
  })

  useEffect(() => {
    setForm({
      reviewsText: (studio.reviewsText as string) ?? '',
      whatsappNumber: (studio.whatsappNumber as string) ?? '',
      bookingCountDisplay:
        studio.bookingCountDisplay != null ? String(studio.bookingCountDisplay) : '',
    })
  }, [studio])

  const handleChange = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    onDirtyChange(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave({
      reviewsText: form.reviewsText.trim() || null,
      whatsappNumber: form.whatsappNumber.trim() || null,
      bookingCountDisplay: form.bookingCountDisplay ? parseInt(form.bookingCountDisplay, 10) : null,
    })
    onDirtyChange(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>الثقة والاتصال</CardTitle>
        <CardDescription>نص التقييمات، رقم واتساب</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
          <div className="space-y-2">
            <Label htmlFor="reviewsText">نص التقييمات / الثقة</Label>
            <Textarea
              id="reviewsText"
              value={form.reviewsText}
              onChange={(e) => handleChange('reviewsText', e.target.value)}
              rows={3}
              placeholder="تم تقييمنا من قبل أكثر من 100 عميل..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsappNumber">رقم واتساب (للتواصل قبل الحجز)</Label>
            <Input
              id="whatsappNumber"
              value={form.whatsappNumber}
              onChange={(e) => handleChange('whatsappNumber', e.target.value)}
              placeholder="966501234567"
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bookingCountDisplay">عدد الحجوزات المعروض (دليل اجتماعي)</Label>
            <Input
              id="bookingCountDisplay"
              type="number"
              min={0}
              value={form.bookingCountDisplay}
              onChange={(e) => handleChange('bookingCountDisplay', e.target.value)}
              placeholder="مثال: 100"
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground">
              سيظهر كـ “+100 حجز ناجح” في صفحة الاستوديو
            </p>
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
