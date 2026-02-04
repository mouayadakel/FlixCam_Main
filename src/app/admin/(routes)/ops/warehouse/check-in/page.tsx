/**
 * @file check-in/page.tsx
 * @description Equipment check-in/return page for warehouse operations
 * @module app/admin/(routes)/ops/warehouse/check-in
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowRight, 
  Package, 
  CheckCircle, 
  AlertCircle,
  Search,
  User,
  Calendar,
  AlertTriangle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils/format.utils'

interface Booking {
  id: string
  bookingNumber: string
  startDate: string
  endDate: string
  status: string
  customer: {
    id: string
    name: string | null
    email: string
    phone?: string | null
  }
  equipment: Array<{
    id: string
    quantity: number
    checkedOut: boolean
    checkedIn: boolean
    equipment: {
      id: string
      sku: string
      model: string | null
      serialNumber?: string | null
    }
  }>
}

interface ItemCondition {
  itemId: string
  condition: 'good' | 'damaged' | 'missing'
  notes: string
}

const CONDITION_CONFIG = {
  good: { label: 'جيدة', color: 'bg-green-100 text-green-800' },
  damaged: { label: 'تالفة', color: 'bg-red-100 text-red-800' },
  missing: { label: 'مفقودة', color: 'bg-gray-100 text-gray-800' },
}

export default function CheckInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [itemConditions, setItemConditions] = useState<Map<string, ItemCondition>>(new Map())
  const [generalNotes, setGeneralNotes] = useState('')

  const bookingIdFromUrl = searchParams?.get('booking')

  useEffect(() => {
    loadBookings()
  }, [])

  useEffect(() => {
    if (bookingIdFromUrl && bookings.length > 0) {
      const booking = bookings.find(b => b.id === bookingIdFromUrl)
      if (booking) {
        setSelectedBooking(booking)
      }
    }
  }, [bookingIdFromUrl, bookings])

  const loadBookings = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/warehouse/queue/check-in')
      if (!response.ok) {
        throw new Error('فشل تحميل قائمة الإرجاع')
      }
      const data = await response.json()
      setBookings(data.data || [])
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحميل البيانات',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSelectBooking = (booking: Booking) => {
    setSelectedBooking(booking)
    setCheckedItems(new Set())
    setItemConditions(new Map())
    setGeneralNotes('')
  }

  const handleToggleItem = (itemId: string) => {
    const newChecked = new Set(checkedItems)
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId)
      // Remove condition when unchecked
      const newConditions = new Map(itemConditions)
      newConditions.delete(itemId)
      setItemConditions(newConditions)
    } else {
      newChecked.add(itemId)
      // Set default condition
      const newConditions = new Map(itemConditions)
      newConditions.set(itemId, { itemId, condition: 'good', notes: '' })
      setItemConditions(newConditions)
    }
    setCheckedItems(newChecked)
  }

  const handleConditionChange = (itemId: string, condition: 'good' | 'damaged' | 'missing') => {
    const newConditions = new Map(itemConditions)
    const existing = newConditions.get(itemId) || { itemId, condition: 'good', notes: '' }
    newConditions.set(itemId, { ...existing, condition })
    setItemConditions(newConditions)
  }

  const handleConditionNotes = (itemId: string, notes: string) => {
    const newConditions = new Map(itemConditions)
    const existing = newConditions.get(itemId) || { itemId, condition: 'good' as const, notes: '' }
    newConditions.set(itemId, { ...existing, notes })
    setItemConditions(newConditions)
  }

  const handleSelectAll = () => {
    if (!selectedBooking) return
    const allItems = selectedBooking.equipment.filter(e => e.checkedOut && !e.checkedIn).map(e => e.id)
    if (checkedItems.size === allItems.length) {
      setCheckedItems(new Set())
      setItemConditions(new Map())
    } else {
      setCheckedItems(new Set(allItems))
      const newConditions = new Map<string, ItemCondition>()
      allItems.forEach(id => {
        newConditions.set(id, { itemId: id, condition: 'good', notes: '' })
      })
      setItemConditions(newConditions)
    }
  }

  const handleCheckIn = async () => {
    if (!selectedBooking || checkedItems.size === 0) return

    setProcessing(true)
    try {
      const items = Array.from(checkedItems).map(id => {
        const condition = itemConditions.get(id)
        return {
          equipmentId: id,
          condition: condition?.condition || 'good',
          notes: condition?.notes || null,
        }
      })

      const response = await fetch(`/api/warehouse/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          items,
          generalNotes: generalNotes || null,
        }),
      })

      if (!response.ok) {
        throw new Error('فشل عملية الإرجاع')
      }

      toast({
        title: 'تم الإرجاع',
        description: `تم إرجاع ${checkedItems.size} معدات بنجاح`,
      })

      // Refresh data
      loadBookings()
      setSelectedBooking(null)
      setCheckedItems(new Set())
      setItemConditions(new Map())
      setGeneralNotes('')
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل عملية الإرجاع',
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  const filteredBookings = bookings.filter(b => 
    b.bookingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const hasDamagedItems = Array.from(itemConditions.values()).some(c => c.condition === 'damaged' || c.condition === 'missing')

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Package className="h-8 w-8" />
            إرجاع المعدات
          </h1>
          </div>
        <Button variant="outline" asChild>
          <Link href="/admin/ops/warehouse">
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bookings List */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>الحجوزات الجاهزة للإرجاع</CardTitle>
              <div className="relative mt-2">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : filteredBookings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد حجوزات جاهزة للإرجاع</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredBookings.map((booking) => {
                    const isOverdue = new Date(booking.endDate) < new Date()
                    return (
                      <div
                        key={booking.id}
                        onClick={() => handleSelectBooking(booking)}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedBooking?.id === booking.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                        } ${isOverdue ? 'border-red-200' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">{booking.bookingNumber}</Badge>
                          {isOverdue && (
                            <Badge variant="destructive" className="text-xs">متأخر</Badge>
                          )}
                        </div>
                        <p className="font-medium">
                          {booking.customer.name || booking.customer.email}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Check-in Form */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedBooking ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">اختر حجزاً من القائمة لبدء عملية الإرجاع</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Booking Info */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>معلومات الحجز</CardTitle>
                    <Badge>{selectedBooking.bookingNumber}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">العميل</p>
                        <p className="font-medium">
                          {selectedBooking.customer.name || selectedBooking.customer.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">تاريخ الإرجاع المتوقع</p>
                        <p className={`font-medium ${new Date(selectedBooking.endDate) < new Date() ? 'text-red-600' : ''}`}>
                          {formatDate(selectedBooking.endDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Equipment List with Condition */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>المعدات وحالتها</CardTitle>
                    <Button variant="outline" size="sm" onClick={handleSelectAll}>
                      {checkedItems.size === selectedBooking.equipment.filter(e => e.checkedOut && !e.checkedIn).length
                        ? 'إلغاء تحديد الكل'
                        : 'تحديد الكل'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedBooking.equipment.map((item) => {
                      const condition = itemConditions.get(item.id)
                      const isReturnable = item.checkedOut && !item.checkedIn
                      
                      return (
                        <div
                          key={item.id}
                          className={`p-4 border rounded-lg ${
                            item.checkedIn ? 'bg-green-50 border-green-200' : ''
                          } ${!item.checkedOut ? 'bg-gray-50 opacity-50' : ''}`}
                        >
                          <div className="flex items-start gap-4">
                            {item.checkedIn ? (
                              <CheckCircle className="h-5 w-5 text-green-600 mt-1" />
                            ) : isReturnable ? (
                              <Checkbox
                                checked={checkedItems.has(item.id)}
                                onCheckedChange={() => handleToggleItem(item.id)}
                                className="mt-1"
                              />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-gray-400 mt-1" />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{item.equipment.sku}</p>
                                  {item.equipment.model && (
                                    <p className="text-sm text-muted-foreground">{item.equipment.model}</p>
                                  )}
                                </div>
                                {item.checkedIn && (
                                  <Badge className="bg-green-100 text-green-800">تم الإرجاع</Badge>
                                )}
                                {!item.checkedOut && (
                                  <Badge variant="outline">لم يتم الإخراج</Badge>
                                )}
                              </div>

                              {/* Condition Selection */}
                              {checkedItems.has(item.id) && (
                                <div className="mt-3 space-y-2 p-3 bg-muted/50 rounded-lg">
                                  <div className="flex items-center gap-4">
                                    <Label className="min-w-[60px]">الحالة:</Label>
                                    <Select
                                      value={condition?.condition || 'good'}
                                      onValueChange={(value) => handleConditionChange(item.id, value as any)}
                                    >
                                      <SelectTrigger className="w-32">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="good">جيدة</SelectItem>
                                        <SelectItem value="damaged">تالفة</SelectItem>
                                        <SelectItem value="missing">مفقودة</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  {(condition?.condition === 'damaged' || condition?.condition === 'missing') && (
                                    <Input
                                      placeholder="وصف المشكلة..."
                                      value={condition?.notes || ''}
                                      onChange={(e) => handleConditionNotes(item.id, e.target.value)}
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Warning for damaged items */}
              {hasDamagedItems && (
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <p className="text-yellow-800">
                        يوجد معدات تالفة أو مفقودة. سيتم إنشاء تقرير تلف تلقائياً.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes & Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>ملاحظات الإرجاع</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    placeholder="ملاحظات عامة عن عملية الإرجاع..."
                    rows={3}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      تم تحديد {checkedItems.size} من {selectedBooking.equipment.filter(e => e.checkedOut && !e.checkedIn).length} معدات
                    </p>
                    <Button
                      onClick={handleCheckIn}
                      disabled={processing || checkedItems.size === 0}
                    >
                      {processing ? 'جاري الإرجاع...' : 'تأكيد الإرجاع'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
