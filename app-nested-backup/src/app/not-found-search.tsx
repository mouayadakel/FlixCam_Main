'use client'

import { useRouter } from 'next/navigation'
import { useRef } from 'react'

export function NotFoundSearch() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = inputRef.current?.value?.trim()
    if (q) {
      router.push(`/equipment?q=${encodeURIComponent(q)}`)
    } else {
      router.push('/equipment')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <label htmlFor="not-found-search" className="sr-only">
        ابحث عن معدة
      </label>
      <input
        id="not-found-search"
        ref={inputRef}
        type="search"
        name="q"
        placeholder="أو ابحث عن معدة..."
        className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
        aria-label="بحث عن معدات"
      />
      <button
        type="submit"
        className="mt-2 w-full rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
      >
        بحث
      </button>
    </form>
  )
}
