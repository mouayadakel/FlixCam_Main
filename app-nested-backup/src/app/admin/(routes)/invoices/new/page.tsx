/**
 * @file invoices/new/page.tsx
 * @description Create new invoice page – professional layout (Daftara/Odoo style)
 * @module app/admin/(routes)/invoices/new
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Loader2, Plus, FileText, Trash2 } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils/format.utils'
import type { InvoiceType } from '@/lib/types/invoice.types'

interface Client {
  id: string
  name: string | null
  email: string
  phone?: string | null
}

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  days: number
}

const INVOICE_TYPES: { value: InvoiceType; labelAr: string }[] = [
  { value: 'booking', labelAr: 'حجز' },
  { value: 'deposit', labelAr: 'عربون' },
  { value: 'refund', labelAr: 'استرداد' },
  { value: 'adjustment', labelAr: 'تعديل' },
]

const VAT_RATE = 0.15

function toDateInputValue(d: Date): string {
  return d.toISOString().split('T')[0]
}

export default function NewInvoicePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])

  const today = toDateInputValue(new Date())
  const [formData, setFormData] = useState({
    customerId: searchParams?.get('customerId') || '',
    bookingId: searchParams?.get('bookingId') || '',
    issueDate: today,
    dueDate: '',
    type: 'booking' as InvoiceType,
    referencePo: '',
    notes: '',
    paymentTerms: '',
    discount: 0,
  })

  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: '', quantity: 1, unitPrice: 0, days: 1 },
  ])

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      const response = await fetch('/api/clients?pageSize=100')
      if (response.ok) {
        const data = await response.json()
        setClients(data.data || data.clients || [])
      }
    } catch (error) {
      console.error('Failed to load clients:', error)
    }
  }

  const selectedClient = clients.find((c) => c.id === formData.customerId)

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0, days: 1 },
    ])
  }

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((item) => item.id !== id))
    }
  }

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  const lineTotal = (item: InvoiceItem) =>
    item.quantity * (item.days || 1) * item.unitPrice
  const subtotal = items.reduce((sum, item) => sum + lineTotal(item), 0)
  const afterDiscount = Math.max(0, subtotal - formData.discount)
  const vatAmount = afterDiscount * VAT_RATE
  const totalAmount = afterDiscount + vatAmount

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

    const validItems = items.filter(
      (item) => item.description.trim() && item.unitPrice >= 0 && (item.days || 1) >= 1
    )
    if (validItems.length === 0) {
      toast({
        title: 'خطأ',
        description: 'يرجى إضافة بند واحد على الأقل (وصف، سعر، وأيام)',
        variant: 'destructive',
      })
      return
    }

    const notesWithRef =
      formData.referencePo.trim() && formData.notes.trim()
        ? `مرجع/أمر شراء: ${formData.referencePo}\n\n${formData.notes}`
        : formData.referencePo.trim()
          ? `مرجع/أمر شراء: ${formData.referencePo}`
          : formData.notes

    setLoading(true)
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: formData.customerId,
          bookingId: formData.bookingId || undefined,
          type: formData.type,
          issueDate: formData.issueDate,
          dueDate: formData.dueDate,
          items: validItems.map((item) => ({
            description: item.description.trim(),
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            days: item.days || 1,
          })),
          notes: notesWithRef || undefined,
          paymentTerms: formData.paymentTerms.trim() || undefined,
          discount: formData.discount > 0 ? formData.discount : undefined,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'فشل إنشاء الفاتورة')
      }

      const result = await response.json()
      const id = result.data?.id ?? result.id

      toast({
        title: 'تم الإنشاء',
        description: 'تم إنشاء الفاتورة بنجاح',
      })

      router.push(id ? `/admin/invoices/${id}` : '/admin/invoices')
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
    <div className="mx-auto max-w-4xl space-y-6 py-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <FileText className="h-6 w-6" />
          فاتورة جديدة
        </h1>
        <Button variant="outline" asChild>
          <Link href="/admin/invoices">
            <ArrowRight className="ms-2 h-4 w-4" />
            إلغاء
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 md:p-10">
          {/* 1. Header */}
          <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold uppercase tracking-wide text-gray-800">
                فاتورة
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                سيتم تعيين رقم الفاتورة تلقائياً بعد الحفظ
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                مسودة
              </Badge>
              <div className="h-10 w-28 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                الشعار
              </div>
            </div>
          </div>

          {/* 2. Client & Dates */}
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-gray-500">إصدار إلى</Label>
              <Select
                value={formData.customerId}
                onValueChange={(value) => setFormData((f) => ({ ...f, customerId: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="اختر العميل..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name || client.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedClient && (
                <p className="mt-2 text-sm text-gray-600">
                  {selectedClient.name && <span className="block font-medium">{selectedClient.name}</span>}
                  <span className="text-gray-500">{selectedClient.email}</span>
                  {selectedClient.phone && (
                    <span className="block text-gray-500">{selectedClient.phone}</span>
                  )}
                </p>
              )}
            </div>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-gray-500">تاريخ الإصدار</span>
                <Input
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => setFormData((f) => ({ ...f, issueDate: e.target.value }))}
                  className="max-w-[10rem]"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-gray-500">تاريخ الاستحقاق *</span>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData((f) => ({ ...f, dueDate: e.target.value }))}
                  min={formData.issueDate}
                  className="max-w-[10rem]"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-gray-500">نوع الفاتورة</span>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData((f) => ({ ...f, type: v as InvoiceType }))}
                >
                  <SelectTrigger className="max-w-[10rem]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVOICE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.labelAr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Reference / PO */}
          <div className="mt-6">
            <Label className="text-xs font-bold uppercase text-gray-500">
              مرجع / رقم أمر الشراء (اختياري)
            </Label>
            <Input
              value={formData.referencePo}
              onChange={(e) => setFormData((f) => ({ ...f, referencePo: e.target.value }))}
              placeholder="مثال: PO-2026-001"
              className="mt-1 max-w-md"
            />
          </div>

          {/* 3. Line Items Table */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-xs font-bold uppercase text-gray-500">بنود الفاتورة</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="ms-2 h-4 w-4" />
                إضافة بند
              </Button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full border-collapse text-end">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th className="p-3 text-xs font-semibold uppercase border-b">الوصف</th>
                    <th className="w-28 border-b p-3 text-xs font-semibold uppercase">سعر الوحدة / يوم (ر.س)</th>
                    <th className="w-20 border-b p-3 text-xs font-semibold uppercase">الكمية</th>
                    <th className="w-20 border-b p-3 text-xs font-semibold uppercase">الأيام</th>
                    <th className="w-28 border-b p-3 text-xs font-semibold uppercase">المبلغ (ر.س)</th>
                    <th className="w-12 border-b p-2" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 last:border-0">
                      <td className="p-2">
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          placeholder="وصف البند أو الخدمة"
                          className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.unitPrice || ''}
                          onChange={(e) =>
                            updateItem(item.id, 'unitPrice', Math.max(0, Number(e.target.value)))
                          }
                          placeholder="0.00"
                          className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(item.id, 'quantity', Math.max(1, Number(e.target.value) || 1))
                          }
                          className="border-0 bg-transparent text-center shadow-none focus-visible:ring-0"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min={1}
                          value={item.days}
                          onChange={(e) =>
                            updateItem(item.id, 'days', Math.max(1, Number(e.target.value) || 1))
                          }
                          className="border-0 bg-transparent text-center shadow-none focus-visible:ring-0"
                        />
                      </td>
                      <td className="p-3 font-medium tabular-nums">
                        {formatCurrency(lineTotal(item))}
                      </td>
                      <td className="p-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeItem(item.id)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Totals */}
          <div className="mt-6 flex justify-end">
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>المجموع الفرعي</span>
                <span className="tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              {formData.discount > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>الخصم</span>
                  <span className="tabular-nums">- {formatCurrency(formData.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-600">
                <span>ضريبة القيمة المضافة (15%)</span>
                <span className="tabular-nums">{formatCurrency(vatAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-3 text-lg font-bold">
                <span>الإجمالي</span>
                <span className="tabular-nums text-primary">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="pt-2">
                <Label className="text-xs text-gray-500">الخصم (ر.س) اختياري</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={formData.discount || ''}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, discount: Math.max(0, Number(e.target.value)) }))
                  }
                  placeholder="0"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* 5. Notes & Payment Terms */}
          <div className="mt-10 space-y-4">
            <div>
              <Label className="text-xs font-bold uppercase text-gray-500">ملاحظات</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
                placeholder="ملاحظات للعميل (مثال: شكراً لتعاملكم معنا)"
                className="mt-2 min-h-[4rem] bg-gray-50/50"
              />
            </div>
            <div>
              <Label className="text-xs font-bold uppercase text-gray-500">شروط الدفع</Label>
              <Textarea
                value={formData.paymentTerms}
                onChange={(e) => setFormData((f) => ({ ...f, paymentTerms: e.target.value }))}
                placeholder="تفاصيل التحويل البنكي أو طرق الدفع المقبولة"
                className="mt-2 min-h-[4rem] bg-gray-50/50"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-10 flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 pt-6">
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/invoices">إلغاء</Link>
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="ms-2 h-4 w-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Plus className="ms-2 h-4 w-4" />
                  إنشاء الفاتورة
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
