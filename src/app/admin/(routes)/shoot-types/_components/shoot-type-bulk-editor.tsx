/**
 * Bulk editor: equipment rows × shoot type columns (recommended + budget tier).
 */

'use client'

import { useState, useEffect } from 'react'
import { Loader2, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

interface ShootTypeListItem {
  id: string
  name: string
  slug: string
}

interface EquipmentRow {
  id: string
  sku: string
  model: string | null
  dailyPrice: number
  categoryName: string
  categoryId: string
}

interface ShootTypeBulkEditorProps {
  shootTypes: { id: string; name: string; slug: string }[]
  onUpdated: () => void
}

const BUDGET_TIERS = ['ESSENTIAL', 'PROFESSIONAL', 'PREMIUM'] as const

export function ShootTypeBulkEditor({ shootTypes, onUpdated }: ShootTypeBulkEditorProps) {
  const { toast } = useToast()
  const [equipment, setEquipment] = useState<EquipmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [recs, setRecs] = useState<Record<string, Record<string, { recommended: boolean; budgetTier: string }>>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    fetch(`/api/public/equipment?take=200&${params}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return
        const data = Array.isArray(json?.data) ? json.data : []
        setEquipment(
          data.map((e: { id: string; sku: string; model?: string; dailyPrice: number; category?: { name: string; id: string } }) => ({
            id: e.id,
            sku: e.sku,
            model: e.model ?? null,
            dailyPrice: e.dailyPrice ?? 0,
            categoryName: e.category?.name ?? '—',
            categoryId: e.category?.id ?? '',
          }))
        )
      })
      .catch(() => setEquipment([]))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [search])

  const filteredEquipment =
    categoryFilter === 'all'
      ? equipment
      : equipment.filter((e) => e.categoryId === categoryFilter)
  const categories = Array.from(new Set(equipment.map((e) => ({ id: e.categoryId, name: e.categoryName }))))
  const uniqueCategories = categories.filter((c, i, a) => a.findIndex((x) => x.id === c.id) === i)

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-4 border-b bg-muted/30 p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search equipment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {uniqueCategories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          {filteredEquipment.length} equipment · {shootTypes.length} shoot types
        </p>
      </div>
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipment</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price/day</TableHead>
                {shootTypes.map((st) => (
                  <TableHead key={st.id} className="min-w-[140px]">
                    {st.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEquipment.map((eq) => (
                <TableRow key={eq.id}>
                  <TableCell className="font-medium">
                    {eq.model ?? eq.sku}
                  </TableCell>
                  <TableCell>{eq.categoryName}</TableCell>
                  <TableCell className="text-right">{eq.dailyPrice} SAR</TableCell>
                  {shootTypes.map((st) => (
                    <TableCell key={st.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={recs[st.id]?.[eq.id]?.recommended ?? false}
                          onChange={(e) => {
                            setRecs((prev) => ({
                              ...prev,
                              [st.id]: {
                                ...prev[st.id],
                                [eq.id]: {
                                  ...prev[st.id]?.[eq.id],
                                  recommended: e.target.checked,
                                  budgetTier: prev[st.id]?.[eq.id]?.budgetTier ?? 'PROFESSIONAL',
                                },
                              },
                            }))
                          }}
                        />
                        <Select
                          value={recs[st.id]?.[eq.id]?.budgetTier ?? 'PROFESSIONAL'}
                          onValueChange={(v) => {
                            setRecs((prev) => ({
                              ...prev,
                              [st.id]: {
                                ...prev[st.id],
                                [eq.id]: {
                                  ...prev[st.id]?.[eq.id],
                                  recommended: prev[st.id]?.[eq.id]?.recommended ?? true,
                                  budgetTier: v,
                                },
                              },
                            }))
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BUDGET_TIERS.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <div className="border-t p-4">
        <p className="text-sm text-muted-foreground mb-2">
          Bulk editor: check the box and set budget tier per shoot type. Save will update recommendations via API.
        </p>
        <Button
          disabled={saving}
          onClick={async () => {
            setSaving(true)
            try {
              for (const st of shootTypes) {
                const items = Object.entries(recs[st.id] ?? {}).filter(([, v]) => v.recommended)
                if (items.length === 0) continue
                await fetch(`/api/admin/shoot-types/${st.id}/recommendations`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    recommendations: items.map(([equipmentId, v]) => ({
                      equipmentId,
                      budgetTier: v.budgetTier,
                      defaultQuantity: 1,
                      isAutoSelect: false,
                    })),
                  }),
                })
              }
              toast({ title: 'Saved', description: 'Recommendations updated.' })
              onUpdated()
            } catch {
              toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' })
            } finally {
              setSaving(false)
            }
          }}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save recommendations'}
        </Button>
      </div>
    </Card>
  )
}
