/**
 * Schedule tab: manage studio weekly operating hours
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Loader2, Clock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ScheduleEntry {
  dayOfWeek: number
  openTime: string
  closeTime: string
  isClosed: boolean
}

const DAY_LABELS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

interface ScheduleTabProps {
  studioId: string
}

export function CmsStudioScheduleTab({ studioId }: ScheduleTabProps) {
  const { toast } = useToast()
  const [schedule, setSchedule] = useState<ScheduleEntry[]>(
    Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      openTime: '09:00',
      closeTime: '22:00',
      isClosed: false,
    }))
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/studios/${studioId}/schedule`)
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json.data) && json.data.length === 7) {
          setSchedule(json.data)
        }
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل تحميل الجدول', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [studioId, toast])

  useEffect(() => {
    load()
  }, [load])

  const updateDay = (dayOfWeek: number, field: keyof ScheduleEntry, value: string | boolean) => {
    setSchedule((prev) =>
      prev.map((entry) => (entry.dayOfWeek === dayOfWeek ? { ...entry, [field]: value } : entry))
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/studios/${studioId}/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'فشل الحفظ')
      }
      toast({ title: 'تم', description: 'تم حفظ مواعيد العمل' })
    } catch (err) {
      toast({
        title: 'خطأ',
        description: err instanceof Error ? err.message : 'فشل الحفظ',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          مواعيد العمل الأسبوعية
        </CardTitle>
        <CardDescription>حدد أوقات الفتح والإغلاق لكل يوم من الأسبوع</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {schedule.map((entry) => (
          <div
            key={entry.dayOfWeek}
            className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
              entry.isClosed ? 'bg-muted/50 opacity-60' : ''
            }`}
          >
            <div className="w-20 shrink-0 text-sm font-medium">{DAY_LABELS[entry.dayOfWeek]}</div>

            <div className="flex items-center gap-2">
              <Switch
                checked={!entry.isClosed}
                onCheckedChange={(v) => updateDay(entry.dayOfWeek, 'isClosed', !v)}
              />
              <Label className="text-xs text-muted-foreground">
                {entry.isClosed ? 'مغلق' : 'مفتوح'}
              </Label>
            </div>

            {!entry.isClosed && (
              <>
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs text-muted-foreground">من</Label>
                  <Input
                    type="time"
                    value={entry.openTime}
                    onChange={(e) => updateDay(entry.dayOfWeek, 'openTime', e.target.value)}
                    className="w-28 text-sm"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs text-muted-foreground">إلى</Label>
                  <Input
                    type="time"
                    value={entry.closeTime}
                    onChange={(e) => updateDay(entry.dayOfWeek, 'closeTime', e.target.value)}
                    className="w-28 text-sm"
                  />
                </div>
              </>
            )}
          </div>
        ))}

        <Button onClick={handleSave} disabled={saving} className="mt-4">
          {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          حفظ المواعيد
        </Button>
      </CardContent>
    </Card>
  )
}
