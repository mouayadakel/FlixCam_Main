/**
 * Content Review Panel: review AI-generated content, regenerate, bulk actions.
 */

'use client'

import { useEffect, useState } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Loader2, RefreshCw } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import Link from 'next/link'

interface ProductRow {
  id: string
  name: string
  score: number
  gap: string
}

interface DraftRow {
  id: string
  productId: string
  type: string
  createdAt: string
  product: { id: string; sku: string | null; translations: Array<{ name: string }> }
}

export default function ContentReviewPage() {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<DraftRow[]>([])
  const [draftsLoading, setDraftsLoading] = useState(true)
  const [actingDraftId, setActingDraftId] = useState<string | null>(null)

  const loadDrafts = async () => {
    setDraftsLoading(true)
    try {
      const res = await fetch('/api/admin/ai/drafts')
      if (!res.ok) return
      const json = await res.json()
      setDrafts(json.drafts ?? [])
    } finally {
      setDraftsLoading(false)
    }
  }

  useEffect(() => {
    loadDrafts()
  }, [])

  const handleApproveDraft = async (draftId: string) => {
    setActingDraftId(draftId)
    try {
      const res = await fetch(`/api/admin/ai/drafts/${draftId}/approve`, { method: 'POST' })
      if (!res.ok) throw new Error('Approve failed')
      toast({ title: 'Draft applied' })
      loadDrafts()
    } catch (e) {
      toast({ title: 'Failed to apply', variant: 'destructive' })
    } finally {
      setActingDraftId(null)
    }
  }

  const handleRejectDraft = async (draftId: string) => {
    setActingDraftId(draftId)
    try {
      const res = await fetch(`/api/admin/ai/drafts/${draftId}/reject`, { method: 'POST' })
      if (!res.ok) throw new Error('Reject failed')
      toast({ title: 'Draft rejected' })
      loadDrafts()
    } catch (e) {
      toast({ title: 'Failed to reject', variant: 'destructive' })
    } finally {
      setActingDraftId(null)
    }
  }

  const loadProducts = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/ai/quality/products?sort=score&order=asc&limit=50')
      if (!res.ok) throw new Error('Failed to load')
      const json = await res.json()
      setProducts(json.data?.products ?? [])
    } catch (e) {
      toast({ title: 'Failed to load products', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const [previewBeforeApply, setPreviewBeforeApply] = useState(true)

  const handleRegenerate = async (productId: string) => {
    setRegenerating(productId)
    try {
      const res = await fetch('/api/admin/ai/backfill/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: [productId],
          types: ['text', 'spec'],
          trigger: 'manual',
          previewMode: previewBeforeApply,
        }),
      })
      if (!res.ok) throw new Error('Trigger failed')
      toast({ title: 'Backfill queued for product' })
    } catch (e) {
      toast({ title: 'Failed to queue', variant: 'destructive' })
    } finally {
      setRegenerating(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Content Review</h1>
        <p className="text-muted-foreground">
          Review and regenerate AI-generated content for products with gaps.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>AI suggestions pending review</CardTitle>
          <Button variant="outline" size="sm" onClick={loadDrafts} disabled={draftsLoading}>
            <RefreshCw className="me-2 h-4 w-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {draftsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : drafts.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">
              No pending suggestions. Run backfill with &quot;Preview before applying&quot; to
              create drafts.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Created</TableHead>
                  <TableCell className="text-end">Actions</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drafts.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Link
                        href={`/admin/inventory/products/${d.productId}/review`}
                        className="text-primary hover:underline"
                      >
                        {d.product?.translations?.[0]?.name ?? d.product?.sku ?? d.productId}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{d.type}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(d.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-green-600"
                        onClick={() => handleApproveDraft(d.id)}
                        disabled={actingDraftId === d.id}
                      >
                        {actingDraftId === d.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Approve'
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                        onClick={() => handleRejectDraft(d.id)}
                        disabled={actingDraftId === d.id}
                      >
                        Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle>Products with content gaps</CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="preview-mode"
                  checked={previewBeforeApply}
                  onCheckedChange={(v) => setPreviewBeforeApply(v === true)}
                />
                <Label htmlFor="preview-mode" className="cursor-pointer text-sm font-normal">
                  Preview before applying (create drafts)
                </Label>
              </div>
              <Button variant="outline" size="sm" onClick={loadProducts} disabled={loading}>
                <RefreshCw className="me-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Quality Score</TableHead>
                  <TableHead>Gaps</TableHead>
                  <TableHead className="text-end">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link
                        href={`/admin/inventory/products/${p.id}/review`}
                        className="text-primary hover:underline"
                      >
                        {p.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.score >= 60 ? 'secondary' : p.score >= 40 ? 'outline' : 'destructive'
                        }
                      >
                        {p.score}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.gap || '—'}</TableCell>
                    <TableCell className="text-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRegenerate(p.id)}
                        disabled={regenerating === p.id}
                      >
                        {regenerating === p.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <RefreshCw className="me-1 h-4 w-4" />
                            Regenerate
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!loading && products.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">No products with gaps.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
