/**
 * Category Flow tab: sortable list of categories with isRequired, min/max, step titles.
 */

'use client'

import { useState, useEffect } from 'react'
import { Loader2, GripVertical } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'

interface CategoryStep {
  id: string
  categoryId: string
  categoryName: string
  categorySlug: string
  sortOrder: number
  isRequired: boolean
  minRecommended: number | null
  maxRecommended: number | null
  stepTitle: string | null
  stepTitleAr: string | null
  stepDescription: string | null
  stepDescriptionAr: string | null
}

interface CategoryOption {
  id: string
  name: string
  slug: string
}

export function ShootTypeCategoryFlowTab({
  shootTypeId,
  categorySteps,
  onSaved,
}: {
  shootTypeId: string
  categorySteps: CategoryStep[]
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [flows, setFlows] = useState<
    {
      categoryId: string
      categoryName: string
      sortOrder: number
      isRequired: boolean
      minRecommended: number | null
      maxRecommended: number | null
      stepTitle: string
      stepTitleAr: string
      stepDescription: string
      stepDescriptionAr: string
    }[]
  >([])

  useEffect(() => {
    fetch('/api/public/categories')
      .then((res) => res.json())
      .then((json) => {
        const data = Array.isArray(json?.data) ? json.data : []
        setCategories(
          data.map((c: { id: string; name: string; slug: string }) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
          }))
        )
      })
      .catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    if (categorySteps.length > 0) {
      setFlows(
        categorySteps.map((s) => ({
          categoryId: s.categoryId,
          categoryName: s.categoryName,
          sortOrder: s.sortOrder,
          isRequired: s.isRequired,
          minRecommended: s.minRecommended,
          maxRecommended: s.maxRecommended,
          stepTitle: s.stepTitle ?? '',
          stepTitleAr: s.stepTitleAr ?? '',
          stepDescription: s.stepDescription ?? '',
          stepDescriptionAr: s.stepDescriptionAr ?? '',
        }))
      )
    } else {
      setFlows([])
    }
  }, [categorySteps])

  const addCategory = () => {
    const firstMissing = categories.find((c) => !flows.some((f) => f.categoryId === c.id))
    if (firstMissing) {
      setFlows((prev) => [
        ...prev,
        {
          categoryId: firstMissing.id,
          categoryName: firstMissing.name,
          sortOrder: prev.length,
          isRequired: true,
          minRecommended: null,
          maxRecommended: null,
          stepTitle: '',
          stepTitleAr: '',
          stepDescription: '',
          stepDescriptionAr: '',
        },
      ])
    }
  }

  const removeFlow = (index: number) => {
    setFlows((prev) => prev.filter((_, i) => i !== index).map((f, i) => ({ ...f, sortOrder: i })))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/shoot-types/${shootTypeId}/category-flows`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flows: flows.map((f, i) => ({
            categoryId: f.categoryId,
            sortOrder: i,
            isRequired: f.isRequired,
            minRecommended: f.minRecommended ?? null,
            maxRecommended: f.maxRecommended ?? null,
            stepTitle: f.stepTitle || null,
            stepTitleAr: f.stepTitleAr || null,
            stepDescription: f.stepDescription || null,
            stepDescriptionAr: f.stepDescriptionAr || null,
          })),
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast({ title: 'Saved' })
      onSaved()
    } catch {
      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Flow</CardTitle>
        <CardDescription>Order of categories in the kit builder and step labels.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {flows.map((f, index) => (
          <div
            key={`${f.categoryId}-${index}`}
            className="flex flex-wrap items-start gap-4 rounded-xl border p-4"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <GripVertical className="h-4 w-4" />
              <span className="text-sm font-medium">{index + 1}</span>
            </div>
            <div className="min-w-[200px] flex-1 space-y-2">
              <Label>Category</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={f.categoryId}
                onChange={(e) => {
                  const cat = categories.find((c) => c.id === e.target.value)
                  if (cat)
                    setFlows((prev) =>
                      prev.map((x, i) =>
                        i === index ? { ...x, categoryId: cat.id, categoryName: cat.name } : x
                      )
                    )
                }}
              >
                {categories.map((c) => (
                  <option
                    key={c.id}
                    value={c.id}
                    disabled={flows.some((x, i) => i !== index && x.categoryId === c.id)}
                  >
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Step title (EN)</Label>
                  <Input
                    value={f.stepTitle}
                    onChange={(e) =>
                      setFlows((prev) =>
                        prev.map((x, i) => (i === index ? { ...x, stepTitle: e.target.value } : x))
                      )
                    }
                    placeholder="e.g. Choose cameras"
                  />
                </div>
                <div>
                  <Label className="text-xs">Step title (AR)</Label>
                  <Input
                    value={f.stepTitleAr}
                    onChange={(e) =>
                      setFlows((prev) =>
                        prev.map((x, i) =>
                          i === index ? { ...x, stepTitleAr: e.target.value } : x
                        )
                      )
                    }
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={f.isRequired}
                    onChange={(e) =>
                      setFlows((prev) =>
                        prev.map((x, i) =>
                          i === index ? { ...x, isRequired: e.target.checked } : x
                        )
                      )
                    }
                  />
                  <span className="text-sm">Required</span>
                </label>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Min</Label>
                  <Input
                    type="number"
                    min={0}
                    className="w-16"
                    value={f.minRecommended ?? ''}
                    onChange={(e) =>
                      setFlows((prev) =>
                        prev.map((x, i) =>
                          i === index
                            ? {
                                ...x,
                                minRecommended: e.target.value
                                  ? parseInt(e.target.value, 10)
                                  : null,
                              }
                            : x
                        )
                      )
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Max</Label>
                  <Input
                    type="number"
                    min={0}
                    className="w-16"
                    value={f.maxRecommended ?? ''}
                    onChange={(e) =>
                      setFlows((prev) =>
                        prev.map((x, i) =>
                          i === index
                            ? {
                                ...x,
                                maxRecommended: e.target.value
                                  ? parseInt(e.target.value, 10)
                                  : null,
                              }
                            : x
                        )
                      )
                    }
                  />
                </div>
              </div>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => removeFlow(index)}>
              Remove
            </Button>
          </div>
        ))}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCategory}
            disabled={flows.length >= categories.length}
          >
            Add category
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
