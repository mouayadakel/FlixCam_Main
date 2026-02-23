/**
 * @file related-equipment-selector.tsx
 * @description Searchable multi-select for related equipment
 * @module components/forms
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, X, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface Equipment {
  id: string
  sku: string
  model?: string
  category: {
    name: string
  }
}

interface RelatedEquipmentSelectorProps {
  value?: string[]
  onChange: (ids: string[]) => void
  label?: string
  excludeId?: string // Exclude current equipment from list
  className?: string
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  return a.every((id, i) => id === b[i])
}

export function RelatedEquipmentSelector({
  value = [],
  onChange,
  label = 'Related Equipment',
  excludeId,
  className,
}: RelatedEquipmentSelectorProps) {
  const [search, setSearch] = useState('')
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<string[]>(() => (Array.isArray(value) ? value : []))

  // Sync internal state when controlled value changes (e.g. form reset)
  useEffect(() => {
    const v = Array.isArray(value) ? value : []
    setSelected((prev) => (arraysEqual(prev, v) ? prev : v))
  }, [value])

  useEffect(() => {
    loadEquipment()
  }, [])

  const loadEquipment = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      params.set('take', '50')

      const response = await fetch(`/api/equipment?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to load equipment')

      const data = await response.json()
      let items = data.items || []

      // Exclude current equipment
      if (excludeId) {
        items = items.filter((item: Equipment) => item.id !== excludeId)
      }

      setEquipment(items)
    } catch (error) {
      console.error('Error loading equipment:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadEquipment()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [search])

  const filteredEquipment = useMemo(() => {
    if (!search) return equipment
    const searchLower = search.toLowerCase()
    return equipment.filter(
      (item) =>
        item.sku.toLowerCase().includes(searchLower) ||
        item.model?.toLowerCase().includes(searchLower) ||
        item.category.name.toLowerCase().includes(searchLower)
    )
  }, [equipment, search])

  const selectedEquipment = useMemo(() => {
    return equipment.filter((item) => selected.includes(item.id))
  }, [equipment, selected])

  const handleToggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter((i) => i !== id) : [...selected, id]
    setSelected(next)
    onChange(next)
  }

  const handleRemove = (id: string) => {
    const next = selected.filter((i) => i !== id)
    setSelected(next)
    onChange(next)
  }

  return (
    <div className={cn('space-y-4', className)} dir="rtl">
      <Label>{label}</Label>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <Input
          placeholder="ابحث عن المعدات (SKU، الموديل، الفئة)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
          dir="rtl"
        />
      </div>

      {/* Selected Equipment */}
      {selectedEquipment.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm">المعدات المحددة:</Label>
          <div className="flex flex-wrap gap-2">
            {selectedEquipment.map((item) => (
              <Badge key={item.id} variant="secondary" className="gap-2">
                {item.sku} {item.model && `- ${item.model}`}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => handleRemove(item.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Equipment List */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="py-8 text-center text-neutral-500">جاري التحميل...</div>
          ) : filteredEquipment.length === 0 ? (
            <div className="py-8 text-center text-neutral-500">لا توجد معدات</div>
          ) : (
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {filteredEquipment.map((item) => (
                <div
                  key={item.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50"
                  onClick={() => handleToggle(item.id)}
                >
                  <Checkbox
                    checked={selected.includes(item.id)}
                    onCheckedChange={() => handleToggle(item.id)}
                  />
                  <Package className="h-4 w-4 text-neutral-400" />
                  <div className="flex-1">
                    <p className="font-mono text-sm font-medium">{item.sku}</p>
                    {item.model && <p className="text-sm text-neutral-600">{item.model}</p>}
                    <p className="text-xs text-neutral-500">{item.category.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
