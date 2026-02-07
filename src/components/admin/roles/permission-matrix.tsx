/**
 * @file permission-matrix.tsx
 * @description Permission matrix with checkboxes grouped by category
 * @module components/admin/roles
 */

'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Permission {
  id: string
  name: string
  description?: string | null
  descriptionAr?: string | null
  isSystem?: boolean
  sortOrder?: number
}

interface Category {
  id: string
  name: string
  nameAr?: string | null
  sortOrder?: number
  permissions: Permission[]
}

interface PermissionMatrixProps {
  categories: Category[]
  selectedPermissionIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  disabled?: boolean
}

export function PermissionMatrix({
  categories,
  selectedPermissionIds,
  onSelectionChange,
  disabled = false,
}: PermissionMatrixProps) {
  const [search, setSearch] = useState('')

  const togglePermission = (permId: string) => {
    const next = new Set(selectedPermissionIds)
    if (next.has(permId)) {
      next.delete(permId)
    } else {
      next.add(permId)
    }
    onSelectionChange(next)
  }

  const toggleCategoryWildcard = (cat: Category, grantAll: boolean) => {
    const next = new Set(selectedPermissionIds)
    const permIds = cat.permissions.map((p) => p.id)
    if (grantAll) {
      permIds.forEach((id) => next.add(id))
    } else {
      permIds.forEach((id) => next.delete(id))
    }
    onSelectionChange(next)
  }

  const clearCategory = (cat: Category) => {
    toggleCategoryWildcard(cat, false)
  }

  const filterCategories = () => {
    if (!search.trim()) return categories
    const q = search.toLowerCase()
    return categories
      .map((cat) => ({
        ...cat,
        permissions: cat.permissions.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.description || '').toLowerCase().includes(q)
        ),
      }))
      .filter((c) => c.permissions.length > 0)
  }

  const filtered = filterCategories()
  const totalSelected = selectedPermissionIds.size

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="البحث في الصلاحيات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>
        <Badge variant="secondary">
          {totalSelected} من {categories.reduce((s, c) => s + c.permissions.length, 0)} محدّد
        </Badge>
      </div>

      <Accordion type="multiple" defaultValue={filtered.slice(0, 3).map((c) => c.id)} className="w-full">
        {filtered.map((cat) => {
          const selectedCount = cat.permissions.filter((p) =>
            selectedPermissionIds.has(p.id)
          ).length
          const total = cat.permissions.length
          const allSelected = total > 0 && selectedCount === total

          return (
            <AccordionItem key={cat.id} value={cat.id}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <span>{cat.nameAr || cat.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {selectedCount}/{total}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex items-center gap-2 mb-2">
                  <Checkbox
                    id={`grant-all-${cat.id}`}
                    checked={allSelected}
                    onCheckedChange={(v) => toggleCategoryWildcard(cat, !!v)}
                    disabled={disabled}
                  />
                  <label
                    htmlFor={`grant-all-${cat.id}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    منح الكل
                  </label>
                  <button
                    type="button"
                    onClick={() => clearCategory(cat)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    مسح
                  </button>
                </div>
                <div className="grid gap-2 pr-6">
                  {cat.permissions.map((perm) => (
                    <div
                      key={perm.id}
                      className={cn(
                        'flex items-start gap-2 py-1',
                        disabled && 'opacity-70'
                      )}
                    >
                      <Checkbox
                        id={perm.id}
                        checked={selectedPermissionIds.has(perm.id)}
                        onCheckedChange={() => togglePermission(perm.id)}
                        disabled={disabled}
                      />
                      <label
                        htmlFor={perm.id}
                        className="text-sm cursor-pointer flex-1"
                      >
                        <span className="font-mono text-xs">{perm.name}</span>
                        {perm.description && (
                          <span className="block text-muted-foreground text-xs mt-0.5">
                            {perm.description}
                          </span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}
