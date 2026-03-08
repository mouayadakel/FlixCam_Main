/**
 * Blog filters - category chips + tag pills + sort dropdown.
 */

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface BlogFiltersProps {
  categories: { id: string; nameAr: string; nameEn: string; slug: string; sortOrder: number }[]
  tags: { id: string; nameAr: string; nameEn: string; slug: string }[]
  locale: string
  selectedCategory?: string
  selectedTags?: string[]
  sort?: string
}

const SORT_OPTIONS = [
  { value: 'newest', labelAr: 'الأحدث', labelEn: 'Newest' },
  { value: 'popular', labelAr: 'الأكثر مشاهدة', labelEn: 'Most popular' },
  { value: 'relevant', labelAr: 'الأكثر صلة', labelEn: 'Most relevant' },
] as const

export function BlogFilters({
  categories,
  tags,
  locale,
  selectedCategory,
  selectedTags = [],
  sort = 'newest',
}: BlogFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const buildUrl = (updates: Record<string, string | string[] | undefined>) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        params.delete(key)
      } else if (Array.isArray(value)) {
        params.delete(key)
        value.forEach((v) => params.append(key, v))
      } else {
        params.set(key, value)
      }
    })
    params.set('page', '1')
    const qs = params.toString()
    return qs ? `/blog?${qs}` : '/blog'
  }

  const toggleCategory = (slug: string) => {
    const next = selectedCategory === slug ? undefined : slug
    router.push(buildUrl({ category: next }))
  }

  const toggleTag = (slug: string) => {
    const next = selectedTags.includes(slug)
      ? selectedTags.filter((t) => t !== slug)
      : [...selectedTags, slug]
    router.push(buildUrl({ tags: next }))
  }

  const setSort = (value: string) => {
    router.push(buildUrl({ sort: value }))
  }

  const currentSortLabel =
    SORT_OPTIONS.find((o) => o.value === sort)?.[locale === 'ar' ? 'labelAr' : 'labelEn'] ??
    (locale === 'ar' ? 'الأحدث' : 'Newest')

  return (
    <div className="flex flex-col gap-4">
      {/* Categories */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="sr-only">{locale === 'ar' ? 'التصنيفات' : 'Categories'}</span>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.slug ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleCategory(cat.slug)}
              className={cn(
                selectedCategory === cat.slug && 'bg-brand-primary text-white hover:bg-brand-primary-hover'
              )}
            >
              {locale === 'ar' ? cat.nameAr : cat.nameEn}
            </Button>
          ))}
        </div>
      )}

      {/* Sort + Tags row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              {currentSortLabel}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {SORT_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => setSort(opt.value)}
                className={sort === opt.value ? 'bg-brand-primary/10' : ''}
              >
                {locale === 'ar' ? opt.labelAr : opt.labelEn}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 overflow-x-auto">
            {tags.slice(0, 10).map((tag) => (
              <Button
                key={tag.id}
                variant={selectedTags.includes(tag.slug) ? 'default' : 'ghost'}
                size="sm"
                onClick={() => toggleTag(tag.slug)}
                className={cn(
                  'shrink-0',
                  selectedTags.includes(tag.slug) && 'bg-brand-primary/80 text-white hover:bg-brand-primary'
                )}
              >
                {locale === 'ar' ? tag.nameAr : tag.nameEn}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
