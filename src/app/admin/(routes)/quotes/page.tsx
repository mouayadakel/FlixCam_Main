/**
 * @file quotes/page.tsx
 * @description Quotes list page
 * @module app/admin/(routes)/quotes
 * @author Engineering Team
 * @created 2026-01-28
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Eye, FileText, ArrowRight } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils/format.utils'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import type { QuoteStatus } from '@/lib/types/quote.types'

interface Quote {
  id: string
  quoteNumber: string
  status: QuoteStatus
  startDate: string
  endDate: string
  totalAmount: number
  customer: {
    id: string
    name: string | null
    email: string
  }
  validUntil: string
  createdAt: string
}

const STATUS_LABELS: Record<QuoteStatus, { ar: string; en: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { ar: 'مسودة', en: 'Draft', variant: 'outline' },
  sent: { ar: 'مرسل', en: 'Sent', variant: 'secondary' },
  accepted: { ar: 'مقبول', en: 'Accepted', variant: 'default' },
  rejected: { ar: 'مرفوض', en: 'Rejected', variant: 'destructive' },
  expired: { ar: 'منتهي', en: 'Expired', variant: 'outline' },
  converted: { ar: 'محول', en: 'Converted', variant: 'default' },
}

export default function QuotesPage() {
  const { toast } = useToast()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [total, setTotal] = useState(0)

  const statuses: Array<QuoteStatus | 'all'> = [
    'all',
    'draft',
    'sent',
    'accepted',
    'rejected',
    'expired',
    'converted',
  ]

  useEffect(() => {
    loadQuotes()
  }, [statusFilter])

  const loadQuotes = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }
      params.set('page', '1')
      params.set('pageSize', '50')

      const response = await fetch(`/api/quotes?${params.toString()}`)
      if (!response.ok) {
        throw new Error('فشل تحميل عروض الأسعار')
      }

      const data = await response.json()
      setQuotes(data.data || [])
      setTotal(data.total || 0)
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحميل عروض الأسعار',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConvert = async (quoteId: string) => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}/convert`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'فشل تحويل العرض')
      }

      toast({
        title: 'نجح',
        description: 'تم تحويل العرض إلى حجز بنجاح',
      })

      loadQuotes()
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'حدث خطأ أثناء تحويل العرض',
        variant: 'destructive',
      })
    }
  }

  const filteredQuotes = useMemo(() => {
    if (!search) return quotes
    const searchLower = search.toLowerCase()
    return quotes.filter(
      (quote) =>
        quote.quoteNumber.toLowerCase().includes(searchLower) ||
        quote.customer.email.toLowerCase().includes(searchLower) ||
        quote.customer.name?.toLowerCase().includes(searchLower)
    )
  }, [quotes, search])

  const getStatusLabel = (status: QuoteStatus) => {
    return STATUS_LABELS[status]?.ar || status
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">عروض الأسعار</h1>
          <p className="text-muted-foreground mt-2">
            إدارة عروض الأسعار وتحويلها إلى حجوزات
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/quotes/new">
            <Plus className="h-4 w-4 ml-2" />
            عرض جديد
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <input
            type="text"
            placeholder="البحث برقم العرض أو العميل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status === 'all' ? 'الكل' : STATUS_LABELS[status as QuoteStatus]?.ar || status}
            </option>
          ))}
        </select>
      </div>

      {/* Quotes Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم العرض</TableHead>
              <TableHead>العميل</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>التواريخ</TableHead>
              <TableHead>المبلغ الإجمالي</TableHead>
              <TableHead>صالح حتى</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="space-y-2 py-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredQuotes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  لا توجد عروض أسعار
                </TableCell>
              </TableRow>
            ) : (
              filteredQuotes.map((quote) => (
                <TableRow key={quote.id}>
                  <TableCell className="font-medium">{quote.quoteNumber}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {quote.customer.name || quote.customer.email}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {quote.customer.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_LABELS[quote.status]?.variant || 'default'}>
                      {getStatusLabel(quote.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>من: {formatDate(quote.startDate)}</div>
                      <div>إلى: {formatDate(quote.endDate)}</div>
                    </div>
                  </TableCell>
                  <TableCell>{formatCurrency(quote.totalAmount)}</TableCell>
                  <TableCell>
                    <span className={new Date(quote.validUntil) < new Date() ? 'text-destructive' : ''}>
                      {formatDate(quote.validUntil)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/admin/quotes/${quote.id}`}>
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4 ml-1" />
                          عرض
                        </Button>
                      </Link>
                      {quote.status !== 'converted' && quote.status !== 'rejected' && quote.status !== 'expired' ? (
                        <Button
                          size="sm"
                          onClick={() => handleConvert(quote.id)}
                        >
                          <ArrowRight className="h-4 w-4 ml-1" />
                          تحويل
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {total > 50 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            إجمالي {total} عرض
          </div>
        </div>
      )}
    </div>
  )
}
