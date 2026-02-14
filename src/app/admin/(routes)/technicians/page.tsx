/**
 * @file page.tsx
 * @description Technicians page – wired to GET /api/technicians
 * @module app/admin/(routes)/technicians
 */

'use client'

import { useState, useEffect } from 'react'
import { TableFilters } from '@/components/tables/table-filters'
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
import { Eye, Loader2, RefreshCw, AlertCircle, Plus, Download } from 'lucide-react'
import Link from 'next/link'
import { exportToCSV } from '@/lib/utils/export.utils'

interface Technician {
  id: string
  name: string
  email?: string
  phone: string
  specialty?: string
  status: string
  jobs?: number
  currentAssignment?: string | null
}

export default function TechniciansPage() {
  const [data, setData] = useState<Technician[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const fetchTechnicians = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== 'All') params.set('status', statusFilter)
      if (search) params.set('search', search)
      const res = await fetch(`/api/technicians?${params}`)
      if (!res.ok) throw new Error('Failed to load technicians')
      const json = await res.json()
      setData(Array.isArray(json.data) ? json.data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل تحميل الفنيين')
      setData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTechnicians()
  }, [statusFilter])

  const statuses = ['All', 'active', 'inactive', 'on-leave']

  const handleExportCSV = () => {
    const rows = data.map((t) => ({
      name: t.name,
      email: t.email ?? '',
      phone: t.phone ?? '',
      specialty: t.specialty ?? '',
      status: t.status,
      jobs: t.jobs ?? '',
      currentAssignment: t.currentAssignment ?? '',
    }))
    exportToCSV(rows, `technicians-${new Date().toISOString().slice(0, 10)}`, [
      { key: 'name', label: 'الاسم' },
      { key: 'email', label: 'البريد' },
      { key: 'phone', label: 'الهاتف' },
      { key: 'specialty', label: 'التخصص' },
      { key: 'status', label: 'الحالة' },
      { key: 'jobs', label: 'المهام' },
      { key: 'currentAssignment', label: 'المهمة الحالية' },
    ])
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">الفنيون</h1>
          <p className="text-muted-foreground mt-1">إدارة الفنيين والمهام</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={data.length === 0}>
            <Download className="h-4 w-4 ml-2" />
            تصدير CSV
          </Button>
          <Button asChild>
            <Link href="/admin/technicians/new">
              <Plus className="h-4 w-4 ml-2" />
              فني جديد
            </Link>
          </Button>
          <Button variant="outline" onClick={fetchTechnicians} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>
      </div>

      <TableFilters
        searchPlaceholder="البحث بالفنيين..."
        statusOptions={statuses}
        onSearchChange={setSearch}
        onStatusChange={setStatusFilter}
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <p className="text-red-800">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchTechnicians}>
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
              <TableHead>التخصص</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>المهمة الحالية</TableHead>
              <TableHead>المهام</TableHead>
              <TableHead className="text-right">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">جاري التحميل...</p>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  لا يوجد فنيون
                </TableCell>
              </TableRow>
            ) : (
              data.map((tech) => (
                <TableRow key={tech.id}>
                  <TableCell className="font-medium">{tech.name}</TableCell>
                  <TableCell>{tech.email ?? '—'}</TableCell>
                  <TableCell>{tech.phone}</TableCell>
                  <TableCell>{tech.specialty ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{tech.status}</Badge>
                  </TableCell>
                  <TableCell>{tech.currentAssignment ?? '—'}</TableCell>
                  <TableCell>{tech.jobs ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/technicians/${tech.id}`}>
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
