/**
 * @file page.tsx
 * @description Create new recurring booking series
 * @module app/admin/(routes)/recurring-bookings/new
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Loader2, Plus, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

interface Client {
  id: string
  name: string | null
  email: string
}

interface Equipment {
  id: string
  sku: string
  model: string | null
  dailyPrice?: number
}

interface Studio {
  id: string
  name: string
}

interface TemplateItem {
  equipmentId: string
  quantity: number
  equipment?: Equipment
}

export default function NewRecurringBookingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [studios, setStudios] = useState<Studio[]>([])
  const [name, setName] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('WEEKLY')
  const [interval, setInterval] = useState(1)
  const [endType, setEndType] = useState<'date' | 'count'>('count')
  const [endDate, setEndDate] = useState('')
  const [occurrenceCount, setOccurrenceCount] = useState<number>(12)
  const [templateItems, setTemplateItems] = useState<TemplateItem[]>([])
  const [selectedEquipment, setSelectedEquipment] = useState('')
  const [selectedQuantity, setSelectedQuantity] = useState(1)
  const [studioId, setStudioId] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [cRes, eRes, sRes] = await Promise.all([
          fetch('/api/clients?limit=200'),
          fetch('/api/equipment?isActive=true&limit=200'),
          fetch('/api/studios'),
        ])
        if (cRes.ok) {
          const d = await cRes.json()
          setClients(d.data ?? d.clients ?? d ?? [])
        }
        if (eRes.ok) {
          const d = await eRes.json()
          setEquipment(d.items ?? d ?? [])
        }
        if (sRes.ok) {
          const d = await sRes.json()
          setStudios(d.studios ?? d ?? [])
        }
      } catch (e) {
        console.error(e)
      }
    }
    load()
  }, [])

  const addEquipment = () => {
    if (!selectedEquipment) return
    const eq = equipment.find((e) => e.id === selectedEquipment)
    if (!eq) return
    if (templateItems.some((i) => i.equipmentId === selectedEquipment)) {
      toast({ title: 'تنبيه', description: 'المعدات مضافة مسبقاً', variant: 'destructive' })
      return
    }
    setTemplateItems((prev) => [...prev, { equipmentId: eq.id, quantity: selectedQuantity, equipment: eq }])
    setSelectedEquipment('')
    setSelectedQuantity(1)
  }

  const removeEquipment = (equipmentId: string) => {
    setTemplateItems((prev) => prev.filter((i) => i.equipmentId !== equipmentId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast({ title: 'خطأ', description: 'اسم السلسلة مطلوب', variant: 'destructive' })
      return
    }
    if (!customerId) {
      toast({ title: 'خطأ', description: 'اختر العميل', variant: 'destructive' })
      return
    }
    if (templateItems.length === 0) {
      toast({ title: 'خطأ', description: 'أضف معدات واحدة على الأقل', variant: 'destructive' })
      return
    }
    if (endType === 'date' && !endDate) {
      toast({ title: 'خطأ', description: 'حدد تاريخ النهاية', variant: 'destructive' })
      return
    }
    if (endType === 'count' && (!occurrenceCount || occurrenceCount < 1)) {
      toast({ title: 'خطأ', description: 'حدد عدد التكرارات', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const body = {
        name: name.trim(),
        customerId,
        frequency,
        interval: Math.max(1, Math.min(365, interval)),
        endDate: endType === 'date' && endDate ? new Date(endDate).toISOString() : null,
        occurrenceCount: endType === 'count' ? occurrenceCount : null,
        template: {
          equipmentIds: templateItems.map((i) => ({ equipmentId: i.equipmentId, quantity: i.quantity })),
          studioId: studioId || null,
          notes: notes.trim() || null,
        },
      }
      const res = await fetch('/api/recurring-series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'فشل إنشاء السلسلة')
      }
      const data = await res.json()
      toast({ title: 'تم', description: `تم إنشاء السلسلة و${data.generatedBookingIds?.length ?? 0} حجز` })
      router.push(`/admin/recurring-bookings/${data.series?.id ?? ''}`)
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل إنشاء السلسلة',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/recurring-bookings" className="hover:text-foreground">الحجوزات المتكررة</Link>
        <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        <span>سلسلة جديدة</span>
      </div>
      <h1 className="text-3xl font-bold">سلسلة حجوزات متكررة جديدة</h1>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>البيانات الأساسية</CardTitle>
            <CardDescription>اسم السلسلة والعميل والتكرار</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">اسم السلسلة</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: حجز أسبوعي للاستوديو"
                />
              </div>
              <div className="space-y-2">
                <Label>العميل</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر العميل" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name || c.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>التكرار</Label>
                <Select value={frequency} onValueChange={(v) => setFrequency(v as 'DAILY' | 'WEEKLY' | 'MONTHLY')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">يومي</SelectItem>
                    <SelectItem value="WEEKLY">أسبوعي</SelectItem>
                    <SelectItem value="MONTHLY">شهري</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="interval">كل (فترة)</Label>
                <Input
                  id="interval"
                  type="number"
                  min={1}
                  max={365}
                  value={interval}
                  onChange={(e) => setInterval(parseInt(e.target.value, 10) || 1)}
                />
                <p className="text-xs text-muted-foreground">
                  مثلاً: 2 مع أسبوعي = كل أسبوعين
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>نهاية السلسلة</Label>
                <Select value={endType} onValueChange={(v) => setEndType(v as 'date' | 'count')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="count">بعدد التكرارات</SelectItem>
                    <SelectItem value="date">بتاريخ محدد</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {endType === 'count' && (
                <div className="space-y-2">
                  <Label htmlFor="occurrenceCount">عدد الحجوزات</Label>
                  <Input
                    id="occurrenceCount"
                    type="number"
                    min={1}
                    max={365}
                    value={occurrenceCount}
                    onChange={(e) => setOccurrenceCount(parseInt(e.target.value, 10) || 1)}
                  />
                </div>
              )}
              {endType === 'date' && (
                <div className="space-y-2">
                  <Label htmlFor="endDate">تاريخ النهاية</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>معدات الحجز (قالب كل occurrence)</CardTitle>
            <CardDescription>المعدات والكميات المطبقة على كل حجز في السلسلة</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="اختر معدات" />
                </SelectTrigger>
                <SelectContent>
                  {equipment
                    .filter((e) => !templateItems.some((i) => i.equipmentId === e.id))
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.sku} {e.model ?? ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={1}
                className="w-20"
                value={selectedQuantity}
                onChange={(e) => setSelectedQuantity(parseInt(e.target.value, 10) || 1)}
              />
              <Button type="button" variant="secondary" onClick={addEquipment}>
                <Plus className="h-4 w-4 ml-1" />
                إضافة
              </Button>
            </div>
            {templateItems.length > 0 && (
              <ul className="border rounded-md divide-y">
                {templateItems.map((item) => (
                  <li key={item.equipmentId} className="flex items-center justify-between px-3 py-2">
                    <span>
                      {item.equipment?.sku ?? item.equipmentId} — كمية: {item.quantity}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEquipment(item.equipmentId)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="space-y-2">
              <Label>الاستوديو (اختياري)</Label>
              <Select value={studioId} onValueChange={setStudioId}>
                <SelectTrigger>
                  <SelectValue placeholder="بدون استوديو" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">بدون استوديو</SelectItem>
                  {studios.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">ملاحظات (اختياري)</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
            إنشاء السلسلة والحجوزات
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/recurring-bookings">إلغاء</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
