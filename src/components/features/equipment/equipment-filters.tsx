/**
 * Equipment catalog filters (Phase 2.2).
 */

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useLocale } from '@/hooks/use-locale'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'

interface Category {
  id: string
  name: string
  slug: string
}

interface Brand {
  id: string
  name: string
  slug: string
}

interface EquipmentFiltersProps {
  categories: Category[]
  brands: Brand[]
}

export function EquipmentFilters({ categories, brands }: EquipmentFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLocale()

  const categoryId = searchParams?.get('categoryId') ?? ''
  const brandId = searchParams?.get('brandId') ?? ''

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams?.toString() ?? '')
    if (value) next.set(key, value)
    else next.delete(key)
    next.delete('skip')
    router.push(`/equipment?${next.toString()}`, { scroll: false })
  }

  const clearFilters = () => {
    router.push('/equipment', { scroll: false })
  }

  const hasFilters = categoryId || brandId

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Select
        value={categoryId || 'all'}
        onValueChange={(v) => updateParam('categoryId', v === 'all' ? '' : v)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={t('nav.equipment')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('common.filter')}</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={brandId || 'all'}
        onValueChange={(v) => updateParam('brandId', v === 'all' ? '' : v)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Brand" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All brands</SelectItem>
          {brands.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          {t('common.clear')}
        </Button>
      )}
    </div>
  )
}
