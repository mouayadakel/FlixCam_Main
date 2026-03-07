/**
 * @file quotes/new/page.tsx
 * @description Create new quote page
 * @module app/admin/(routes)/quotes/new
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Loader2, Plus, FileText, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils/format.utils'

interface Client {
  id: string
  name: string | null
  email: string
}

interface Equipment {
  id: string
  sku: string
  model: string | null
  dailyPrice: number
  category?: { name: string }
}

interface QuoteItem {
  equipmentId: string
  equipment?: Equipment
  quantity: number
  days: number
  unitPrice: number
}

export default function NewQuotePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])

  const [formData, setFormData] = useState({
    customerId: searchParams?.get('customerId') || '',
    validUntil: '',
    notes: '',
  })

  const [items, setItems] = useState<QuoteItem[]>([])
  const [selectedEquipment, setSelectedEquipment] = useState('')

  const VAT_RATE = 0.15

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [clientsRes, equipmentRes] = await Promise.all([
        fetch('/api/clients?limit=100'),
        fetch('/api/equipment?isActive=true&limit=100'),
      ])

      if (clientsRes.ok) {
        const data = await clientsRes.json()
        setClients(data.data || data.items || [])
      }

      if (equipmentRes.ok) {
        const data = await equipmentRes.json()
        setEquipment(data.items || [])
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    }
  }

  const addItem = () => {
    if (!selectedEquipment) return

    const eq = equipment.find((e) => e.id === selectedEquipment)
    if (!eq) return

    // Check if already added
    if (items.some((i) => i.equipmentId === selectedEquipment)) {
      toast({
        title: 'تنبيه',
        description: 'هذه المعدات مضافة بالفعل',
        variant: 'destructive',
      })
      return
    }

    setItems([
      ...items,
      {
        equipmentId: eq.id,
        equipment: eq,
        quantity: 1,
        days: 1,
        unitPrice: Number(eq.dailyPrice),
      },
    ])
    setSelectedEquipment('')
  }

  const removeItem = (equipmentId: string) => {
    setItems(items.filter((i) => i.equipmentId !== equipmentId))
  }

  const updateItem = (equipmentId: string, field: 'quantity' | 'days', value: number) => {
    setItems(
      items.map((item) => (item.equipmentId === equipmentId ? { ...item, [field]: value } : item))
    )
  }

  const calculateTotals = () => {
    const subtotal = items.reduce(
      (sum, item) => sum + item.quantity * item.days * item.unitPrice,
      0
    )
    const vatAmount = subtotal * VAT_RATE
    const totalAmount = subtotal + vatAmount
    return { subtotal, vatAmount, totalAmount }
  }

  const { subtotal, vatAmount, totalAmount } = calculateTotals()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.customerId) {
      toast({
        title: 'خطأ',
        description: 'يرجى اختيار العميل',
        variant: 'destructive',
      })
      return
    }

    if (!formData.validUntil) {
      toast({
        title: 'خطأ',
        description: 'يرجى تحديد تاريخ انتهاء الصلاحية',
        variant: 'destructive',
      })
      return
    }

    if (items.length === 0) {
      toast({
        title: 'خطأ',
        description: 'يرجى إضافة معدات واحدة على الأقل',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: formData.customerId,
          validUntil: formData.validUntil,
          notes: formData.notes || null,
          items: items.map((item) => ({
            equipmentId: item.equipmentId,
            quantity: item.quantity,
            days: item.days,
            unitPrice: item.unitPrice,
            total: item.quantity * item.days * item.unitPrice,
          })),
          subtotal,
          vatAmount,
          totalAmount,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'فشل إنشاء عرض السعر')
      }

      const quote = await response.json()

      toast({
        title: 'تم الإنشاء',
        description: 'تم إنشاء عرض السعر بنجاح',
      })

      router.push(`/admin/quotes/${quote.id || quote.data?.id}`)
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل إنشاء عرض السعر',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <FileText className="h-8 w-8" />
            عرض سعر جديد
          </h1>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/quotes">
            <ArrowRight className="ms-2 h-4 w-4" />
            إلغاء
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer & Validity */}
        <Card>
          <CardHeader>
            <CardTitle>معلومات عرض السعر</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>العميل *</Label>
                <Select
                  value={formData.customerId}
                  onValueChange={(value) => setFormData({ ...formData, customerId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر العميل" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name || client.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>صالح حتى *</Label>
                <Input
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Equipment Selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>المعدات</CardTitle>
                <CardDescription>اختر المعدات المطلوبة</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Equipment */}
            <div className="flex gap-2">
              <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="اختر معدات لإضافتها" />
                </SelectTrigger>
                <SelectContent>
                  {equipment.map((eq) => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {eq.sku} {eq.model && `- ${eq.model}`} (
                      {formatCurrency(Number(eq.dailyPrice))}/يوم)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" onClick={addItem} disabled={!selectedEquipment}>
                <Plus className="ms-2 h-4 w-4" />
                إضافة
              </Button>
            </div>

            {/* Items List */}
            {items.length === 0 ? (
              <div className="rounded-lg border py-8 text-center text-muted-foreground">
                لم يتم إضافة معدات بعد
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.equipmentId}
                    className="flex items-center gap-4 rounded-lg border p-4"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{item.equipment?.sku}</p>
                      <p className="text-sm text-muted-foreground">{item.equipment?.model}</p>
                      <Badge variant="outline" className="mt-1">
                        {formatCurrency(item.unitPrice)}/يوم
                      </Badge>
                    </div>
                    <div className="w-20 space-y-1">
                      <Label className="text-xs">الكمية</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(item.equipmentId, 'quantity', Number(e.target.value))
                        }
                      />
                    </div>
                    <div className="w-20 space-y-1">
                      <Label className="text-xs">الأيام</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.days}
                        onChange={(e) =>
                          updateItem(item.equipmentId, 'days', Number(e.target.value))
                        }
                      />
                    </div>
                    <div className="w-28 text-start">
                      <p className="text-xs text-muted-foreground">الإجمالي</p>
                      <p className="font-bold">
                        {formatCurrency(item.quantity * item.days * item.unitPrice)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.equipmentId)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}

                {/* Totals */}
                <div className="me-auto max-w-sm space-y-2 border-t pt-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المجموع الفرعي</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ضريبة القيمة المضافة (15%)</span>
                    <span>{formatCurrency(vatAmount)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-lg font-bold">
                    <span>الإجمالي</span>
                    <span>{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>ملاحظات</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="ملاحظات إضافية تظهر في عرض السعر..."
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/quotes">إلغاء</Link>
          </Button>
          <Button type="submit" disabled={loading || items.length === 0}>
            {loading ? (
              <>
                <Loader2 className="ms-2 h-4 w-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Plus className="ms-2 h-4 w-4" />
                إنشاء عرض السعر
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
