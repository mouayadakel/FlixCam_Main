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
import { Plus, Eye, FileText, ArrowRight, RefreshCw, AlertTriangle, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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
import { EmptyState } from '@/components/states/empty-state'
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

const STATUS_LABELS: Record<
  QuoteStatus,
  { ar: string; en: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
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

  const summary = useMemo(() => {
    const now = new Date()
    return {
      draft: quotes.filter((q) => q.status === 'draft').length,
      sent: quotes.filter((q) => q.status === 'sent').length,
      accepted: quotes.filter((q) => q.status === 'accepted').length,
      expiringSoon: quotes.filter(
        (q) =>
          (q.status === 'sent' || q.status === 'draft') &&
          new Date(q.validUntil) > now &&
          (new Date(q.validUntil).getTime() - now.getTime()) / 86400000 <= 3
      ).length,
      totalValue: quotes
        .filter((q) => q.status !== 'rejected' && q.status !== 'expired')
        .reduce((s, q) => s + Number(q.totalAmount), 0),
    }
  }, [quotes])

  const getStatusLabel = (status: QuoteStatus) => {
    return STATUS_LABELS[status]?.ar || status
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">عروض الأسعار</h1>
          <p className="mt-2 text-muted-foreground">إدارة عروض الأسعار وتحويلها إلى حجوزات</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadQuotes} disabled={loading}>
            <RefreshCw className={`ml-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          <Button asChild>
            <Link href="/admin/quotes/new">
              <Plus className="ml-2 h-4 w-4" />
              عرض جديد
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card
          className="cursor-pointer hover:border-primary/50"
          onClick={() => setStatusFilter('draft')}
        >
          <CardContent className="pb-3 pt-4">
            <p className="text-sm text-muted-foreground">مسودة</p>
            <p className="text-2xl font-bold">{summary.draft}</p>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:border-primary/50"
          onClick={() => setStatusFilter('sent')}
        >
          <CardContent className="pb-3 pt-4">
            <p className="text-sm text-muted-foreground">مرسل</p>
            <p className="text-2xl font-bold text-blue-600">{summary.sent}</p>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:border-primary/50"
          onClick={() => setStatusFilter('accepted')}
        >
          <CardContent className="pb-3 pt-4">
            <p className="text-sm text-muted-foreground">مقبول</p>
            <p className="text-2xl font-bold text-green-600">{summary.accepted}</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer hover:border-primary/50 ${summary.expiringSoon > 0 ? 'border-amber-300' : ''}`}
        >
          <CardContent className="pb-3 pt-4">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-amber-500" />
              <p className="text-sm text-muted-foreground">تنتهي قريباً</p>
            </div>
            <p className={`text-2xl font-bold ${summary.expiringSoon > 0 ? 'text-amber-600' : ''}`}>
              {summary.expiringSoon}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-3 pt-4">
            <p className="text-sm text-muted-foreground">إجمالي القيمة</p>
            <p className="text-lg font-bold">{summary.totalValue.toLocaleString('ar-SA')} ر.س</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="البحث برقم العرض أو العميل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border px-4 py-2"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border px-4 py-2"
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status === 'all' ? 'الكل' : STATUS_LABELS[status as QuoteStatus]?.ar || status}
            </option>
          ))}
        </select>
      </div>

      {/* Quotes Table */}
      <div className="rounded-lg border">
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
                <TableCell colSpan={7} className="p-0">
                  <EmptyState
                    title="لا توجد عروض أسعار"
                    description="لم يتم العثور على عروض أسعار تطابق الفلتر. أنشئ عرض سعر جديد من الزر أدناه."
                    icon={<FileText className="h-12 w-12" />}
                    actionLabel="عرض سعر جديد"
                    actionHref="/admin/quotes/new"
                  />
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
                      <div className="text-sm text-muted-foreground">{quote.customer.email}</div>
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
                    {(() => {
                      const now = new Date()
                      const expiry = new Date(quote.validUntil)
                      const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / 86400000)
                      const isExpired = expiry < now
                      const isExpiringSoon = !isExpired && daysLeft <= 3
                      return (
                        <div className="flex items-center gap-1">
                          {isExpired ? (
                            <span className="text-destructive">{formatDate(quote.validUntil)}</span>
                          ) : isExpiringSoon ? (
                            <>
                              <AlertTriangle className="h-3 w-3 text-amber-500" />
                              <span className="text-amber-600">{formatDate(quote.validUntil)}</span>
                              <span className="text-xs text-amber-500">({daysLeft}د)</span>
                            </>
                          ) : (
                            <span>{formatDate(quote.validUntil)}</span>
                          )}
                        </div>
                      )
                    })()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/admin/quotes/${quote.id}`}>
                        <Button size="sm" variant="ghost">
                          <Eye className="ml-1 h-4 w-4" />
                          عرض
                        </Button>
                      </Link>
                      {quote.status !== 'converted' &&
                      quote.status !== 'rejected' &&
                      quote.status !== 'expired' ? (
                        <Button size="sm" onClick={() => handleConvert(quote.id)}>
                          <ArrowRight className="ml-1 h-4 w-4" />
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
          <div className="text-sm text-muted-foreground">إجمالي {total} عرض</div>
        </div>
      )}
    </div>
  )
}
