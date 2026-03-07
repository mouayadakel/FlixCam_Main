/**
 * Rules tab: rulesText, smokingPolicy, foodPolicy, equipmentCarePolicy, cancellation
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'

interface RulesTabProps {
  studio: Record<string, unknown>
  onSave: (data: Record<string, unknown>) => Promise<void>
  onDirtyChange: (dirty: boolean) => void
  saving: boolean
}

export function CmsStudioRulesTab({ studio, onSave, onDirtyChange, saving }: RulesTabProps) {
  const [form, setForm] = useState({
    rulesText: '',
    smokingPolicy: '',
    foodPolicy: '',
    equipmentCarePolicy: '',
    cancellationPolicyShort: '',
    cancellationPolicyLink: '',
  })

  useEffect(() => {
    setForm({
      rulesText: (studio.rulesText as string) ?? '',
      smokingPolicy: (studio.smokingPolicy as string) ?? '',
      foodPolicy: (studio.foodPolicy as string) ?? '',
      equipmentCarePolicy: (studio.equipmentCarePolicy as string) ?? '',
      cancellationPolicyShort: (studio.cancellationPolicyShort as string) ?? '',
      cancellationPolicyLink: (studio.cancellationPolicyLink as string) ?? '',
    })
  }, [studio])

  const handleChange = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    onDirtyChange(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave({
      rulesText: form.rulesText.trim() || null,
      smokingPolicy: form.smokingPolicy.trim() || null,
      foodPolicy: form.foodPolicy.trim() || null,
      equipmentCarePolicy: form.equipmentCarePolicy.trim() || null,
      cancellationPolicyShort: form.cancellationPolicyShort.trim() || null,
      cancellationPolicyLink: form.cancellationPolicyLink.trim() || null,
    })
    onDirtyChange(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>القواعد والمتطلبات</CardTitle>
        <CardDescription>القواعد، التدخين، الطعام، العناية بالمعدات، سياسة الإلغاء</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
          <div className="space-y-2">
            <Label htmlFor="rulesText">القواعد العامة</Label>
            <Textarea
              id="rulesText"
              value={form.rulesText}
              onChange={(e) => handleChange('rulesText', e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smokingPolicy">التدخين</Label>
            <Textarea
              id="smokingPolicy"
              value={form.smokingPolicy}
              onChange={(e) => handleChange('smokingPolicy', e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="foodPolicy">الطعام والشراب</Label>
            <Textarea
              id="foodPolicy"
              value={form.foodPolicy}
              onChange={(e) => handleChange('foodPolicy', e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="equipmentCarePolicy">العناية بالمعدات</Label>
            <Textarea
              id="equipmentCarePolicy"
              value={form.equipmentCarePolicy}
              onChange={(e) => handleChange('equipmentCarePolicy', e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cancellationPolicyShort">سياسة الإلغاء (مختصر)</Label>
            <Textarea
              id="cancellationPolicyShort"
              value={form.cancellationPolicyShort}
              onChange={(e) => handleChange('cancellationPolicyShort', e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cancellationPolicyLink">رابط التفاصيل الكاملة</Label>
            <Input
              id="cancellationPolicyLink"
              type="url"
              value={form.cancellationPolicyLink}
              onChange={(e) => handleChange('cancellationPolicyLink', e.target.value)}
              placeholder="https://..."
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span className="me-2">حفظ</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
