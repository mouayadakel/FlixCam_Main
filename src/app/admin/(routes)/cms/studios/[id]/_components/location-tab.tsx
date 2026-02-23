/**
 * Location tab: address, Google Maps, arrival time, parking
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'

interface LocationTabProps {
  studio: Record<string, unknown>
  onSave: (data: Record<string, unknown>) => Promise<void>
  onDirtyChange: (dirty: boolean) => void
  saving: boolean
}

export function CmsStudioLocationTab({ studio, onSave, onDirtyChange, saving }: LocationTabProps) {
  const [form, setForm] = useState({
    address: '',
    googleMapsUrl: '',
    arrivalTimeFromCenter: '',
    parkingNotes: '',
  })

  useEffect(() => {
    setForm({
      address: (studio.address as string) ?? '',
      googleMapsUrl: (studio.googleMapsUrl as string) ?? '',
      arrivalTimeFromCenter: (studio.arrivalTimeFromCenter as string) ?? '',
      parkingNotes: (studio.parkingNotes as string) ?? '',
    })
  }, [studio])

  const handleChange = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    onDirtyChange(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave({
      address: form.address.trim() || null,
      googleMapsUrl: form.googleMapsUrl.trim() || null,
      arrivalTimeFromCenter: form.arrivalTimeFromCenter.trim() || null,
      parkingNotes: form.parkingNotes.trim() || null,
    })
    onDirtyChange(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>الموقع</CardTitle>
        <CardDescription>العنوان، خرائط جوجل، وقت الوصول، مواقف السيارات</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">العنوان</Label>
            <Textarea
              id="address"
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              rows={2}
              dir="rtl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="googleMapsUrl">رابط خرائط جوجل</Label>
            <Input
              id="googleMapsUrl"
              type="url"
              value={form.googleMapsUrl}
              onChange={(e) => handleChange('googleMapsUrl', e.target.value)}
              placeholder="https://maps.google.com/..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="arrivalTimeFromCenter">وقت الوصول من وسط الرياض</Label>
            <Input
              id="arrivalTimeFromCenter"
              value={form.arrivalTimeFromCenter}
              onChange={(e) => handleChange('arrivalTimeFromCenter', e.target.value)}
              placeholder="مثال: ~15 دقيقة"
              dir="rtl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="parkingNotes">ملاحظات المواقف / المدخل</Label>
            <Textarea
              id="parkingNotes"
              value={form.parkingNotes}
              onChange={(e) => handleChange('parkingNotes', e.target.value)}
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
