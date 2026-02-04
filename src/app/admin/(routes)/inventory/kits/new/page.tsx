/**
 * @file page.tsx
 * @description Create new equipment kit (bundle)
 * @module app/admin/(routes)/inventory/kits/new
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
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils/format.utils'

interface Equipment {
  id: string
  sku: string
  model: string | null
  dailyPrice: number | string
}

interface KitItemForm {
  equipmentId: string
  quantity: number
  equipment?: Equipment
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
}

export default function NewKitPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [discountPercent, setDiscountPercent] = useState<number>(0)
  const [isActive, setIsActive] = useState(true)
  const [items, setItems] = useState<KitItemForm[]>([])
  const [selectedEquipment, setSelectedEquipment] = useState('')
  const [selectedQuantity, setSelectedQuantity] = useState(1)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/equipment?isActive=true&limit=300')
        if (res.ok) {
          const d = await res.json()
          setEquipment(d.items ?? d ?? [])
        }
      } catch (e) {
        console.error(e)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (name && !slug) setSlug(slugify(name))
  }, [name])

  const addItem = () => {
    if (!selectedEquipment) return
    const eq = equipment.find((e) => e.id === selectedEquipment)
    if (!eq) return
    if (items.some((i) => i.equipmentId === selectedEquipment)) {
      toast({ title: 'تنبيه', description: 'المعدات مضافة مسبقاً', variant: 'destructive' })
      return
    }
    setItems((prev) => [...prev, { equipmentId: eq.id, quantity: selectedQuantity, equipment: eq }])
    setSelectedEquipment('')
    setSelectedQuantity(1)
  }

  const removeItem = (equipmentId: string) => {
    setItems((prev) => prev.filter((i) => i.equipmentId !== equipmentId))
  }

  const totalDaily = items.reduce((sum, i) => {
    const price = typeof i.equipment?.dailyPrice === 'string' ? parseFloat(i.equipment.dailyPrice) : (i.equipment?.dailyPrice ?? 0)
    return sum + price * i.quantity
  }, 0)
  const discount = discountPercent / 100
  const finalDaily = totalDaily * (1 - discount)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast({ title: 'خطأ', description: 'اسم الحزمة مطلوب', variant: 'destructive' })
      return
    }
    if (!/^[a-z0-9_-]+$/.test(slug)) {
      toast({ title: 'خطأ', description: 'الرابط (slug) يجب أن يكون أحرف إنجليزية صغيرة وأرقام و - _', variant: 'destructive' })
      return
    }
    if (items.length === 0) {
      toast({ title: 'خطأ', description: 'أضف معدات واحدة على الأقل', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/kits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
          discountPercent: discountPercent || null,
          isActive,
          items: items.map((i) => ({ equipmentId: i.equipmentId, quantity: i.quantity })),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'فشل إنشاء الحزمة')
      }
      const data = await res.json()
      toast({ title: 'تم', description: 'تم إنشاء الحزمة' })
      router.push(`/admin/inventory/kits/${data.kit?.id ?? ''}`)
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل إنشاء الحزمة',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/inventory/kits" className="hover:text-foreground">الحزم</Link>
        <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        <span>حزمة جديدة</span>
      </div>
      <h1 className="text-3xl font-bold">حزمة معدات جديدة</h1>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>البيانات الأساسية</CardTitle>
            <CardDescription>الاسم والرابط والخصم</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">اسم الحزمة</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: كاميرا + عدسات أساسية"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">الرابط (slug)</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="camera-basic-kit"
                />
                <p className="text-xs text-muted-foreground">أحرف إنجليزية صغيرة، أرقام، - و _ فقط</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">الوصف (اختياري)</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="space-y-2">
                <Label htmlFor="discount">خصم %</Label>
                <Input
                  id="discount"
                  type="number"
                  min={0}
                  max={100}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                  className="w-24"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="active">نشط</Label>
                <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>معدات الحزمة</CardTitle>
            <CardDescription>أضف المعدات والكميات. السعر اليومي الإجمالي يُحسب تلقائياً مع الخصم.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="اختر معدات" />
                </SelectTrigger>
                <SelectContent>
                  {equipment
                    .filter((e) => !items.some((i) => i.equipmentId === e.id))
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.sku} {e.model ?? ''} — {formatCurrency(typeof e.dailyPrice === 'string' ? parseFloat(e.dailyPrice) : e.dailyPrice)}/يوم
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
              <Button type="button" variant="secondary" onClick={addItem}>
                <Plus className="h-4 w-4 ml-1" />
                إضافة
              </Button>
            </div>
            {items.length > 0 && (
              <>
                <ul className="border rounded-md divide-y">
                  {items.map((item) => {
                    const price = typeof item.equipment?.dailyPrice === 'string' ? parseFloat(item.equipment.dailyPrice) : (item.equipment?.dailyPrice ?? 0)
                    return (
                      <li key={item.equipmentId} className="flex items-center justify-between px-3 py-2">
                        <span>
                          {item.equipment?.sku ?? item.equipmentId} × {item.quantity} — {formatCurrency(price * item.quantity)}/يوم
                        </span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(item.equipmentId)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </li>
                    )
                  })}
                </ul>
                <div className="text-sm">
                  <span className="text-muted-foreground">المجموع اليومي (قبل خصم):</span> {formatCurrency(totalDaily)}
                  {discountPercent > 0 && (
                    <>
                      {' — '}
                      <span className="text-muted-foreground">بعد خصم {discountPercent}%:</span> {formatCurrency(finalDaily)}
                    </>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
            إنشاء الحزمة
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/inventory/kits">إلغاء</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
