/**
 * @file page.tsx
 * @description Customer segments – list and manage segments for pricing/marketing
 * @module app/admin/(routes)/settings/customer-segments
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Users, Plus, Edit, Trash2, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

interface Segment {
  id: string
  name: string
  slug: string
  description: string | null
  discountPercent: string | null
  priorityBooking: boolean
  extendedTerms: boolean
  userCount: number
}

export default function CustomerSegmentsPage() {
  const { toast } = useToast()
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadSegments()
  }, [])

  const loadSegments = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/customer-segments')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setSegments(data.segments ?? [])
    } catch {
      toast({ title: 'Error', description: 'Failed to load segments', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/customer-segments/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast({ title: 'Success', description: 'Segment deleted' })
      setDeleteId(null)
      loadSegments()
    } catch {
      toast({ title: 'Error', description: 'Failed to delete segment', variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="h-8 w-8" />
            Customer Segments
          </h1>
          <p className="text-muted-foreground mt-1">Group customers for pricing, marketing, and terms</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadSegments}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Segments</CardTitle>
          <CardDescription>Assign users to segments in user edit. Use segments in pricing rules.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Discount %</TableHead>
                  <TableHead>Benefits</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell>
                  </TableRow>
                ) : segments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No segments. Create via API or add a create form here.
                    </TableCell>
                  </TableRow>
                ) : (
                  segments.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="font-mono text-sm">{s.slug}</TableCell>
                      <TableCell>{s.discountPercent ?? '—'}</TableCell>
                      <TableCell className="text-sm">
                        {s.priorityBooking && 'Priority '}
                        {s.extendedTerms && 'Extended terms'}
                        {!s.priorityBooking && !s.extendedTerms && '—'}
                      </TableCell>
                      <TableCell>{s.userCount}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => setDeleteId(s.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
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

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete segment?</AlertDialogTitle>
            <AlertDialogDescription>
              Users in this segment will be unassigned. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
