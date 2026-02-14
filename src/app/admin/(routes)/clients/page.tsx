/**
 * @file clients/page.tsx
 * @description Clients list page
 * @module app/admin/(routes)/clients
 * @author Engineering Team
 * @created 2026-01-28
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Eye, Mail, Phone, Calendar, Download } from 'lucide-react'
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
import { exportToCSV } from '@/lib/utils/export.utils'
import { TablePagination } from '@/components/tables/table-pagination'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import type { ClientStatus } from '@/lib/types/client.types'
import { UserRole } from '@prisma/client'

interface Client {
  id: string
  email: string
  name: string | null
  phone: string | null
  role: UserRole
  status: ClientStatus
  verificationStatus?: string
  segmentName?: string | null
  totalBookings?: number
  totalSpent?: number
  lastBookingDate?: Date | null
  createdAt: Date
  updatedAt: Date
}

const VERIFICATION_LABELS: Record<string, string> = {
  UNVERIFIED: 'غير موثق',
  PENDING: 'قيد المراجعة',
  VERIFIED: 'موثق',
  REJECTED: 'مرفوض',
}

const STATUS_LABELS: Record<ClientStatus, { ar: string; en: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { ar: 'نشط', en: 'Active', variant: 'default' },
  suspended: { ar: 'معلق', en: 'Suspended', variant: 'destructive' },
  inactive: { ar: 'غير نشط', en: 'Inactive', variant: 'secondary' },
}

export default function ClientsPage() {
  const { toast } = useToast()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  const statuses: Array<ClientStatus | 'all'> = [
    'all',
    'active',
    'suspended',
    'inactive',
  ]

  useEffect(() => {
    loadClients()
  }, [statusFilter, searchQuery, page, pageSize])

  const loadClients = async () => {
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
  }

  const filteredClients = useMemo(() => {
    return clients
  }, [clients])

  const getStatusLabel = (status: ClientStatus) => {
    return STATUS_LABELS[status]?.ar || status
  }

  const getStatusVariant = (status: ClientStatus) => {
    return STATUS_LABELS[status]?.variant || 'default'
  }

  const handleExportCSV = () => {
    const rows = filteredClients.map((c) => ({
      name: c.name ?? '',
      email: c.email,
      phone: c.phone ?? '',
      status: getStatusLabel(c.status),
      verificationStatus: c.verificationStatus ? VERIFICATION_LABELS[c.verificationStatus] ?? c.verificationStatus : '',
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">العملاء</h1>
          <p className="text-muted-foreground mt-2">
            إدارة العملاء والمستخدمين
          </p>
        </div>
<div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filteredClients.length === 0}>
              <Download className="h-4 w-4 ml-2" />
              تصدير CSV
            </Button>
            <Button asChild>
              <Link href="/admin/clients/new">
                <Plus className="h-4 w-4 ml-2" />
                عميل جديد
              </Link>
            </Button>
          </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center flex-wrap">
        <input
          type="text"
          placeholder="البحث بالاسم أو البريد الإلكتروني..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2 border rounded-lg flex-1 min-w-[200px]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status === 'all' ? 'جميع الحالات' : STATUS_LABELS[status as ClientStatus]?.ar || status}
            </option>
          ))}
        </select>
      </div>

      {/* Clients Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>البريد الإلكتروني</TableHead>
              <TableHead>الهاتف</TableHead>
              <TableHead>الدور</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>حالة التوثيق</TableHead>
              <TableHead>الشرائح</TableHead>
              <TableHead>عدد الحجوزات</TableHead>
              <TableHead>إجمالي الإنفاق</TableHead>
              <TableHead>آخر حجز</TableHead>
              <TableHead>تاريخ التسجيل</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={12}>
                  <div className="space-y-2 py-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                  لا يوجد عملاء
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">
                    {client.name || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {client.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    {client.phone ? (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {client.phone}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{client.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(client.status)}>
                      {getStatusLabel(client.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {client.verificationStatus ? VERIFICATION_LABELS[client.verificationStatus] ?? client.verificationStatus : '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {client.segmentName ?? '—'}
                  </TableCell>
                  <TableCell>
                    {client.totalBookings || 0}
                  </TableCell>
                  <TableCell>
                    {client.totalSpent ? formatCurrency(client.totalSpent) : '-'}
                  </TableCell>
                  <TableCell>
                    {client.lastBookingDate ? (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(client.lastBookingDate.toString())}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{formatDate(client.createdAt.toString())}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/admin/clients/${client.id}`}>
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4 ml-1" />
                          عرض
                        </Button>
                      </Link>
                    </div>
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
