/**
 * @file page.tsx
 * @description Studio detail view
 * @module app/admin/(routes)/studios/[id]
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Edit } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format.utils'

interface Studio {
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
  updatedAt: string
  _count: { bookings: number }
}

export default function StudioDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const [studio, setStudio] = useState<Studio | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    fetch(`/api/studios/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json?.data) setStudio(json.data)
      })
      .catch(() => {
        if (!cancelled) setStudio(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!studio) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/studios">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Studios
          </Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Studio not found.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/studios">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Studios
          </Link>
        </Button>
        <Button asChild>
          <Link href={`/admin/studios/${id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{studio.name}</CardTitle>
            <Badge variant={studio.isActive ? 'default' : 'secondary'}>
              {studio.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          {studio.description && (
            <p className="text-sm text-muted-foreground">{studio.description}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Slug</dt>
              <dd className="mt-1">{studio.slug}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Capacity</dt>
              <dd className="mt-1">{studio.capacity ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Hourly rate</dt>
              <dd className="mt-1">{formatCurrency(studio.hourlyRate)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Setup buffer</dt>
              <dd className="mt-1">{studio.setupBuffer} min</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Cleaning buffer</dt>
              <dd className="mt-1">{studio.cleaningBuffer} min</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Reset time</dt>
              <dd className="mt-1">{studio.resetTime} min</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Bookings</dt>
              <dd className="mt-1">{studio._count.bookings}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
