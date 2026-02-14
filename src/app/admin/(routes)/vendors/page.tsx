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
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

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

export default function VendorsPage() {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">الموردون</h1>
        <Link href="/admin/vendors/new">
          <Button>
            <Plus className="h-4 w-4 ml-2" />
            إضافة مورد
          </Button>
        </Link>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="بحث..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="PENDING">قيد الانتظار</SelectItem>
            <SelectItem value="APPROVED">معتمد</SelectItem>
            <SelectItem value="SUSPENDED">معلق</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        {loading ? (
          <div className="p-6">
            <Skeleton className="h-48 w-full" />
          </div>
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
        {!loading && vendors.length === 0 && (
          <p className="text-center py-8 text-muted-foreground">لا يوجد موردون</p>
        )}
      </div>
    </div>
  )
}
