/**
 * @file contracts/page.tsx
 * @description Contracts list page
 * @module app/admin/(routes)/contracts
 * @author Engineering Team
 * @created 2026-01-28
 */

'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  Eye,
  FileText,
  CheckCircle,
  XCircle,
  Download,
  PenTool,
  Clock,
  AlertTriangle,
} from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { formatDate } from '@/lib/utils/format.utils'
import { exportToCSV } from '@/lib/utils/export.utils'
import { TablePagination } from '@/components/tables/table-pagination'
import { useToast } from '@/hooks/use-toast'
import { TableSkeleton } from '@/components/admin/table-skeleton'
import { EmptyState } from '@/components/states/empty-state'
import type { ContractStatus } from '@/lib/types/contract.types'

interface Contract {
  id: string
  bookingId: string
  termsVersion: string
  signedAt?: string | null
  signedBy?: string | null
  status: ContractStatus
  booking?: {
    id: string
    bookingNumber: string
    customerId: string
    customer?: {
      id: string
      name: string | null
      email: string
    }
  } | null
  createdAt: string
  updatedAt: string
}

const STATUS_LABELS: Record<
  ContractStatus,
  { ar: string; en: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  draft: { ar: 'مسودة', en: 'Draft', variant: 'outline' },
  pending_signature: { ar: 'في انتظار التوقيع', en: 'Pending Signature', variant: 'secondary' },
  signed: { ar: 'موقّع', en: 'Signed', variant: 'default' },
  expired: { ar: 'منتهي', en: 'Expired', variant: 'destructive' },
  cancelled: { ar: 'ملغي', en: 'Cancelled', variant: 'destructive' },
}

export default function ContractsPage() {
  const { toast } = useToast()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [signedFilter, setSignedFilter] = useState<string>('all')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const statuses: Array<ContractStatus | 'all'> = [
    'all',
    'draft',
    'pending_signature',
    'signed',
    'expired',
    'cancelled',
  ]

  const loadContracts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (signedFilter === 'true') params.set('signed', 'true')
      else if (signedFilter === 'false') params.set('signed', 'false')
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))

      const response = await fetch(`/api/contracts?${params.toString()}`)
      if (!response.ok) {
        throw new Error('فشل تحميل العقود')
      }

      const data = await response.json()
      setContracts(data.data || [])
      setTotal(data.total ?? 0)
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحميل العقود',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [statusFilter, signedFilter, page, pageSize, dateFrom, dateTo, toast])

  useEffect(() => {
    loadContracts()
  }, [loadContracts])

  const filteredContracts = useMemo(() => {
    return contracts
  }, [contracts])

  const statusSummary = useMemo(() => {
    const counts: Record<string, number> = {
      draft: 0,
      pending_signature: 0,
      signed: 0,
      expired: 0,
      cancelled: 0,
    }
    for (const c of contracts) counts[c.status] = (counts[c.status] || 0) + 1
    return counts
  }, [contracts])

  const getStatusLabel = (status: ContractStatus) => {
    return STATUS_LABELS[status]?.ar || status
  }

  const getStatusVariant = (status: ContractStatus) => {
    return STATUS_LABELS[status]?.variant || 'default'
  }

  const handleExportCSV = () => {
    const rows = filteredContracts.map((c) => ({
      id: c.id,
      bookingNumber: c.booking?.bookingNumber ?? '',
      customerName: c.booking?.customer?.name ?? '',
      termsVersion: c.termsVersion,
      status: getStatusLabel(c.status),
      signedAt: c.signedAt ? formatDate(c.signedAt) : '',
      createdAt: formatDate(c.createdAt),
    }))
    exportToCSV(rows, `contracts-${new Date().toISOString().slice(0, 10)}`, [
      { key: 'id', label: 'المعرف' },
      { key: 'bookingNumber', label: 'رقم الحجز' },
      { key: 'customerName', label: 'العميل' },
      { key: 'termsVersion', label: 'إصدار الشروط' },
      { key: 'status', label: 'الحالة' },
      { key: 'signedAt', label: 'تاريخ التوقيع' },
      { key: 'createdAt', label: 'تاريخ الإنشاء' },
    ])
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">العقود</h1>
          <p className="mt-2 text-muted-foreground">إدارة العقود والتوقيعات</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          disabled={filteredContracts.length === 0}
        >
          <Download className="ms-2 h-4 w-4" />
          تصدير CSV
        </Button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card
          className="cursor-pointer hover:border-primary/50"
          onClick={() => setStatusFilter('draft')}
        >
          <CardContent className="pb-3 pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">مسودة</p>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{statusSummary.draft}</p>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:border-primary/50"
          onClick={() => setStatusFilter('pending_signature')}
        >
          <CardContent className="pb-3 pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">بانتظار التوقيع</p>
              <PenTool className="h-4 w-4 text-amber-500" />
            </div>
            <p
              className={`text-2xl font-bold ${statusSummary.pending_signature > 0 ? 'text-amber-600' : ''}`}
            >
              {statusSummary.pending_signature}
            </p>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:border-primary/50"
          onClick={() => setStatusFilter('signed')}
        >
          <CardContent className="pb-3 pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">موقّع</p>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600">{statusSummary.signed}</p>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:border-primary/50"
          onClick={() => setStatusFilter('expired')}
        >
          <CardContent className="pb-3 pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">منتهي</p>
              <Clock className="h-4 w-4 text-red-400" />
            </div>
            <p className={`text-2xl font-bold ${statusSummary.expired > 0 ? 'text-red-600' : ''}`}>
              {statusSummary.expired}
            </p>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:border-primary/50"
          onClick={() => setStatusFilter('cancelled')}
        >
          <CardContent className="pb-3 pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">ملغي</p>
              <XCircle className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold">{statusSummary.cancelled}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor="contracts-date-from" className="sr-only">
          من تاريخ
        </Label>
        <Input
          id="contracts-date-from"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="h-9 rounded-md border border-input"
          aria-label="من تاريخ"
        />
        <Label htmlFor="contracts-date-to" className="sr-only">
          إلى تاريخ
        </Label>
        <Input
          id="contracts-date-to"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="h-9 rounded-md border border-input"
          aria-label="إلى تاريخ"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 rounded-md border border-input" aria-label="فلتر الحالة">
            <SelectValue placeholder="جميع الحالات" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status === 'all'
                  ? 'جميع الحالات'
                  : STATUS_LABELS[status as ContractStatus]?.ar || status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={signedFilter} onValueChange={setSignedFilter}>
          <SelectTrigger className="h-9 rounded-md border border-input" aria-label="فلتر التوقيع">
            <SelectValue placeholder="جميع العقود" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع العقود</SelectItem>
            <SelectItem value="true">موقّعة</SelectItem>
            <SelectItem value="false">غير موقّعة</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Contracts Table */}
      <div className="rounded-lg border">
        {loading ? (
          <TableSkeleton
            rowCount={5}
            headers={[
              'رقم الحجز',
              'العميل',
              'إصدار الشروط',
              'الحالة',
              'تاريخ التوقيع',
              'تاريخ الإنشاء',
              'الإجراءات',
            ]}
          />
        ) : filteredContracts.length === 0 ? (
          <EmptyState
            title="لا توجد عقود"
            description="لم يتم العثور على عقود تطابق الفلتر. العقود تُنشأ تلقائياً عند تأكيد الحجوزات."
            icon={<FileText className="h-12 w-12" />}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الحجز</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>إصدار الشروط</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>تاريخ التوقيع</TableHead>
                <TableHead>تاريخ الإنشاء</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContracts.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell className="font-medium">
                    {contract.booking?.bookingNumber || contract.bookingId}
                  </TableCell>
                  <TableCell>
                    {contract.booking?.customer?.name || contract.booking?.customer?.email || '-'}
                  </TableCell>
                  <TableCell>{contract.termsVersion}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(contract.status)}>
                      {getStatusLabel(contract.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {contract.signedAt ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>{formatDate(contract.signedAt)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-gray-400" />
                        <span className="text-muted-foreground">غير موقّع</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(contract.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/admin/contracts/${contract.id}`}>
                        <Button size="sm" variant="ghost">
                          <Eye className="ms-1 h-4 w-4" />
                          عرض
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {!loading && total > 0 && (
        <TablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
          itemLabel="عقد"
          dir="rtl"
        />
      )}
    </div>
  )
}
