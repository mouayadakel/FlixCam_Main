/**
 * Blog search input with debounce.
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface BlogSearchProps {
  placeholder?: string
  defaultValue?: string
  onSearch: (query: string) => void
  debounceMs?: number
}

export function BlogSearch({
  placeholder,
  defaultValue = '',
  onSearch,
  debounceMs = 300,
}: BlogSearchProps) {
  const [value, setValue] = useState(defaultValue)

  const debouncedSearch = useCallback(
    (q: string) => {
      const timer = setTimeout(() => onSearch(q), debounceMs)
      return () => clearTimeout(timer)
    },
    [onSearch, debounceMs]
  )

  useEffect(() => {
    const cleanup = debouncedSearch(value)
    return cleanup
  }, [value, debouncedSearch])

  return (
    <div className="relative">
      <Search
        className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
        aria-hidden
      />
      <Input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="ps-10"
        aria-label={placeholder ?? 'Search blog posts'}
      />
    </div>
  )
}
