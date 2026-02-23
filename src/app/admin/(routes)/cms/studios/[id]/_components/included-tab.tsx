/**
 * Included tab: whatsIncluded, notIncluded, hasElectricity, hasAC, hasChangingRooms
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'

interface IncludedTabProps {
  studio: Record<string, unknown>
  onSave: (data: Record<string, unknown>) => Promise<void>
  onDirtyChange: (dirty: boolean) => void
  saving: boolean
}

export function CmsStudioIncludedTab({ studio, onSave, onDirtyChange, saving }: IncludedTabProps) {
  const [form, setForm] = useState({
    whatsIncluded: '',
    notIncluded: '',
    hasElectricity: true,
    hasAC: true,
    hasChangingRooms: false,
    hasWifi: true,
  })

  useEffect(() => {
    setForm({
      whatsIncluded: (studio.whatsIncluded as string) ?? '',
      notIncluded: (studio.notIncluded as string) ?? '',
      hasElectricity: (studio.hasElectricity as boolean) ?? true,
      hasAC: (studio.hasAC as boolean) ?? true,
      hasChangingRooms: (studio.hasChangingRooms as boolean) ?? false,
      hasWifi: (studio.hasWifi as boolean) ?? true,
    })
  }, [studio])

  const handleChange = (key: string, value: string | boolean) => {
    setForm((f) => ({ ...f, [key]: value }))
    onDirtyChange(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave({
      whatsIncluded: form.whatsIncluded.trim() || null,
      notIncluded: form.notIncluded.trim() || null,
      hasElectricity: form.hasElectricity,
      hasAC: form.hasAC,
      hasChangingRooms: form.hasChangingRooms,
      hasWifi: form.hasWifi,
    })
    onDirtyChange(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>المشمول وغير المشمول</CardTitle>
        <CardDescription>ما يشمل الإيجار وما لا يشمل، والمرافق</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
          <div className="space-y-2">
            <Label htmlFor="whatsIncluded">ما المشمول (نقاط أو نص)</Label>
            <Textarea
              id="whatsIncluded"
              value={form.whatsIncluded}
              onChange={(e) => handleChange('whatsIncluded', e.target.value)}
              rows={3}
              placeholder='["كهرباء","تكييف","إنترنت"] أو نص حر'
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notIncluded">غير المشمول</Label>
            <Textarea
              id="notIncluded"
              value={form.notIncluded}
              onChange={(e) => handleChange('notIncluded', e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Switch
                id="hasElectricity"
                checked={form.hasElectricity}
                onCheckedChange={(v) => handleChange('hasElectricity', v)}
              />
              <Label htmlFor="hasElectricity">كهرباء</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="hasAC"
                checked={form.hasAC}
                onCheckedChange={(v) => handleChange('hasAC', v)}
              />
              <Label htmlFor="hasAC">تكييف</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="hasChangingRooms"
                checked={form.hasChangingRooms}
                onCheckedChange={(v) => handleChange('hasChangingRooms', v)}
              />
              <Label htmlFor="hasChangingRooms">غرف تغيير</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="hasWifi"
                checked={form.hasWifi}
                onCheckedChange={(v) => handleChange('hasWifi', v)}
              />
              <Label htmlFor="hasWifi">إنترنت / WiFi</Label>
            </div>
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
