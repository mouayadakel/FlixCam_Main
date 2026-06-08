/**
 * Tracking tab: GTM events, Facebook Pixel events
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BarChart3, Target, Loader2, Info } from 'lucide-react'

interface TrackingTabProps {
  cmsData: any
  onSave: (data: any) => Promise<void>
  onDirtyChange: (dirty: boolean) => void
  saving: boolean
}

export function CmsPackageTrackingTab({ cmsData, onSave, onDirtyChange, saving }: TrackingTabProps) {
  const [form, setForm] = useState({
    gtmEventName: '',
    metaPixelEventName: '',
  })

  useEffect(() => {
    if (cmsData) {
      setForm({
        gtmEventName: cmsData.gtmEventName ?? '',
        metaPixelEventName: cmsData.metaPixelEventName ?? '',
      })
    }
  }, [cmsData])

  const handleChange = (patch: any) => {
    setForm((f) => ({ ...f, ...patch }))
    onDirtyChange(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave({
      ...cmsData,
      ...form,
    })
    onDirtyChange(false)
  }

  return (
    <Card dir="rtl">
      <CardHeader>
        <CardTitle>أدوات التتبع والتحليل</CardTitle>
        <CardDescription>إعداد أحداث التتبع لمنصات الإعلانات والإحصائيات</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-semibold text-primary">
              <Target className="h-5 w-5" />
              <span>أحداث التتبع (Events)</span>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="gtmEvent">اسم حدث Google Tag Manager</Label>
              <Input
                id="gtmEvent"
                value={form.gtmEventName}
                onChange={(e) => handleChange({ gtmEventName: e.target.value })}
                placeholder="مثال: package_view_cinema"
                dir="ltr"
                className="text-start"
              />
              <p className="text-xs text-muted-foreground">سيتم إرسال هذا الاسم في الـ dataLayer عند عرض هذه الباقة</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pixelEvent">اسم حدث Meta (Facebook) Pixel</Label>
              <Input
                id="pixelEvent"
                value={form.metaPixelEventName}
                onChange={(e) => handleChange({ metaPixelEventName: e.target.value })}
                placeholder="مثال: ViewPackage_Cinema"
                dir="ltr"
                className="text-start"
              />
              <p className="text-xs text-muted-foreground">يستخدم لتتبع التحويلات وإعادة استهداف زوار هذه الباقة</p>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
            <BarChart3 className="h-5 w-5 shrink-0" />
            <div className="space-y-1">
              <p className="font-bold">ملاحظة تقنية</p>
              <p>يجب أن تكون هذه الأسماء مطابقة لما تم إعداده في حاوية GTM أو مدير إعلانات ميتا.</p>
            </div>
          </div>

          <div className="pt-4">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin ms-2" /> : null}
              حفظ بيانات التتبع
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
