/**
 * Public site search – pill-shaped input + attached primary button.
 * Submits to /equipment?q=...
 */

'use client'

import { useRouter } from 'next/navigation'
import { useLocale } from '@/hooks/use-locale'
import { useState } from 'react'

export function PublicSearch() {
  const router = useRouter()
  const { t } = useLocale()
  const [q, setQ] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const query = q.trim()
    if (query) {
      router.push(`/equipment?q=${encodeURIComponent(query)}`)
    } else {
      router.push('/equipment')
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-md flex-1 items-center gap-0 rounded-pill border border-border-input bg-white md:max-w-sm lg:max-w-md"
      role="search"
      aria-label={t('common.search')}
    >
      <input
        type="search"
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t('header.searchPlaceholder')}
        className="h-11 flex-1 rounded-s-pill border-0 bg-transparent px-4 text-sm text-text-heading placeholder:text-text-muted focus:outline-none focus:ring-0"
        aria-label={t('header.searchPlaceholder')}
      />
      <button
        type="submit"
        className="h-11 rounded-e-pill bg-brand-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover"
      >
        {t('common.search')}
      </button>
    </form>
  )
}
