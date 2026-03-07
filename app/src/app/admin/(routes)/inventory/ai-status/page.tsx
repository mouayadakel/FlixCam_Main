/**
 * AI Content Status Dashboard: per-item AI fill score, filter by gaps, bulk actions.
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
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
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  ArrowLeft,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import Link from 'next/link'

interface AiStatusItem {
  id: string
  name: string
  sku: string | null
  brand: string | null
  category: string | null
  score: number
  hasEnDesc: boolean
  hasEnSeo: boolean
  hasAr: boolean
  hasZh: boolean
  hasSpecs: boolean
  hasPhotos: boolean
  hasTags: boolean
  photoCount: number
  specCount: number
  tagCount: number
  needsReview: boolean
  lastAiRun: string | null
  aiRunCount: number
}

interface Aggregates {
  total: number
  complete: number
  partial: number
  failed: number
  needsReview: number
  missingArabic: number
  missingPhotos: number
  missingSeo: number
  averageScore: number
}

type FilterType =
  | 'all'
  | 'missing_ar'
  | 'missing_photos'
  | 'missing_seo'
  | 'low_score'
  | 'failed'
  | 'needs_review'

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'missing_ar', label: 'Missing Arabic' },
  { key: 'missing_photos', label: 'Missing Photos' },
  { key: 'missing_seo', label: 'Missing SEO' },
  { key: 'low_score', label: 'Low Score (<80%)' },
  { key: 'failed', label: 'Failed (<50%)' },
  { key: 'needs_review', label: 'Needs Review' },
]

function StatusIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <CheckCircle2 className="h-4 w-4 text-green-500" />
  ) : (
    <XCircle className="h-4 w-4 text-red-400" />
  )
}

function ScoreBadge({ score }: { score: number }) {
  if (score >= 90) return <Badge className="bg-green-100 text-green-800">{score}%</Badge>
  if (score >= 70) return <Badge className="bg-yellow-100 text-yellow-800">{score}%</Badge>
  if (score >= 50) return <Badge className="bg-orange-100 text-orange-800">{score}%</Badge>
  return <Badge className="bg-red-100 text-red-800">{score}%</Badge>
}

export default function AiStatusPage() {
  const [items, setItems] = useState<AiStatusItem[]>([])
  const [aggregates, setAggregates] = useState<Aggregates | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '50',
        filter,
      })
      if (search) params.set('search', search)

      const res = await fetch(`/api/admin/ai-status?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')

      const data = await res.json()
      setItems(data.items ?? [])
      setAggregates(data.aggregates ?? null)
      setTotalPages(data.pagination?.totalPages ?? 1)
    } catch {
      toast({ title: 'Error', description: 'Failed to load AI status', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [page, filter, search])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchData()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/inventory/equipment">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">AI Content Status</h1>
            <p className="text-sm text-muted-foreground">
              Track AI-generated content completeness for every product
            </p>
          </div>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {aggregates && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{aggregates.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Complete (90%+)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{aggregates.complete}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-600">Partial</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{aggregates.partial}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">Failed (&lt;50%)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{aggregates.failed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{aggregates.averageScore}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {aggregates && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <Card className="border-orange-200">
            <CardContent className="flex items-center gap-3 pt-4">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-lg font-semibold">{aggregates.missingArabic}</div>
                <div className="text-xs text-muted-foreground">Missing Arabic</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-orange-200">
            <CardContent className="flex items-center gap-3 pt-4">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-lg font-semibold">{aggregates.missingPhotos}</div>
                <div className="text-xs text-muted-foreground">Missing Photos</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-orange-200">
            <CardContent className="flex items-center gap-3 pt-4">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-lg font-semibold">{aggregates.missingSeo}</div>
                <div className="text-xs text-muted-foreground">Missing SEO</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f.key}
              variant={filter === f.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setFilter(f.key)
                setPage(1)
              }}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or SKU..."
              className="pl-8 w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button type="submit" size="sm" variant="secondary">
            Search
          </Button>
        </form>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No products found matching the current filter.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead className="text-center">EN</TableHead>
                  <TableHead className="text-center">AR</TableHead>
                  <TableHead className="text-center">ZH</TableHead>
                  <TableHead className="text-center">SEO</TableHead>
                  <TableHead className="text-center">Photos</TableHead>
                  <TableHead className="text-center">Specs</TableHead>
                  <TableHead className="text-center">Tags</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="max-w-[250px]">
                        <div className="truncate font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.brand ?? ''} {item.sku ? `· ${item.sku}` : ''}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <ScoreBadge score={item.score} />
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusIcon ok={item.hasEnDesc} />
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusIcon ok={item.hasAr} />
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusIcon ok={item.hasZh} />
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusIcon ok={item.hasEnSeo} />
                    </TableCell>
                    <TableCell className="text-center">
                      {item.hasPhotos ? (
                        <span className="text-sm text-green-600">{item.photoCount}</span>
                      ) : (
                        <XCircle className="mx-auto h-4 w-4 text-red-400" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.hasSpecs ? (
                        <span className="text-sm text-green-600">{item.specCount}</span>
                      ) : (
                        <XCircle className="mx-auto h-4 w-4 text-red-400" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.hasTags ? (
                        <span className="text-sm text-green-600">{item.tagCount}</span>
                      ) : (
                        <span className="text-sm text-red-400">{item.tagCount}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/inventory/equipment/${item.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
