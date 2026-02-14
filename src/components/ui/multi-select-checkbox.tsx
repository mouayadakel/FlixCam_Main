/**
 * Multi-select filter group (e.g. brands) with styled checkboxes,
 * optional search, selected count badge, and scrollable list.
 */

'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { Search, Tag } from 'lucide-react'

export interface MultiSelectOption {
  id: string
  label: string
}

interface MultiSelectCheckboxProps {
  options: MultiSelectOption[]
  selectedIds: string[]
  onToggle: (id: string, checked: boolean) => void
  label?: string
  className?: string
  maxHeight?: string
}

export function MultiSelectCheckbox({
  options,
  selectedIds,
  onToggle,
  label,
  className,
  maxHeight = '14rem',
}: MultiSelectCheckboxProps) {
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header with label + count */}
      {label && (
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5" />
            {label}
          </Label>
          {selectedIds.length > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-primary px-1.5 text-[10px] font-bold text-white">
              {selectedIds.length}
            </span>
          )}
        </div>
      )}

      {/* Search within options (show when 6+ options) */}
      {options.length >= 6 && (
        <div className="relative">
          <Search className="absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${label?.toLowerCase() ?? 'options'}...`}
            className="w-full rounded-lg border border-border-light bg-surface-light py-1.5 ps-8 pe-3 text-xs text-text-heading placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-brand-primary/20"
          />
        </div>
      )}

      {/* Options list */}
      <div
        className="overflow-y-auto space-y-0.5 pe-1 scrollbar-none"
        style={{ maxHeight }}
      >
        {filtered.length === 0 ? (
          <p className="py-2 text-center text-xs text-text-muted">No matches</p>
        ) : (
          filtered.map((opt) => {
            const isSelected = selectedIds.includes(opt.id)
            return (
              <label
                key={opt.id}
                className={cn(
                  'flex items-center gap-2.5 cursor-pointer rounded-lg px-2 py-2 text-sm transition-colors',
                  isSelected
                    ? 'bg-brand-primary/5 text-text-heading'
                    : 'text-text-body hover:bg-surface-light'
                )}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => onToggle(opt.id, checked === true)}
                  className={cn(
                    'shrink-0 rounded',
                    isSelected && 'border-brand-primary data-[state=checked]:bg-brand-primary data-[state=checked]:text-white'
                  )}
                />
                <span className="truncate">{opt.label}</span>
              </label>
            )
          })
        )}
      </div>
    </div>
  )
}
