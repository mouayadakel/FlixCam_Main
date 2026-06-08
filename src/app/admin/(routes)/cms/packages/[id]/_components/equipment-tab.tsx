/**
 * Equipment tab: Manage items inside the kit
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Plus, Trash2, Loader2, Package, Info } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/i18n/formatting'

interface KitItem {
  equipmentId: string
  quantity: number
  equipment: {
    id: string
    sku: string
    model: string | null
    dailyPrice: string | number
  }
}

interface EquipmentTabProps {
  initialItems: KitItem[]
  discountPercent: number
  onSave: (items: { equipmentId: string; quantity: number }[]) => Promise<void>
  onDirtyChange: (dirty: boolean) => void
  saving: boolean
}

export function CmsPackageEquipmentTab({
  initialItems,
  discountPercent,
  onSave,
  onDirtyChange,
  saving,
}: EquipmentTabProps) {
  const { toast } = useToast()
  const [items, setItems] = useState<KitItem[]>([])
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    setItems(initialItems || [])
  }, [initialItems])

  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/equipment?search=${encodeURIComponent(q)}&isActive=true&limit=10`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.items || [])
      }
    } catch {
      // ignore
    } finally {
      setSearching(false)
    }
  }, [])

  const addItem = (eq: any) => {
    const existing = items.find((i) => i.equipmentId === eq.id)
    if (existing) {
      setItems(
        items.map((i) => (i.equipmentId === eq.id ? { ...i, quantity: i.quantity + 1 } : i))
      )
    } else {
      setItems([
        ...items,
        {
          equipmentId: eq.id,
          quantity: 1,
          equipment: {
            id: eq.id,
            sku: eq.sku,
            model: eq.model,
            dailyPrice: eq.dailyPrice,
          },
        },
      ])
    }
    onDirtyChange(true)
    setSearch('')
    setSearchResults([])
  }

  const removeItem = (id: string) => {
    setItems(items.filter((i) => i.equipmentId !== id))
    onDirtyChange(true)
  }

  const updateQuantity = (id: string, q: number) => {
    if (q < 1) return
    setItems(items.map((i) => (i.equipmentId === id ? { ...i, quantity: q } : i)))
    onDirtyChange(true)
  }

  const calculateTotals = () => {
    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.equipment.dailyPrice || 0) * item.quantity,
      0
    )
    const rawDiscount = subtotal * (discountPercent / 100)
    const discount = Math.round(rawDiscount * 100) / 100
    const total = Math.round((subtotal - discount) * 100) / 100
    const savings = Math.round(discount * 100) / 100
    return { subtotal, discount, total, savings }
  }

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast({ title: 'خطأ', description: 'يجب إضافة قطعة واحدة على الأقل', variant: 'destructive' })
      return
    }
    await onSave(items.map((i) => ({ equipmentId: i.equipmentId, quantity: i.quantity })))
    onDirtyChange(false)
  }

  const { subtotal, discount, total, savings } = calculateTotals()

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>محتويات الباقة</CardTitle>
          <CardDescription>أضف المعدات التي تتكون منها هذه الباقة</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search Box */}
          <div className="relative">
            <Label htmlFor="eq-search" className="mb-2 block">إضافة معدات</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="eq-search"
                  placeholder="ابحث عن معدة بالاسم أو SKU..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    handleSearch(e.target.value)
                  }}
                  className="pe-10"
                />
              </div>
            </div>

            {searchResults.length > 0 && (
              <Card className="absolute top-full z-10 mt-1 w-full shadow-xl">
                <CardContent className="p-2">
                  <div className="max-h-60 overflow-y-auto divide-y">
                    {searchResults.map((eq) => (
                      <button
                        key={eq.id}
                        className="flex w-full items-center justify-between p-2 text-start transition-colors hover:bg-muted"
                        onClick={() => addItem(eq)}
                      >
                        <div>
                          <p className="font-medium">{eq.model || eq.sku}</p>
                          <p className="text-xs text-muted-foreground">{eq.sku}</p>
                        </div>
                        <div className="text-sm font-semibold text-primary">
                          {formatCurrency(Number(eq.dailyPrice), 'ar')}
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {searching && (
              <div className="absolute top-full z-10 mt-1 w-full rounded-lg border bg-background p-4 text-center">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المعدة</TableHead>
                  <TableHead className="text-center">الكمية</TableHead>
                  <TableHead>السعر اليومي (للقطعة)</TableHead>
                  <TableHead>المجموع</TableHead>
                  <TableHead className="text-end"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                      <Package className="mx-auto mb-2 h-12 w-12 opacity-20" />
                      لا توجد معدات مضافة لهذه الباقة
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.equipmentId}>
                      <TableCell>
                        <p className="font-medium">{item.equipment.model}</p>
                        <p className="text-xs text-muted-foreground">{item.equipment.sku}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.equipmentId, Number(e.target.value))}
                          className="mx-auto h-8 w-16 text-center"
                        />
                      </TableCell>
                      <TableCell>{formatCurrency(Number(item.equipment.dailyPrice), 'ar')}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(Number(item.equipment.dailyPrice) * item.quantity, 'ar')}
                      </TableCell>
                      <TableCell className="text-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.equipmentId)}
                          className="text-destructive h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pricing Summary */}
          {items.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 dark:border-slate-800 dark:bg-slate-900/30">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">مجموع الأسعار الفردية (Retail price sum):</span>
                <span className="font-semibold line-through text-slate-400">{formatCurrency(subtotal, 'ar')}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-green-600 font-bold">نسبة خصم الباقة (Bundle discount):</span>
                <span className="text-green-600 font-bold bg-green-50 dark:bg-green-950/20 px-2 py-0.5 rounded">%{discountPercent}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b pb-2 border-slate-100 dark:border-slate-800">
                <span className="text-green-600 font-bold">توفير للعميل (Money saved):</span>
                <span className="text-green-600 font-black">-{formatCurrency(savings, 'ar')}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-base font-black">سعر الباقة الإجمالي المعتمد (Bundle kit price):</span>
                <span className="text-2xl font-black text-primary">{formatCurrency(total, 'ar')}</span>
              </div>
              <p className="text-[10px] text-muted-foreground text-start">سيتم تطبيق سعر الباقة الإجمالي المعتمد {formatCurrency(total, 'ar')} في السلة بدلاً من السعر الفردي للمعدات.</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-4">
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin ms-2" /> : null}
              حفظ قائمة المعدات
            </Button>
            <div className="flex items-center gap-2 text-xs text-amber-600">
              <Info className="h-4 w-4" />
              <span>تعديل المعدات هنا سيؤثر مباشرة على الكيت المرتبط بهذه الباقة</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
