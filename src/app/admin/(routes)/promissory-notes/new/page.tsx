/**
 * Admin – Create promissory note manually
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Save } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

interface UserOption {
  id: string
  name: string | null
  email: string
}

interface BookingOption {
  id: string
  bookingNumber: string
  customerId: string
  totalAmount: number
}

export default function NewPromissoryNotePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [users, setUsers] = useState<UserOption[]>([])
  const [bookings, setBookings] = useState<BookingOption[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [saving, setSaving] = useState(false)
  const [debtorId, setDebtorId] = useState('')
  const [bookingId, setBookingId] = useState('')
  const [amountSar, setAmountSar] = useState('')
  const [equipmentName, setEquipmentName] = useState('')
  const [expectedReturnDate, setExpectedReturnDate] = useState('')
  const [letterType, setLetterType] = useState<'generated' | 'pdf'>('generated')
  const [letterContent, setLetterContent] = useState('')

  useEffect(() => {
    fetch('/api/admin/users?pageSize=500')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed'))))
      .then((data) => setUsers(data.data || []))
      .catch(() => setUsers([]))
      .finally(() => setLoadingUsers(false))
  }, [])

  useEffect(() => {
    if (!debtorId) {
      setBookings([])
      setBookingId('')
      return
    }
    fetch(`/api/bookings?customerId=${debtorId}&limit=100`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed'))))
      .then((data) => setBookings(data.data || []))
      .catch(() => setBookings([]))
  }, [debtorId])

  useEffect(() => {
    if (bookingId) {
      const b = bookings.find((x) => x.id === bookingId)
      if (b) {
        setAmountSar(String(b.totalAmount))
      }
    }
  }, [bookingId, bookings])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!debtorId) {
      toast({ title: 'خطأ', description: 'اختر العميل', variant: 'destructive' })
      return
    }
    if (!bookingId && (!amountSar || Number(amountSar) <= 0)) {
      toast({ title: 'خطأ', description: 'أدخل المبلغ عند عدم ربط الحجز', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        debtorId,
        letterType,
      }
      if (bookingId) body.bookingId = bookingId
      if (!bookingId && amountSar) {
        body.amountSar = Number(amountSar)
        if (equipmentName.trim()) {
          body.equipmentItems = [{ name: equipmentName.trim(), purchaseValue: Number(amountSar), quantity: 1 }]
        }
        if (expectedReturnDate) body.expectedReturnDate = expectedReturnDate
      }
      if (letterType === 'generated' && letterContent.trim()) body.letterContent = letterContent.trim()

      const res = await fetch('/api/admin/promissory-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'فشل الإنشاء')

      toast({ title: 'تم', description: `تم إنشاء سند أمر ${data.noteNumber}` })
      router.push(`/admin/promissory-notes/${data.id}`)
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل إنشاء سند الأمر',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loadingUsers) {
    return (
      <div className="space-y-6" dir="rtl">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/promissory-notes">
            <ArrowRight className="ml-2 h-4 w-4" />
            العودة للقائمة
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">إضافة سند أمر</h1>
        <p className="text-muted-foreground mt-1">إنشاء سند أمر يدوياً وربطه بعميل أو حجز</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>البيانات الأساسية</CardTitle>
            <CardDescription>اختر العميل وربط الحجز (اختياري)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="debtor">العميل (مطلوب)</Label>
              <select
                id="debtor"
                value={debtorId}
                onChange={(e) => setDebtorId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                required
                aria-label="اختر العميل"
              >
                <option value="">— اختر العميل —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="booking">ربط بحجز (اختياري)</Label>
              <select
                id="booking"
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                disabled={!debtorId}
                aria-label="ربط بحجز"
              >
                <option value="">— بدون حجز —</option>
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bookingNumber} — {Number(b.totalAmount ?? 0).toLocaleString('ar-SA')} ريال
                  </option>
                ))}
              </select>
            </div>

            {!bookingId && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="amountSar">المبلغ (ريال)</Label>
                  <Input
                    id="amountSar"
                    type="number"
                    min="1"
                    value={amountSar}
                    onChange={(e) => setAmountSar(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="equipmentName">المعدات (اختياري)</Label>
                  <Input
                    id="equipmentName"
                    value={equipmentName}
                    onChange={(e) => setEquipmentName(e.target.value)}
                    placeholder="مثال: Sony FX3"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expectedReturnDate">تاريخ الإرجاع المتوقع (اختياري)</Label>
                  <Input
                    id="expectedReturnDate"
                    type="date"
                    value={expectedReturnDate}
                    onChange={(e) => setExpectedReturnDate(e.target.value)}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>نوع الخطاب</CardTitle>
            <CardDescription>إنشاء من النص أو رفع PDF</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button
                type="button"
                variant={letterType === 'generated' ? 'default' : 'outline'}
                onClick={() => setLetterType('generated')}
              >
                إنشاء سند
              </Button>
              <Button
                type="button"
                variant={letterType === 'pdf' ? 'default' : 'outline'}
                onClick={() => setLetterType('pdf')}
              >
                رفع PDF
              </Button>
            </div>

            {letterType === 'generated' && (
              <div className="space-y-2">
                <Label htmlFor="letterContent">نص الخطاب (اختياري — يُملأ من القالب إن تَركته فارغاً)</Label>
                <Textarea
                  id="letterContent"
                  value={letterContent}
                  onChange={(e) => setLetterContent(e.target.value)}
                  placeholder="اتركه فارغاً لاستخدام القالب من الإعدادات..."
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
            )}

            {letterType === 'pdf' && (
              <p className="text-sm text-muted-foreground">
                يمكنك رفع PDF بعد إنشاء السند من صفحة التفاصيل.
              </p>
            )}
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving}>
          <Save className="ml-2 h-4 w-4" />
          {saving ? 'جاري الحفظ...' : 'إنشاء سند الأمر'}
        </Button>
      </form>
    </div>
  )
}
