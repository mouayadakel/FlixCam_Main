/**
 * @file page.tsx
 * @description Damage claims list with filters
 * @module app/admin/(routes)/damage-claims
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Eye, RefreshCw, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatDate } from '@/lib/utils/format.utils'
import { TablePagination } from '@/components/tables/table-pagination'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'INVESTIGATING', label: 'Investigating' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'DISPUTED', label: 'Disputed' },
] as const

const SEVERITY_COLOR: Record<string, string> = {
  MINOR: 'bg-gray-100 text-gray-800',
  MODERATE: 'bg-yellow-100 text-yellow-800',
  SEVERE: 'bg-orange-100 text-orange-800',
  TOTAL_LOSS: 'bg-red-100 text-red-800',
}

interface Claim {
  id: string
  bookingId: string
  damageType: string
  severity: string
  description: string
  estimatedCost: string
  actualCost: string | null
  status: string
  insuranceClaim?: boolean
  photos?: string[] | null
  createdAt: string
  booking?: { id: string; bookingNumber: string; status: string }
  equipment?: { id: string; sku: string; model: string | null } | null
  studio?: { id: string; name: string } | null
  reporter?: { id: string; name: string | null; email: string }
}

export default function DamageClaimsPage() {
  const { toast } = useToast()
  const [claims, setClaims] = useState<Claim[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  const loadClaims = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))
      const res = await fetch(`/api/damage-claims?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load claims')
      const data = await res.json()
      setClaims(data.claims ?? [])
      setTotal(data.total ?? 0)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load damage claims',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [statusFilter, page, pageSize, toast])

  useEffect(() => {
    loadClaims()
  }, [loadClaims])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <AlertTriangle className="h-8 w-8" />
            Damage Claims
          </h1>
          <p className="mt-1 text-muted-foreground">
            Report and resolve equipment or studio damage
          </p>
        </div>
        <Button variant="outline" onClick={loadClaims}>
          <RefreshCw className="me-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Claims ({total})</CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Type / Severity</TableHead>
                  <TableHead>Estimated</TableHead>
                  <TableHead>Insurance</TableHead>
                  <TableHead>Photos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reported</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
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
                ) : claims.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                      No damage claims. Report one from a booking detail page.
                    </TableCell>
                  </TableRow>
                ) : (
                  claims.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link
                          href={`/admin/bookings/${c.bookingId}`}
                          className="font-medium text-primary hover:underline"
                        >
                          #{c.booking?.bookingNumber ?? c.bookingId.slice(0, 8)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {c.equipment ? (
                          <span>
                            {c.equipment.sku} {c.equipment.model ?? ''}
                          </span>
                        ) : c.studio ? (
                          <span>{c.studio.name}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm">{c.damageType.replace(/_/g, ' ')}</span>
                          <Badge
                            className={SEVERITY_COLOR[c.severity] ?? 'bg-muted'}
                            variant="secondary"
                          >
                            {c.severity}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(Number(c.estimatedCost))}</TableCell>
                      <TableCell>
                        <Badge variant={c.insuranceClaim ? 'default' : 'outline'}>
                          {c.insuranceClaim ? 'نعم' : 'لا'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {Array.isArray(c.photos) ? c.photos.length : 0}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            c.status === 'PENDING' || c.status === 'INVESTIGATING'
                              ? 'secondary'
                              : 'default'
                          }
                        >
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(c.createdAt)}
                        {c.reporter?.name && <span className="block">{c.reporter.name}</span>}
                      </TableCell>
                      <TableCell>
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/admin/damage-claims/${c.id}`}>
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
        </CardContent>
      </Card>

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
        />
      )}
    </div>
  )
}
