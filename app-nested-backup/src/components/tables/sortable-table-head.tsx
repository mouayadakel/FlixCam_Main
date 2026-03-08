/**
 * @file sortable-table-head.tsx
 * @description Sortable table header for list tables
 * @module components/tables
 */

'use client'

import { TableHead } from '@/components/ui/table'
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SortableTableHeadProps {
  /** Column key used for sorting */
  sortKey: string
  /** Currently active sort column */
  currentSort: string | null
  /** 'asc' | 'desc' */
  direction: 'asc' | 'desc'
  /** Called when user clicks the header */
  onSort: (key: string) => void
  children: React.ReactNode
  className?: string
}

/**
 * Table header that shows sort indicator and triggers onSort(key) on click.
 */
export function SortableTableHead({
  sortKey,
  currentSort,
  direction,
  onSort,
  children,
  className,
}: SortableTableHeadProps) {
  const isActive = currentSort === sortKey

  const handleClick = () => {
    onSort(sortKey)
  }

  return (
    <TableHead
      className={cn('cursor-pointer select-none hover:bg-muted/50', className)}
      onClick={handleClick}
    >
      <div className="flex items-center gap-1">
        {children}
        {isActive ? (
          direction === 'asc' ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        ) : (
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    </TableHead>
  )
}
