'use client'

import { useCompareStore } from '@/lib/stores/compare-store'
import { Button } from '@/components/ui/button'
import { GitCompare, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CompareButtonProps {
  equipment: {
    id: string
    name: string
    slug?: string
    image?: string | null
    dailyPrice?: number | null
    category?: { name: string } | null
  }
  className?: string
}

export function CompareButton({ equipment, className }: CompareButtonProps) {
  const { addItem, removeItem, hasItem, isFull } = useCompareStore()
  const added = hasItem(equipment.id)

  const handleToggle = () => {
    if (added) {
      removeItem(equipment.id)
    } else {
      addItem({
        id: equipment.id,
        name: equipment.name,
        slug: equipment.slug ?? equipment.id,
        image: equipment.image ?? null,
        price: equipment.dailyPrice ?? null,
        category: equipment.category?.name ?? '',
      })
    }
  }

  if (!added && isFull()) return null

  return (
    <Button
      variant={added ? 'default' : 'outline'}
      size="sm"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        handleToggle()
      }}
      className={cn('gap-1.5 text-xs', className)}
    >
      {added ? <X className="h-3 w-3" /> : <GitCompare className="h-3 w-3" />}
      {added ? 'إزالة' : 'مقارنة'}
    </Button>
  )
}
