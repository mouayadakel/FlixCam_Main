/**
 * Blackout tab: manage studio blackout dates
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Trash2, Loader2, Plus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Blackout {
  id: string
  startDate: string
  endDate: string
  reason: string | null
}

interface BlackoutTabProps {
  studioId: string
  onRefresh: () => void
}

export function CmsStudioBlackoutTab({ studioId, onRefresh }: BlackoutTabProps) {
  const { toast } = useToast()
  const [blackouts, setBlackouts] = useState<Blackout[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ startDate: '', endDate: '', reason: '' })

  const load = async () => {
    try {
      const res = await fetch(`/api/admin/studios/${studioId}/blackout`)
      if (res.ok) {
        const json = await res.json()
        setBlackouts(
          (json.data ?? []).map((b: { startDate: string; endDate: string }) => ({
            ...b,
            startDate: b.startDate.slice(0, 10),
            endDate: b.endDate.slice(0, 10),
          }))
        )
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل التحميل', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [studioId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch(`/api/admin/studios/${studioId}/blackout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: form.startDate,
          endDate: form.endDate,
          reason: form.reason.trim() || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed')
      }
      toast({ title: 'تم', description: 'تم إضافة اليوم المعطل' })
      setDialogOpen(false)
      setForm({ startDate: '', endDate: '', reason: '' })
      load()
      onRefresh()
    } catch (err) {
      toast({
        title: 'خطأ',
        description: err instanceof Error ? err.message : 'فشل الحفظ',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (blackoutId: string) => {
    if (!confirm('حذف هذا اليوم المعطل؟')) return
    try {
      const res = await fetch(`/api/admin/studios/${studioId}/blackout/${blackoutId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Delete failed')
      setBlackouts((prev) => prev.filter((b) => b.id !== blackoutId))
      toast({ title: 'تم', description: 'تم حذف اليوم المعطل' })
      onRefresh()
    } catch {
      toast({ title: 'خطأ', description: 'فشل الحذف', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>الأيام المعطلة</CardTitle>
          <CardDescription>تواريخ لا يتوفر فيها الاستوديو للحجز</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setForm({ startDate: '', endDate: '', reason: '' })}>
              <Plus className="h-4 w-4" />
              <span className="mr-2">إضافة</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>إضافة يوم معطل</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="blackout-start">من تاريخ</Label>
                <Input
                  id="blackout-start"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="blackout-end">إلى تاريخ</Label>
                <Input
                  id="blackout-end"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="blackout-reason">السبب (اختياري)</Label>
                <Input
                  id="blackout-reason"
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="صيانة، عطلة، إلخ"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit">حفظ</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {blackouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد أيام معطلة</p>
          ) : (
            blackouts.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">
                    {b.startDate} — {b.endDate}
                  </p>
                  {b.reason && <p className="text-sm text-muted-foreground">{b.reason}</p>}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => handleDelete(b.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
