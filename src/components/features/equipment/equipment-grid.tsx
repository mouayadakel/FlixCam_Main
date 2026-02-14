/**
 * Equipment grid/list with modern toggle and responsive layout.
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

export function EquipmentGrid({ items, isLoading }: EquipmentGridProps) {
  const [layout, setLayout] = useState<'grid' | 'list'>('grid')

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" disabled className="rounded-lg">
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" disabled className="rounded-lg">
            <List className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <EquipmentCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end gap-1">
        <Button
          variant={layout === 'grid' ? 'secondary' : 'ghost'}
          size="icon"
          onClick={() => setLayout('grid')}
          aria-label="Grid view"
          className="rounded-lg"
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button
          variant={layout === 'list' ? 'secondary' : 'ghost'}
          size="icon"
          onClick={() => setLayout('list')}
          aria-label="List view"
          className="rounded-lg"
        >
          <List className="h-4 w-4" />
        </Button>
      </div>
      <div
        className={
          layout === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'
            : 'flex flex-col gap-3'
        }
      >
        {items.map((item) => (
          <EquipmentCard key={item.id} item={item} layout={layout} />
        ))}
      </div>
    </div>
  )
}
