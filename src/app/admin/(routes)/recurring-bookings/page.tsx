/**
 * @file page.tsx
 * @description Recurring booking series list with filters
 * @module app/admin/(routes)/recurring-bookings
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Eye, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { EmptyState } from '@/components/states/empty-state'
import { formatDate } from '@/lib/utils/format.utils'

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: 'يومي',
  WEEKLY: 'أسبوعي',
  MONTHLY: 'شهري',
}

interface RecurringSeriesItem {
  id: string
  name: string
  customerId: string
  customer: { id: string; name: string | null; email: string }
  frequency: string
  interval: number
  endDate: string | null
  occurrenceCount: number | null
  isActive: boolean
  bookingCount: number
  createdAt: string
}

export default function RecurringBookingsPage() {
  const { toast } = useToast()
  const [series, setSeries] = useState<RecurringSeriesItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isActiveFilter, setIsActiveFilter] = useState<string>('')
  const [customerIdFilter, setCustomerIdFilter] = useState<string>('')
  const [customers, setCustomers] = useState<
    Array<{ id: string; name: string | null; email: string }>
  >([])

  useEffect(() => {
    loadSeries()
  }, [isActiveFilter, customerIdFilter])

  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    try {
      const res = await fetch('/api/clients?limit=500')
      if (res.ok) {
        const data = await res.json()
        const list = data.data ?? data.clients ?? data ?? []
        setCustomers(Array.isArray(list) ? list : [])
      }
    } catch {
      // ignore
    }
  }

  const loadSeries = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (isActiveFilter === 'true' || isActiveFilter === 'false')
        params.set('isActive', isActiveFilter)
      if (customerIdFilter) params.set('customerId', customerIdFilter)
      const res = await fetch(`/api/recurring-series?${params.toString()}`)
      if (!res.ok) throw new Error('فشل تحميل السلسلة')
      const data = await res.json()
      setSeries(data.series ?? [])
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحميل الحجوزات المتكررة',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">الحجوزات المتكررة</h1>
        <Button asChild>
          <Link href="/admin/recurring-bookings/new">
            <Plus className="ml-2 h-4 w-4" />
            سلسلة جديدة
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-4">
        <Select value={isActiveFilter} onValueChange={setIsActiveFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">الكل</SelectItem>
            <SelectItem value="true">نشط</SelectItem>
            <SelectItem value="false">غير نشط</SelectItem>
          </SelectContent>
        </Select>
        <Select value={customerIdFilter} onValueChange={setCustomerIdFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="العميل" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">كل العملاء</SelectItem>
            {customers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name || c.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={loadSeries} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>العميل</TableHead>
              <TableHead>التكرار</TableHead>
              <TableHead>عدد الحجوزات</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>تاريخ الإنشاء</TableHead>
              <TableHead className="text-right">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                </TableRow>
              ))
            ) : series.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <EmptyState
                    title="لا توجد سلاسل حجوزات متكررة"
                    description="لم يتم العثور على سلاسل حجوزات متكررة. أنشئ سلسلة جديدة من الزر أدناه."
                    icon={<RefreshCw className="h-12 w-12" />}
                    actionLabel="سلسلة حجوزات متكررة جديدة"
                    actionHref="/admin/recurring-bookings/new"
                  />
                </TableCell>
              </TableRow>
            ) : (
              series.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{s.customer?.name ?? '—'}</div>
                      <div className="text-sm text-muted-foreground">{s.customer?.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    كل {s.interval} {FREQUENCY_LABELS[s.frequency] ?? s.frequency}
                  </TableCell>
                  <TableCell>{s.bookingCount}</TableCell>
                  <TableCell>
                    <Badge variant={s.isActive ? 'default' : 'secondary'}>
                      {s.isActive ? 'نشط' : 'غير نشط'}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(s.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/recurring-bookings/${s.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
