/**
 * @file invoices/new/page.tsx
 * @description Create new invoice page
 * @module app/admin/(routes)/invoices/new
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Loader2, Plus, FileText, Trash2, X } from 'lucide-react'
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
import { formatCurrency } from '@/lib/utils/format.utils'

interface Client {
  id: string
  name: string | null
  email: string
}

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
}

export default function NewInvoicePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  
  const [formData, setFormData] = useState({
    customerId: searchParams?.get('customerId') || '',
    bookingId: searchParams?.get('bookingId') || '',
    dueDate: '',
    notes: '',
  })
  
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: '', quantity: 1, unitPrice: 0 },
  ])

  const VAT_RATE = 0.15

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      const response = await fetch('/api/clients?limit=100')
      if (response.ok) {
        const data = await response.json()
        setClients(data.data || data.items || [])
      }
    } catch (error) {
      console.error('Failed to load clients:', error)
    }
  }

  const addItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0 },
    ])
  }

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id))
    }
  }

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
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

    if (!formData.dueDate) {
      toast({
        title: 'خطأ',
        description: 'يرجى تحديد تاريخ الاستحقاق',
        variant: 'destructive',
      })
      return
    }

    const validItems = items.filter(item => item.description && item.unitPrice > 0)
    if (validItems.length === 0) {
      toast({
        title: 'خطأ',
        description: 'يرجى إضافة بند واحد على الأقل',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: formData.customerId,
          bookingId: formData.bookingId || null,
          dueDate: formData.dueDate,
          notes: formData.notes || null,
          items: validItems.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
          })),
          subtotal,
          vatAmount,
          totalAmount,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'فشل إنشاء الفاتورة')
      }

      const invoice = await response.json()

      toast({
        title: 'تم الإنشاء',
        description: 'تم إنشاء الفاتورة بنجاح',
      })

      router.push(`/admin/invoices/${invoice.id || invoice.data?.id}`)
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل إنشاء الفاتورة',
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
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            فاتورة جديدة
          </h1>
          </div>
        <Button variant="outline" asChild>
          <Link href="/admin/invoices">
            <ArrowRight className="h-4 w-4 ml-2" />
            إلغاء
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer & Details */}
        <Card>
          <CardHeader>
            <CardTitle>معلومات الفاتورة</CardTitle>
            <CardDescription>اختر العميل وحدد تاريخ الاستحقاق</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label>تاريخ الاستحقاق *</Label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>بنود الفاتورة</CardTitle>
                <CardDescription>أضف البنود والخدمات المطلوب فوترتها</CardDescription>
              </div>
              <Button type="button" variant="outline" onClick={addItem}>
                <Plus className="h-4 w-4 ml-2" />
                إضافة بند
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id} className="flex gap-4 items-start p-4 border rounded-lg">
                <div className="flex-1 space-y-2">
                  <Label>الوصف</Label>
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    placeholder="وصف البند أو الخدمة"
                  />
                </div>
                <div className="w-24 space-y-2">
                  <Label>الكمية</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                  />
                </div>
                <div className="w-32 space-y-2">
                  <Label>سعر الوحدة</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                    placeholder="0.00"
                  />
                </div>
                <div className="w-32 space-y-2">
                  <Label>الإجمالي</Label>
                  <div className="h-10 flex items-center font-medium">
                    {formatCurrency(item.quantity * item.unitPrice)}
                  </div>
                </div>
                <div className="pt-8">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}

            <div className="border-t my-4" />

            {/* Totals */}
            <div className="space-y-2 max-w-sm mr-auto">
              <div className="flex justify-between">
                <span className="text-muted-foreground">المجموع الفرعي</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ضريبة القيمة المضافة (15%)</span>
                <span>{formatCurrency(vatAmount)}</span>
              </div>
              <div className="border-t my-2" />
              <div className="flex justify-between text-lg font-bold">
                <span>الإجمالي</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </div>
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
              placeholder="ملاحظات إضافية تظهر في الفاتورة..."
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/invoices">إلغاء</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 ml-2" />
                إنشاء الفاتورة
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
