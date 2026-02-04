/**
 * @file table-filters.tsx
 * @description Table filters component
 * @module components/tables
 */

'use client'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search } from 'lucide-react'

interface TableFiltersProps {
  searchPlaceholder?: string
  categoryOptions?: string[]
  statusOptions?: string[]
  onSearchChange?: (value: string) => void
  onStatusChange?: (value: string) => void
  onMissingBoxChange?: (value: boolean) => void
}

export function TableFilters({
  searchPlaceholder = 'Search...',
  categoryOptions = [],
  statusOptions = [],
  onSearchChange,
  onStatusChange,
  onMissingBoxChange,
}: TableFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 pb-4">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          className="pl-9"
          onChange={(e) => onSearchChange?.(e.target.value)}
        />
      </div>
      {categoryOptions.length > 0 && (
        <Select>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categoryOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {statusOptions.length > 0 && (
        <Select onValueChange={(value) => onStatusChange?.(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {onMissingBoxChange && (
        <div className="flex items-center gap-2">
          <input
            id="missing-box"
            type="checkbox"
            className="h-4 w-4 accent-primary"
            onChange={(e) => onMissingBoxChange(e.target.checked)}
          />
          <label htmlFor="missing-box" className="text-sm text-muted-foreground">
            Missing box contents
          </label>
        </div>
      )}
    </div>
  )
}
