/**
 * @file page.tsx
 * @description Create new booking page
 * @module app/admin/(routes)/bookings/new
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Loader2, Plus, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { createBookingSchema, type CreateBookingInput } from '@/lib/validators/booking.validator'
import { Badge } from '@/components/ui/badge'

interface User {
  id: string
  name: string | null
  email: string
}

interface Equipment {
  id: string
  sku: string
  model: string | null
  category?: {
    name: string
  }
  brand?: {
    name: string
  } | null
}

export default function NewBookingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([])
  const [availabilityMap, setAvailabilityMap] = useState<
    Record<string, { available: boolean; quantityAvailable?: number }>
  >({})
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [costPreview, setCostPreview] = useState<{
    subtotal: number
    vatAmount: number
    depositAmount: number
    totalAmount: number
  } | null>(null)
  const [costPreviewLoading, setCostPreviewLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateBookingInput>({
    resolver: zodResolver(createBookingSchema),
  })

  const customerId = watch('customerId')
  const startDate = watch('startDate')
  const endDate = watch('endDate')

  // Clear stale availability data whenever dates change
  useEffect(() => {
    setAvailabilityMap({})
  }, [startDate, endDate])

  useEffect(() => {
    loadUsers()
    loadEquipment()
  }, [])

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.data || data.users || data || [])
      }
    } catch (error) {
      console.error('Failed to load users:', error)
    }
  }

  const loadEquipment = async () => {
    try {
      const response = await fetch('/api/equipment?isActive=true&limit=100')
      if (response.ok) {
        const data = await response.json()
        setEquipment(data.items || [])
      }
    } catch (error) {
      console.error('Failed to load equipment:', error)
    }
  }

  const onSubmit = async (data: CreateBookingInput) => {
    if (selectedEquipment.length === 0) {
      toast({
        title: 'خطأ',
        description: 'يجب اختيار معدة واحدة على الأقل',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          equipmentIds: selectedEquipment,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'فشل إنشاء الحجز')
      }

      const booking = await response.json()

      toast({
        title: 'نجح',
        description: 'تم إنشاء الحجز بنجاح',
      })

      router.push(`/admin/bookings/${booking.id}`)
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل إنشاء الحجز',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleEquipment = (equipmentId: string) => {
    if (selectedEquipment.includes(equipmentId)) {
      // Removing: clean up that item's availability entry, keep the rest valid
      setSelectedEquipment((prev) => prev.filter((id) => id !== equipmentId))
      setAvailabilityMap((prev) => {
        const next = { ...prev }
        delete next[equipmentId]
        return next
      })
    } else {
      // Adding: invalidate all availability data so a re-check is required
      setSelectedEquipment((prev) => [...prev, equipmentId])
      setAvailabilityMap({})
    }
  }

  const removeEquipment = (equipmentId: string) => {
    setSelectedEquipment((prev) => prev.filter((id) => id !== equipmentId))
    setAvailabilityMap((prev) => {
      const next = { ...prev }
      delete next[equipmentId]
      return next
    })
  }

  const selectedEquipmentList = equipment.filter((eq) => selectedEquipment.includes(eq.id))

  const checkAvailability = async () => {
    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate) : null
    if (!start || !end || selectedEquipment.length === 0) {
      toast({ title: 'خطأ', description: 'اختر التواريخ والمعدات أولاً', variant: 'destructive' })
      return
    }
    setAvailabilityLoading(true)
    setAvailabilityMap({})
    try {
      const results: Record<string, { available: boolean; quantityAvailable?: number }> = {}
      await Promise.all(
        selectedEquipment.map(async (id) => {
          const res = await fetch(
            `/api/equipment/${id}/availability?startDate=${encodeURIComponent(start.toISOString())}&endDate=${encodeURIComponent(end.toISOString())}`
          )
          const data = res.ok ? await res.json() : { available: false }
          results[id] = { available: !!data.available, quantityAvailable: data.quantityAvailable }
        })
      )
      setAvailabilityMap(results)
      const anyUnavailable = Object.values(results).some((r) => !r.available)
      if (anyUnavailable) {
        toast({
          title: 'تنبيه',
          description: 'بعض المعدات غير متاحة للتواريخ المحددة',
          variant: 'destructive',
        })
      } else {
        toast({ title: 'تم', description: 'جميع المعدات متاحة' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل التحقق من التوفر', variant: 'destructive' })
    } finally {
      setAvailabilityLoading(false)
    }
  }

  const loadCostPreview = async () => {
    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate) : null
    if (!start || !end || selectedEquipment.length === 0) {
      setCostPreview(null)
      return
    }
    setCostPreviewLoading(true)
    try {
      const params = new URLSearchParams({
        equipmentIds: selectedEquipment.join(','),
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      })
      const res = await fetch(`/api/bookings/cost-preview?${params}`)
      if (res.ok) {
        const data = await res.json()
        setCostPreview({
          subtotal: data.subtotal ?? 0,
          vatAmount: data.vatAmount ?? 0,
          depositAmount: data.depositAmount ?? 0,
          totalAmount: data.totalAmount ?? 0,
        })
      } else {
        setCostPreview(null)
      }
    } catch {
      setCostPreview(null)
    } finally {
      setCostPreviewLoading(false)
    }
  }

  // Block submit unless every selected item has been checked AND is available.
  // This prevents: (a) submitting without any check, (b) submitting with partial checks
  // after adding new equipment, and (c) submitting when any item is unavailable.
  const hasUnavailable =
    selectedEquipment.length > 0 &&
    !selectedEquipment.every((id) => availabilityMap[id]?.available === true)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">حجز جديد</h1>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/bookings">
            <ArrowRight className="ms-2 h-4 w-4" />
            إلغاء
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>معلومات الحجز</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Customer Selection */}
            <div className="space-y-2">
              <Label htmlFor="customerId">العميل *</Label>
              <Select
                value={customerId || ''}
                onValueChange={(value) => setValue('customerId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر العميل" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.customerId && (
                <p className="text-sm text-error-500">{errors.customerId.message}</p>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">تاريخ البداية *</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  {...register('startDate')}
                  className={errors.startDate ? 'border-error-500' : ''}
                />
                {errors.startDate && (
                  <p className="text-sm text-error-500">{errors.startDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">تاريخ النهاية *</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  {...register('endDate')}
                  className={errors.endDate ? 'border-error-500' : ''}
                />
                {errors.endDate && (
                  <p className="text-sm text-error-500">{errors.endDate.message}</p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">ملاحظات</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                rows={3}
                placeholder="ملاحظات إضافية..."
                className={errors.notes ? 'border-error-500' : ''}
              />
              {errors.notes && <p className="text-sm text-error-500">{errors.notes.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Equipment Selection */}
        <Card>
          <CardHeader>
            <CardTitle>اختيار المعدات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Selected Equipment */}
            {selectedEquipmentList.length > 0 && (
              <div className="space-y-2">
                <Label>المعدات المختارة ({selectedEquipmentList.length})</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedEquipmentList.map((eq) => {
                    const av = availabilityMap[eq.id]
                    return (
                      <Badge key={eq.id} variant="secondary" className="gap-2">
                        {eq.sku}
                        {eq.model && ` - ${eq.model}`}
                        {av !== undefined && (
                          <span className={av.available ? 'text-green-600' : 'text-red-600'}>
                            {av.available
                              ? ` (متاح${av.quantityAvailable != null ? ` ${av.quantityAvailable}` : ''})`
                              : ' (غير متاح)'}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeEquipment(eq.id)}
                          className="ms-1 hover:text-error-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )
                  })}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={checkAvailability}
                  disabled={availabilityLoading || !startDate || !endDate}
                >
                  {availabilityLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'التحقق من التوفر'
                  )}
                </Button>
              </div>
            )}

            {/* Equipment List */}
            <div className="space-y-2">
              <Label>اختر المعدات *</Label>
              <div className="max-h-96 overflow-y-auto rounded-lg border p-4">
                {equipment.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    لا توجد معدات متاحة
                  </p>
                ) : (
                  <div className="space-y-2">
                    {equipment.map((eq) => {
                      const isSelected = selectedEquipment.includes(eq.id)
                      return (
                        <div
                          key={eq.id}
                          className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors ${
                            isSelected ? 'border-primary-300 bg-primary-50' : 'hover:bg-neutral-50'
                          }`}
                          onClick={() => toggleEquipment(eq.id)}
                        >
                          <div className="flex-1">
                            <div className="font-medium">{eq.sku}</div>
                            {eq.model && (
                              <div className="text-sm text-muted-foreground">{eq.model}</div>
                            )}
                            {eq.category && (
                              <div className="text-xs text-muted-foreground">
                                {eq.category.name}
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <Badge variant="default" className="ms-2">
                              مختار
                            </Badge>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              {selectedEquipment.length === 0 && (
                <p className="text-sm text-error-500">يجب اختيار معدة واحدة على الأقل</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cost preview & availability */}
        {selectedEquipment.length > 0 && startDate && endDate && (
          <Card>
            <CardHeader>
              <CardTitle>معاينة التكلفة والوديعة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadCostPreview}
                disabled={costPreviewLoading}
              >
                {costPreviewLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'معاينة التكلفة'
                )}
              </Button>
              {costPreview && (
                <dl className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <dt>المجموع الفرعي</dt>
                    <dd>{costPreview.subtotal.toLocaleString('ar-SA')} ر.س</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>ض.ق.م (15%)</dt>
                    <dd>{costPreview.vatAmount.toLocaleString('ar-SA')} ر.س</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>الوديعة (تقدير)</dt>
                    <dd>{costPreview.depositAmount.toLocaleString('ar-SA')} ر.س</dd>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-semibold">
                    <dt>الإجمالي</dt>
                    <dd>{costPreview.totalAmount.toLocaleString('ar-SA')} ر.س</dd>
                  </div>
                </dl>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/bookings">إلغاء</Link>
          </Button>
          <Button
            type="submit"
            disabled={loading || selectedEquipment.length === 0 || hasUnavailable}
          >
            {loading ? (
              <>
                <Loader2 className="ms-2 h-4 w-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Plus className="ms-2 h-4 w-4" />
                إنشاء الحجز
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
