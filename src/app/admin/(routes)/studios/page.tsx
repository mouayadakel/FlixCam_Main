/**
 * @file page.tsx
 * @description Studios list – live data from API
 * @module app/admin/(routes)/studios
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
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
import { Eye, Plus, RefreshCw } from 'lucide-react'
import { TableSkeleton } from '@/components/admin/table-skeleton'
import { EmptyState } from '@/components/states/empty-state'
import { formatCurrency } from '@/lib/utils/format.utils'

interface StudioRow {
  id: string
  name: string
  slug: string
  description: string | null
  capacity: number | null
  hourlyRate: number
  setupBuffer: number
  cleaningBuffer: number
  resetTime: number
  isActive: boolean
  createdAt: string
  _count: { bookings: number }
}

export default function StudiosPage() {
  const [studios, setStudios] = useState<StudioRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const loadStudios = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (statusFilter === 'active') params.set('isActive', 'true')
      if (statusFilter === 'inactive') params.set('isActive', 'false')
      params.set('pageSize', '50')
      const res = await fetch(`/api/studios?${params}`)
      if (!res.ok) throw new Error('Failed to load')
      const json = await res.json()
      setStudios(Array.isArray(json.data) ? json.data : [])
    } catch {
      setStudios([])
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => {
    loadStudios()
  }, [loadStudios])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Studio Spaces</h1>
        <div className="flex items-center gap-2">
          <input
            type="search"
            placeholder="Search studios..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Search studios"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Filter by status"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <Button variant="outline" size="icon" onClick={() => loadStudios()} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button asChild>
            <Link href="/admin/studios/new">
              <Plus className="mr-2 h-4 w-4" />
              New Studio
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        {loading ? (
          <TableSkeleton
            rowCount={5}
            headers={['Name', 'Capacity', 'Hourly rate', 'Status', 'Bookings', 'Actions']}
          />
        ) : studios.length === 0 ? (
          <EmptyState
            title="لا توجد استوديوهات"
            description="لم يتم العثور على استوديوهات. أضف أول استوديو لبدء استقبال الحجوزات."
            actionLabel="إضافة استوديو"
            actionHref="/admin/studios/new"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Hourly rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Bookings</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studios.map((studio) => (
                <TableRow key={studio.id}>
                  <TableCell className="font-medium">{studio.name}</TableCell>
                  <TableCell>{studio.capacity ?? '—'}</TableCell>
                  <TableCell>{formatCurrency(studio.hourlyRate)}</TableCell>
                  <TableCell>
                    <Badge variant={studio.isActive ? 'default' : 'secondary'}>
                      {studio.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>{studio._count.bookings}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/studios/${studio.id}`} aria-label={`View ${studio.name}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
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
