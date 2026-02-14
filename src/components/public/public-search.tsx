/**
 * Public site search – pill-shaped input with search icon + attached primary button.
 * Submits to /equipment?q=...
 */

'use client'

import { useRouter } from 'next/navigation'
import { useLocale } from '@/hooks/use-locale'
import { useState, useRef } from 'react'
import { Search } from 'lucide-react'

export function PublicSearch() {
  const router = useRouter()
  const { t } = useLocale()
  const [q, setQ] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const query = q.trim()
    if (query) {
      router.push(`/equipment?q=${encodeURIComponent(query)}`)
    } else {
      router.push('/equipment')
    }
    inputRef.current?.blur()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex w-full max-w-md flex-1 items-center gap-0 rounded-pill border bg-white transition-all duration-250 md:max-w-sm lg:max-w-md ${
        focused
          ? 'border-brand-primary/40 shadow-glow ring-2 ring-brand-primary/10'
          : 'border-border-input hover:border-text-muted/40'
      }`}
      role="search"
      aria-label={t('common.search')}
    >
      <div className="flex items-center ps-4">
        <Search className={`h-4 w-4 transition-colors duration-200 ${focused ? 'text-brand-primary' : 'text-text-muted'}`} />
      </div>
      <input
        ref={inputRef}
        type="search"
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={t('header.searchPlaceholder')}
        className="h-11 flex-1 border-0 bg-transparent px-3 text-sm text-text-heading placeholder:text-text-muted/70 focus:outline-none focus:ring-0"
        aria-label={t('header.searchPlaceholder')}
      />
      <button
        type="submit"
        className="h-9 me-1 rounded-pill bg-brand-primary px-5 text-sm font-semibold text-white transition-all duration-200 hover:bg-brand-primary-hover hover:shadow-md active:scale-[0.97]"
      >
        {t('common.search')}
      </button>
    </form>
  )
}
