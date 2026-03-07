/**
 * @file vendors-list-tab.tsx
 * @description Vendors list tab content
 * @module app/admin/(routes)/vendors/_components
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Eye } from 'lucide-react'
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
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/states/empty-state'
import { Store } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'قيد الانتظار',
  APPROVED: 'معتمد',
  SUSPENDED: 'معلق',
  REJECTED: 'مرفوض',
}

interface Vendor {
  id: string
  companyName: string
  email: string
  status: string
  commissionRate: number
  user?: { name: string | null; email: string }
  _count?: { equipment: number }
}

export default function VendorsListTab() {
  const { toast } = useToast()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [total, setTotal] = useState(0)

  useEffect(() => {
    loadVendors()
  }, [statusFilter, search])

  const loadVendors = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (search) params.set('search', search)

      const res = await fetch(`/api/admin/vendors?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load vendors')

      const data = await res.json()
      setVendors(data.items || [])
      setTotal(data.total ?? 0)
    } catch (err) {
      toast({
        title: 'خطأ',
        description: err instanceof Error ? err.message : 'فشل تحميل الموردين',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-end gap-2">
        <Button asChild>
          <Link href="/admin/vendors/new">
            <Plus className="ms-2 h-4 w-4" />
            إضافة مورد
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor="vendors-search" className="sr-only">
          بحث
        </Label>
        <Input
          id="vendors-search"
          type="search"
          placeholder="بحث..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 max-w-xs rounded-md border border-input"
          aria-label="بحث عن الموردين"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-40 rounded-md border border-input" aria-label="فلتر الحالة">
            <SelectValue placeholder="الكل" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="PENDING">قيد الانتظار</SelectItem>
            <SelectItem value="APPROVED">معتمد</SelectItem>
            <SelectItem value="SUSPENDED">معلق</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        {loading ? (
          <div className="p-6">
            <Skeleton className="h-48 w-full" />
          </div>
        ) : vendors.length === 0 ? (
          <EmptyState
            title="لا يوجد موردون"
            description="لم يتم العثور على موردين يطابقون الفلتر. أضف مورداً جديداً من الزر أدناه."
            icon={<Store className="h-12 w-12" />}
            actionLabel="إضافة مورد"
            actionHref="/admin/vendors/new"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الشركة</TableHead>
                <TableHead>البريد</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>العمولة</TableHead>
                <TableHead>المعدات</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.companyName}</TableCell>
                  <TableCell>{v.email}</TableCell>
                  <TableCell>
                    <Badge variant={v.status === 'APPROVED' ? 'default' : 'secondary'}>
                      {STATUS_LABELS[v.status] || v.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{v.commissionRate}%</TableCell>
                  <TableCell>{v._count?.equipment ?? 0}</TableCell>
                  <TableCell>
                    <Link href={`/admin/vendors/${v.id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
