/**
 * @file clients-list-tab.tsx
 * @description Clients list tab content
 * @module app/admin/(routes)/clients/_components
 */

'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Eye, Download } from 'lucide-react'
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
import { EmptyState } from '@/components/states/empty-state'
import { Users } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format.utils'
import { exportToCSV } from '@/lib/utils/export.utils'
import { TablePagination } from '@/components/tables/table-pagination'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import type { ClientStatus } from '@/lib/types/client.types'

interface Client {
  id: string
  email: string
  name: string | null
  phone: string | null
  role: string
  status: ClientStatus
  verificationStatus?: string
  segmentName?: string | null
  totalBookings?: number
  totalSpent?: number
  lastBookingDate?: Date | string | null
  createdAt: Date | string
  updatedAt: Date | string
}

const VERIFICATION_LABELS: Record<string, string> = {
  UNVERIFIED: 'غير موثق',
  PENDING: 'قيد المراجعة',
  VERIFIED: 'موثق',
  REJECTED: 'مرفوض',
}

const STATUS_LABELS: Record<
  ClientStatus,
  { ar: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  active: { ar: 'نشط', variant: 'default' },
  suspended: { ar: 'معلق', variant: 'destructive' },
  inactive: { ar: 'غير نشط', variant: 'secondary' },
}

export default function ClientsListTab() {
  const { toast } = useToast()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  const statuses: Array<ClientStatus | 'all'> = ['all', 'active', 'suspended', 'inactive']

  const loadClients = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (searchQuery) params.set('search', searchQuery)
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))

      const response = await fetch(`/api/clients?${params.toString()}`)
      if (!response.ok) {
        throw new Error('فشل تحميل العملاء')
      }

      const data = await response.json()
      setClients(data.data || [])
      setTotal(data.total ?? 0)
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحميل العملاء',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [statusFilter, searchQuery, page, pageSize, toast])

  useEffect(() => {
    loadClients()
  }, [loadClients])

  const filteredClients = useMemo(() => clients, [clients])

  const getStatusLabel = (status: ClientStatus) => STATUS_LABELS[status]?.ar || status
  const getStatusVariant = (status: ClientStatus) => STATUS_LABELS[status]?.variant || 'default'

  const handleExportCSV = () => {
    const rows = filteredClients.map((c) => ({
      name: c.name ?? '',
      email: c.email,
      phone: c.phone ?? '',
      status: getStatusLabel(c.status),
      verificationStatus: c.verificationStatus
        ? (VERIFICATION_LABELS[c.verificationStatus] ?? c.verificationStatus)
        : '',
      segmentName: c.segmentName ?? '',
      totalBookings: c.totalBookings ?? '',
      totalSpent: c.totalSpent != null ? formatCurrency(c.totalSpent) : '',
      lastBookingDate: c.lastBookingDate ? formatDate(c.lastBookingDate) : '',
      createdAt: formatDate(c.createdAt),
    }))
    exportToCSV(rows, `clients-${new Date().toISOString().slice(0, 10)}`, [
      { key: 'name', label: 'الاسم' },
      { key: 'email', label: 'البريد' },
      { key: 'phone', label: 'الهاتف' },
      { key: 'status', label: 'الحالة' },
      { key: 'verificationStatus', label: 'التوثيق' },
      { key: 'segmentName', label: 'الشرائح' },
      { key: 'totalBookings', label: 'عدد الحجوزات' },
      { key: 'totalSpent', label: 'إجمالي الإنفاق' },
      { key: 'lastBookingDate', label: 'آخر حجز' },
      { key: 'createdAt', label: 'تاريخ التسجيل' },
    ])
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="min-w-[200px]">
          <Label htmlFor="clients-search" className="sr-only">
            بحث بالاسم أو البريد
          </Label>
          <Input
            id="clients-search"
            type="search"
            placeholder="بحث بالاسم أو البريد..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 rounded-md border border-input"
            aria-label="بحث بالاسم أو البريد"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[160px] rounded-md border border-input" aria-label="فلتر الحالة">
            <SelectValue placeholder="جميع الحالات" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>
                {s === 'all' ? 'جميع الحالات' : STATUS_LABELS[s as ClientStatus]?.ar || s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          disabled={filteredClients.length === 0}
        >
          <Download className="ml-2 h-4 w-4" />
          تصدير CSV
        </Button>
        <Button asChild>
          <Link href="/admin/clients/new">
            <Plus className="ml-2 h-4 w-4" />
            عميل جديد
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[120px]">الاسم</TableHead>
              <TableHead className="min-w-[160px]">البريد</TableHead>
              <TableHead className="min-w-[100px]">الهاتف</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>التوثيق</TableHead>
              <TableHead>الحجوزات</TableHead>
              <TableHead>إجمالي الإنفاق</TableHead>
              <TableHead className="min-w-[100px]">تاريخ التسجيل</TableHead>
              <TableHead className="min-w-[80px]">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <div className="space-y-2 py-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="p-0">
                  <EmptyState
                    title="لا يوجد عملاء"
                    description="لم يتم العثور على عملاء يطابقون الفلتر. جرّب تغيير معايير البحث أو أضف عميلاً جديداً."
                    icon={<Users className="h-12 w-12" />}
                    actionLabel="عميل جديد"
                    actionHref="/admin/clients/new"
                  />
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name || '—'}</TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell>{c.phone || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(c.status)}>{getStatusLabel(c.status)}</Badge>
                  </TableCell>
                  <TableCell>
                    {c.verificationStatus
                      ? VERIFICATION_LABELS[c.verificationStatus] ?? c.verificationStatus
                      : '—'}
                  </TableCell>
                  <TableCell>{c.totalBookings ?? '—'}</TableCell>
                  <TableCell>
                    {c.totalSpent != null ? formatCurrency(c.totalSpent) : '—'}
                  </TableCell>
                  <TableCell>{formatDate(c.createdAt)}</TableCell>
                  <TableCell>
                    <Link href={`/admin/clients/${c.id}`}>
                      <Button size="sm" variant="ghost">
                        <Eye className="ml-1 h-4 w-4" />
                        عرض
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {total > 0 && (
        <TablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
          itemLabel="عميل"
          dir="rtl"
        />
      )}
    </div>
  )
}
