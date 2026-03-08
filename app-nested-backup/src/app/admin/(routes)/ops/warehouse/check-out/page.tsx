/**
 * @file check-out/page.tsx
 * @description Equipment check-out page for warehouse operations
 * @module app/admin/(routes)/ops/warehouse/check-out
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
  Camera,
  User,
  Calendar,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
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
    equipment: {
      id: string
      sku: string
      model: string | null
      serialNumber?: string | null
    }
  }>
}

export default function CheckOutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState('')

  const bookingIdFromUrl = searchParams?.get('booking')

  useEffect(() => {
    loadBookings()
  }, [])

  useEffect(() => {
    if (bookingIdFromUrl && bookings.length > 0) {
      const booking = bookings.find((b) => b.id === bookingIdFromUrl)
      if (booking) {
        setSelectedBooking(booking)
      }
    }
  }, [bookingIdFromUrl, bookings])

  const loadBookings = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/warehouse/queue/check-out')
      if (!response.ok) {
        throw new Error('فشل تحميل قائمة الإخراج')
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
    setNotes('')
  }

  const handleToggleItem = (itemId: string) => {
    const newChecked = new Set(checkedItems)
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId)
    } else {
      newChecked.add(itemId)
    }
    setCheckedItems(newChecked)
  }

  const handleSelectAll = () => {
    if (!selectedBooking) return
    const allItems = selectedBooking.equipment.filter((e) => !e.checkedOut).map((e) => e.id)
    if (checkedItems.size === allItems.length) {
      setCheckedItems(new Set())
    } else {
      setCheckedItems(new Set(allItems))
    }
  }

  const handleCheckOut = async () => {
    if (!selectedBooking || checkedItems.size === 0) return

    setProcessing(true)
    try {
      const response = await fetch(`/api/warehouse/check-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          equipmentIds: Array.from(checkedItems),
          notes: notes || null,
        }),
      })

      if (!response.ok) {
        throw new Error('فشل عملية الإخراج')
      }

      toast({
        title: 'تم الإخراج',
        description: `تم إخراج ${checkedItems.size} معدات بنجاح`,
      })

      // Refresh data
      loadBookings()
      setSelectedBooking(null)
      setCheckedItems(new Set())
      setNotes('')
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل عملية الإخراج',
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  const filteredBookings = bookings.filter(
    (b) =>
      b.bookingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <Package className="h-8 w-8" />
            إخراج المعدات
          </h1>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/ops/warehouse">
            <ArrowRight className="ms-2 h-4 w-4" />
            العودة
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Bookings List */}
        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>الحجوزات الجاهزة للإخراج</CardTitle>
              <div className="relative mt-2">
                <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="بحث..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 pe-10 text-base"
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
                <div className="py-8 text-center text-muted-foreground">
                  <Package className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>لا توجد حجوزات جاهزة للإخراج</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredBookings.map((booking) => (
                    <div
                      key={booking.id}
                      onClick={() => handleSelectBooking(booking)}
                      className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                        selectedBooking?.id === booking.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <Badge variant="outline">{booking.bookingNumber}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {booking.equipment.length} معدات
                        </span>
                      </div>
                      <p className="font-medium">
                        {booking.customer.name || booking.customer.email}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Check-out Form */}
        <div className="space-y-4 lg:col-span-2">
          {!selectedBooking ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Package className="mx-auto mb-4 h-16 w-16 opacity-50" />
                  <p className="text-lg">اختر حجزاً من القائمة لبدء عملية الإخراج</p>
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
                        <p className="text-sm text-muted-foreground">فترة الإيجار</p>
                        <p className="font-medium">
                          {formatDate(selectedBooking.startDate)} -{' '}
                          {formatDate(selectedBooking.endDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Equipment List */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>المعدات</CardTitle>
                    <Button variant="outline" size="sm" onClick={handleSelectAll}>
                      {checkedItems.size ===
                      selectedBooking.equipment.filter((e) => !e.checkedOut).length
                        ? 'إلغاء تحديد الكل'
                        : 'تحديد الكل'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedBooking.equipment.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-4 rounded-lg border p-4 ${
                          item.checkedOut ? 'border-green-200 bg-green-50' : ''
                        }`}
                      >
                        {item.checkedOut ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Checkbox
                            checked={checkedItems.has(item.id)}
                            onCheckedChange={() => handleToggleItem(item.id)}
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{item.equipment.sku}</p>
                          {item.equipment.model && (
                            <p className="text-sm text-muted-foreground">{item.equipment.model}</p>
                          )}
                          {item.equipment.serialNumber && (
                            <p className="font-mono text-xs text-muted-foreground">
                              S/N: {item.equipment.serialNumber}
                            </p>
                          )}
                        </div>
                        <div className="text-start">
                          <Badge variant="outline">الكمية: {item.quantity}</Badge>
                        </div>
                        {item.checkedOut && (
                          <Badge className="bg-green-100 text-green-800">تم الإخراج</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Notes & Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>ملاحظات الإخراج</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="ملاحظات إضافية عن حالة المعدات..."
                    rows={3}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      تم تحديد {checkedItems.size} من{' '}
                      {selectedBooking.equipment.filter((e) => !e.checkedOut).length} معدات
                    </p>
                    <Button
                      onClick={handleCheckOut}
                      disabled={processing || checkedItems.size === 0}
                      size="lg"
                      className="min-h-[44px] w-full sm:w-auto"
                    >
                      {processing ? 'جاري الإخراج...' : 'تأكيد الإخراج'}
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
