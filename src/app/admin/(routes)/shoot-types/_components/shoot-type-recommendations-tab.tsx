/**
 * Recommendations tab: per-category equipment picker with budget tier, reason, default qty, auto-select.
 */

'use client'

import { useState, useEffect } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'

interface CategoryStep {
  id: string
  categoryId: string
  categoryName: string
  categorySlug: string
}

interface RecItem {
  id?: string
  equipmentId: string
  equipmentName?: string
  budgetTier: string
  reason: string
  reasonAr: string
  defaultQuantity: number
  isAutoSelect: boolean
  sortOrder: number
}

interface EquipmentOption {
  id: string
  sku: string
  model: string | null
  dailyPrice: number
  category: { name: string }
}

export function ShootTypeRecommendationsTab({
  shootTypeId,
  categorySteps,
  recommendations,
  onSaved,
}: {
  shootTypeId: string
  categorySteps: CategoryStep[]
  recommendations: { id: string; equipmentId: string; budgetTier: string; reason: string | null; reasonAr: string | null; defaultQuantity: number; isAutoSelect: boolean; sortOrder: number; equipment: { id: string; sku: string; model: string | null; categoryId: string; category: { name: string; slug: string } } }[]
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [equipmentByCategory, setEquipmentByCategory] = useState<Record<string, EquipmentOption[]>>({})
  const [recsByCategory, setRecsByCategory] = useState<Record<string, RecItem[]>>({})

  useEffect(() => {
    const byCat: Record<string, RecItem[]> = {}
    categorySteps.forEach((cat) => {
      byCat[cat.categoryId] = recommendations
        .filter((r) => r.equipment.categoryId === cat.categoryId)
        .map((r, i) => ({
          id: r.id,
          equipmentId: r.equipmentId,
          equipmentName: r.equipment.model ?? r.equipment.sku,
          budgetTier: r.budgetTier,
          reason: r.reason ?? '',
          reasonAr: r.reasonAr ?? '',
          defaultQuantity: r.defaultQuantity,
          isAutoSelect: r.isAutoSelect,
          sortOrder: r.sortOrder ?? i,
        }))
    })
    setRecsByCategory(byCat)
  }, [categorySteps, recommendations])

  useEffect(() => {
    categorySteps.forEach((cat) => {
      fetch(`/api/public/equipment?categoryId=${cat.categoryId}&take=100`)
        .then((res) => res.json())
        .then((json) => {
          const data = Array.isArray(json?.data) ? json.data : []
          setEquipmentByCategory((prev) => ({
            ...prev,
            [cat.categoryId]: data.map((e: { id: string; sku: string; model?: string; dailyPrice: number; category?: { name: string } }) => ({
              id: e.id,
              sku: e.sku,
              model: e.model ?? null,
              dailyPrice: e.dailyPrice ?? 0,
              category: e.category ?? { name: '' },
            })),
          }))
        })
        .catch(() => {})
    })
  }, [categorySteps])

  const addRec = (categoryId: string) => {
    const list = equipmentByCategory[categoryId] ?? []
    const existing = recsByCategory[categoryId] ?? []
    const firstNotAdded = list.find((e) => !existing.some((r) => r.equipmentId === e.id))
    if (firstNotAdded) {
      setRecsByCategory((prev) => ({
        ...prev,
        [categoryId]: [
          ...(prev[categoryId] ?? []),
          {
            equipmentId: firstNotAdded.id,
            equipmentName: firstNotAdded.model ?? firstNotAdded.sku,
            budgetTier: 'PROFESSIONAL',
            reason: '',
            reasonAr: '',
            defaultQuantity: 1,
            isAutoSelect: false,
            sortOrder: existing.length,
          },
        ],
      }))
    }
  }

  const removeRec = (categoryId: string, equipmentId: string) => {
    setRecsByCategory((prev) => ({
      ...prev,
      [categoryId]: (prev[categoryId] ?? []).filter((r) => r.equipmentId !== equipmentId),
    }))
  }

  const updateRec = (categoryId: string, equipmentId: string, field: keyof RecItem, value: unknown) => {
    setRecsByCategory((prev) => ({
      ...prev,
      [categoryId]: (prev[categoryId] ?? []).map((r) => (r.equipmentId === equipmentId ? { ...r, [field]: value } : r)),
    }))
  }

  const saveCategory = async (categoryId: string) => {
    setSaving(true)
    try {
      const recs = recsByCategory[categoryId] ?? []
      const res = await fetch(`/api/admin/shoot-types/${shootTypeId}/recommendations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          recommendations: recs.map((r, i) => ({
            equipmentId: r.equipmentId,
            budgetTier: r.budgetTier,
            reason: r.reason || null,
            reasonAr: r.reasonAr || null,
            defaultQuantity: r.defaultQuantity,
            isAutoSelect: r.isAutoSelect,
            sortOrder: i,
          })),
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast({ title: 'Saved' })
      onSaved()
    } catch {
      toast({ title: 'Error', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (categorySteps.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Add categories in the Category Flow tab first.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recommendations</CardTitle>
        <CardDescription>Per category, add recommended equipment with budget tier and reason.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={categorySteps[0]?.categoryId}>
          <TabsList className="flex flex-wrap">
            {categorySteps.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.categoryId}>
                {cat.categoryName}
              </TabsTrigger>
            ))}
          </TabsList>
          {categorySteps.map((cat) => (
            <TabsContent key={cat.id} value={cat.categoryId} className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <Button type="button" variant="outline" size="sm" onClick={() => addRec(cat.categoryId)}>
                  <Plus className="h-4 w-4" />
                  Add equipment
                </Button>
                <Button size="sm" onClick={() => saveCategory(cat.categoryId)} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </Button>
              </div>
              <div className="space-y-2">
                {(recsByCategory[cat.categoryId] ?? []).map((r) => (
                  <div key={r.equipmentId} className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
                    <span className="font-medium">{r.equipmentName ?? r.equipmentId}</span>
                    <Select value={r.budgetTier} onValueChange={(v) => updateRec(cat.categoryId, r.equipmentId, 'budgetTier', v)}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ESSENTIAL">Essential</SelectItem>
                        <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                        <SelectItem value="PREMIUM">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Reason (EN)"
                      className="max-w-xs"
                      value={r.reason}
                      onChange={(e) => updateRec(cat.categoryId, r.equipmentId, 'reason', e.target.value)}
                    />
                    <label className="flex items-center gap-1 text-sm">
                      <input type="checkbox" checked={r.isAutoSelect} onChange={(e) => updateRec(cat.categoryId, r.equipmentId, 'isAutoSelect', e.target.checked)} />
                      Auto-select
                    </label>
                    <Input type="number" min={1} className="w-16" value={r.defaultQuantity} onChange={(e) => updateRec(cat.categoryId, r.equipmentId, 'defaultQuantity', parseInt(e.target.value, 10) || 1)} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeRec(cat.categoryId, r.equipmentId)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
