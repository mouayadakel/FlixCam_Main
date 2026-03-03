/**
 * @file page.tsx
 * @description Users list page – wired to GET /api/admin/users
 * @module app/admin/(routes)/users
 */

'use client'

import { useState, useEffect } from 'react'
import { TableFilters } from '@/components/tables/table-filters'
import { TablePagination } from '@/components/tables/table-pagination'
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
import { formatDate } from '@/lib/utils/format.utils'
import { Eye, Loader2, RefreshCw, AlertCircle, Plus, Shield } from 'lucide-react'
import Link from 'next/link'

interface UserRow {
  id: string
  name: string | null
  email: string
  role: string
  phone: string | null
  status?: string
  twoFactorEnabled?: boolean
  createdAt: string
  updatedAt: string
}

const STATUS_LABELS: Record<
  string,
  { ar: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  active: { ar: 'نشط', variant: 'default' },
  suspended: { ar: 'معلق', variant: 'destructive' },
  inactive: { ar: 'غير نشط', variant: 'secondary' },
}

export default function UsersPage() {
  const [data, setData] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [search, setSearch] = useState('')

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))
      if (search) params.set('search', search)
      if (statusFilter && statusFilter !== 'All') params.set('status', statusFilter)
      const res = await fetch(`/api/admin/users?${params}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to load users')
      }
      const json = await res.json()
      setData(Array.isArray(json.data) ? json.data : [])
      setTotal(json.meta?.total ?? 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل تحميل المستخدمين')
      setData([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [page, pageSize, statusFilter])

  const statuses = ['All', 'active', 'suspended', 'inactive']

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">المستخدمون</h1>
          <p className="mt-1 text-muted-foreground">إدارة الحسابات والأدوار</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/settings/roles">
              <Shield className="ms-2 h-4 w-4" />
              الأدوار والصلاحيات
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/users/new">
              <Plus className="ms-2 h-4 w-4" />
              مستخدم جديد
            </Link>
          </Button>
          <Button variant="outline" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={`ms-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>
      </div>

      <TableFilters
        searchPlaceholder="البحث بالمستخدمين..."
        statusOptions={statuses}
        onSearchChange={setSearch}
        onStatusChange={setStatusFilter}
      />

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <p className="text-red-800">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchUsers}>
            إعادة المحاولة
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>البريد</TableHead>
              <TableHead>الهاتف</TableHead>
              <TableHead>الدور</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>2FA</TableHead>
              <TableHead>تاريخ الإنشاء</TableHead>
              <TableHead className="text-end">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">جاري التحميل...</p>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                  لا يوجد مستخدمون
                </TableCell>
              </TableRow>
            ) : (
              data.map((user) => {
                const statusInfo = STATUS_LABELS[user.status ?? 'active'] ?? STATUS_LABELS.active
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name ?? '—'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone ?? '—'}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>
                      <Badge variant={statusInfo.variant}>{statusInfo.ar}</Badge>
                    </TableCell>
                    <TableCell>{user.twoFactorEnabled ? 'نعم' : '—'}</TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell className="text-end">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/users/${user.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
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
          itemLabel="مستخدم"
          dir="rtl"
        />
      )}
    </div>
  )
}
