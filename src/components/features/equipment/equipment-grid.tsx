/**
 * Equipment grid/list with toggle (Phase 2.2).
 */

'use client'

import { useState } from 'react'
import { LayoutGrid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EquipmentCard } from './equipment-card'
import { EquipmentCardSkeleton } from './equipment-card-skeleton'
import type { EquipmentCardItem } from './equipment-card'

interface EquipmentGridProps {
  items: EquipmentCardItem[]
  isLoading?: boolean
}

const PAGE_SIZE = 24

export function EquipmentGrid({ items, isLoading }: EquipmentGridProps) {
  const [layout, setLayout] = useState<'grid' | 'list'>('grid')

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" disabled>
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" disabled>
            <List className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <EquipmentCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-1">
        <Button
          variant={layout === 'grid' ? 'secondary' : 'ghost'}
          size="icon"
          onClick={() => setLayout('grid')}
          aria-label="Grid view"
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button
          variant={layout === 'list' ? 'secondary' : 'ghost'}
          size="icon"
          onClick={() => setLayout('list')}
          aria-label="List view"
        >
          <List className="h-4 w-4" />
        </Button>
      </div>
      <div
        className={
          layout === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'flex flex-col gap-2'
        }
      >
        {items.map((item) => (
          <EquipmentCard key={item.id} item={item} layout={layout} />
        ))}
      </div>
    </div>
  )
}
