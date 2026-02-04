'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { TableFilters } from '@/components/tables/table-filters'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate, formatStatus } from '@/lib/utils/format.utils'
import { Eye, Package } from 'lucide-react'
import { TableSkeleton } from '@/components/admin/table-skeleton'
import { EmptyState } from '@/components/states/empty-state'

const PAGE_SIZE = 10
const TABLE_HEADERS = ['Order #', 'Customer', 'Status', 'Total', 'Created', 'Actions']

export default function OrdersPage() {
  const statuses = ['All', 'pending', 'processing', 'shipped', 'delivered', 'cancelled']
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string | undefined>(undefined)
  const [page, setPage] = useState(1)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['orders', search, status, page],
    queryFn: async () => {
      const url = new URL('/api/orders', window.location.origin)
      url.searchParams.set('page', String(page))
      url.searchParams.set('pageSize', String(PAGE_SIZE))
      if (search) url.searchParams.set('search', search)
      if (status && status !== 'All') url.searchParams.set('status', status)
      const res = await fetch(url.toString())
      if (!res.ok) throw new Error('Failed to load orders')
      return res.json() as Promise<{ data: any[]; total: number; page: number; pageSize: number }>
    },
    placeholderData: (prev) => prev,
  })

  const rows = useMemo(() => data?.data ?? [], [data])
  const totalPages = useMemo(() => (data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1), [data])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">الطلبات</h1>
          <p className="text-muted-foreground mt-1">إدارة الطلبات والشحن</p>
        </div>
        <Button asChild>
          <Link href="/admin/orders/new">طلب جديد</Link>
        </Button>
      </div>

      <TableFilters
        searchPlaceholder="بحث بالطلبات..."
        statusOptions={statuses}
        onSearchChange={(val) => {
          setPage(1)
          setSearch(val)
        }}
        onStatusChange={(val) => {
          setPage(1)
          setStatus(val)
        }}
      />

      <div className="rounded-md border">
        {isLoading ? (
          <TableSkeleton rowCount={5} headers={TABLE_HEADERS} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="لا توجد طلبات"
            description="لم يتم العثور على طلبات تطابق البحث أو الفلتر. إنشاء طلب جديد للبدء."
            icon={<Package className="h-12 w-12" />}
            actionLabel="طلب جديد"
            actionHref="/admin/orders/new"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.orderNumber}</TableCell>
                  <TableCell>{order.customer}</TableCell>
                  <TableCell>
                    <Badge>{formatStatus(order.status)}</Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                  <TableCell>{formatDate(order.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/orders/${order.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          صفحة {page} من {totalPages}
          {isFetching && ' · جاري التحديث...'}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            السابق
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            التالي
          </Button>
        </div>
      </div>
    </div>
  )
}
