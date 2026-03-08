/**
 * @file inventory/page.tsx
 * @description Warehouse inventory overview page
 * @module app/admin/(routes)/ops/warehouse/inventory
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Package,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  Wrench,
  Eye,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

interface Equipment {
  id: string
  sku: string
  model: string | null
  serialNumber?: string | null
  status: 'available' | 'rented' | 'maintenance' | 'reserved' | 'retired'
  condition: 'excellent' | 'good' | 'fair' | 'poor'
  location?: string | null
  category?: { id: string; name: string }
  currentBooking?: { id: string; bookingNumber: string; endDate: string } | null
  lastMaintenanceDate?: string | null
}

interface InventoryStats {
  total: number
  available: number
  rented: number
  maintenance: number
  reserved: number
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  available: { label: 'متاح', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rented: { label: 'مؤجر', color: 'bg-blue-100 text-blue-800', icon: Clock },
  maintenance: { label: 'صيانة', color: 'bg-yellow-100 text-yellow-800', icon: Wrench },
  reserved: { label: 'محجوز', color: 'bg-purple-100 text-purple-800', icon: Clock },
  retired: { label: 'متقاعد', color: 'bg-gray-100 text-gray-800', icon: AlertTriangle },
}

const CONDITION_CONFIG: Record<string, { label: string; color: string }> = {
  excellent: { label: 'ممتازة', color: 'text-green-600' },
  good: { label: 'جيدة', color: 'text-blue-600' },
  fair: { label: 'مقبولة', color: 'text-yellow-600' },
  poor: { label: 'سيئة', color: 'text-red-600' },
}

export default function WarehouseInventoryPage() {
  const { toast } = useToast()
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [stats, setStats] = useState<InventoryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    loadData()
  }, [statusFilter, categoryFilter])

  const loadData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (categoryFilter !== 'all') params.set('categoryId', categoryFilter)
      params.set('limit', '100')

      const [equipmentRes, categoriesRes] = await Promise.all([
        fetch(`/api/equipment?${params.toString()}`),
        fetch('/api/categories'),
      ])

      if (equipmentRes.ok) {
        const data = await equipmentRes.json()
        const items = data.items || []
        setEquipment(items)

        // Calculate stats
        setStats({
          total: items.length,
          available: items.filter((e: Equipment) => e.status === 'available').length,
          rented: items.filter((e: Equipment) => e.status === 'rented').length,
          maintenance: items.filter((e: Equipment) => e.status === 'maintenance').length,
          reserved: items.filter((e: Equipment) => e.status === 'reserved').length,
        })
      }

      if (categoriesRes.ok) {
        const data = await categoriesRes.json()
        setCategories(data.categories || data.data || [])
      }
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل تحميل بيانات المخزون',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredEquipment = equipment.filter(
    (e) =>
      e.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <Package className="h-8 w-8" />
            مخزون المستودع
          </h1>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/ops/warehouse">
            <ArrowRight className="ms-2 h-4 w-4" />
            العودة
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">الإجمالي</p>
              {loading ? (
                <Skeleton className="mx-auto mt-1 h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-sm text-green-600">متاح</p>
              {loading ? (
                <Skeleton className="mx-auto mt-1 h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold text-green-600">{stats?.available || 0}</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-sm text-blue-600">مؤجر</p>
              {loading ? (
                <Skeleton className="mx-auto mt-1 h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold text-blue-600">{stats?.rented || 0}</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200">
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-sm text-yellow-600">صيانة</p>
              {loading ? (
                <Skeleton className="mx-auto mt-1 h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold text-yellow-600">{stats?.maintenance || 0}</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200">
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-sm text-purple-600">محجوز</p>
              {loading ? (
                <Skeleton className="mx-auto mt-1 h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold text-purple-600">{stats?.reserved || 0}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="بحث بالرمز أو الموديل..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pe-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="available">متاح</SelectItem>
                <SelectItem value="rented">مؤجر</SelectItem>
                <SelectItem value="maintenance">صيانة</SelectItem>
                <SelectItem value="reserved">محجوز</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="الفئة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الفئات</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Equipment Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة المعدات ({filteredEquipment.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الرمز</TableHead>
                  <TableHead>الموديل</TableHead>
                  <TableHead>الفئة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الجودة</TableHead>
                  <TableHead>الموقع</TableHead>
                  <TableHead>الحجز الحالي</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <div className="space-y-2 py-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredEquipment.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      لا توجد معدات
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEquipment.map((item) => {
                    const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.available
                    const conditionConf = CONDITION_CONFIG[item.condition] || CONDITION_CONFIG.good
                    const StatusIcon = statusConf.icon

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono font-medium">{item.sku}</TableCell>
                        <TableCell>{item.model || '-'}</TableCell>
                        <TableCell>{item.category?.name || '-'}</TableCell>
                        <TableCell>
                          <Badge className={statusConf.color}>
                            <StatusIcon className="ms-1 h-3 w-3" />
                            {statusConf.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={conditionConf.color}>{conditionConf.label}</span>
                        </TableCell>
                        <TableCell>{item.location || '-'}</TableCell>
                        <TableCell>
                          {item.currentBooking ? (
                            <Link
                              href={`/admin/bookings/${item.currentBooking.id}`}
                              className="text-sm text-primary hover:underline"
                            >
                              {item.currentBooking.bookingNumber}
                            </Link>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <Link href={`/admin/inventory/equipment/${item.id}`}>
                            <Button size="sm" variant="ghost">
                              <Eye className="ms-1 h-4 w-4" />
                              عرض
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
