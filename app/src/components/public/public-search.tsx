/**
 * Public site search – pill-shaped input with search icon + attached primary button.
 * Submits to /equipment?q=...
 * Includes: recent searches (localStorage), popular suggestions, live API results.
 */

'use client'

import { useRouter } from 'next/navigation'
import { useLocale } from '@/hooks/use-locale'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, Clock, TrendingUp, X } from 'lucide-react'

const RECENT_KEY = 'flixcam_recent_searches'
const MAX_RECENT = 5

const POPULAR_SEARCHES = [
  'كاميرا Sony',
  'عدسات Canon',
  'إضاءة استوديو',
  'ميكروفون لاسلكي',
  'حامل ثلاثي',
]

function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
  } catch {
    return []
  }
}

function saveRecentSearch(query: string) {
  if (typeof window === 'undefined' || !query.trim()) return
  try {
    const recent = getRecentSearches().filter((s) => s !== query)
    recent.unshift(query)
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
  } catch {
    /* ignore */
  }
}

function clearRecentSearches() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(RECENT_KEY)
  } catch {
    /* ignore */
  }
}

export function PublicSearch() {
  const router = useRouter()
  const { t } = useLocale()
  const [q, setQ] = useState('')
  const [focused, setFocused] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [apiResults, setApiResults] = useState<{ id: string; name: string }[]>([])
  const [apiLoading, setApiLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setRecentSearches(getRecentSearches())
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Live search API – use public endpoint (no auth) so header search works for guests
  const fetchSuggestions = useCallback((query: string) => {
    if (!query.trim() || query.length < 2) {
      setApiResults([])
      return
    }
    setApiLoading(true)
    fetch(`/api/public/equipment?take=5&q=${encodeURIComponent(query)}`)
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((data) => {
        const items = data.data ?? data.items ?? data.equipment ?? []
        setApiResults(
          items.slice(0, 5).map((i: { id: string; model?: string; sku?: string; name?: string }) => ({
            id: i.id,
            name: i.model || i.sku || i.name || '',
          }))
        )
      })
      .catch(() => setApiResults([]))
      .finally(() => setApiLoading(false))
  }, [])

  const handleInputChange = (value: string) => {
    setQ(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const query = q.trim()
    if (query) {
      saveRecentSearch(query)
      setRecentSearches(getRecentSearches())
      router.push(`/equipment?q=${encodeURIComponent(query)}`)
    } else {
      router.push('/equipment')
    }
    setShowDropdown(false)
    inputRef.current?.blur()
  }

  const handleSuggestionClick = (text: string) => {
    saveRecentSearch(text)
    setRecentSearches(getRecentSearches())
    setQ(text)
    setShowDropdown(false)
    router.push(`/equipment?q=${encodeURIComponent(text)}`)
  }

  const handleClearRecent = (e: React.MouseEvent) => {
    e.stopPropagation()
    clearRecentSearches()
    setRecentSearches([])
  }

  const hasContent =
    q.length >= 2 ? apiResults.length > 0 : recentSearches.length > 0 || POPULAR_SEARCHES.length > 0

  return (
    <div ref={containerRef} className="relative w-full max-w-md flex-1 md:max-w-sm lg:max-w-md">
      <form
        onSubmit={handleSubmit}
        className={`absolute left-[-618px] top-[169px] flex w-full items-center gap-0 rounded-pill border bg-white transition-all duration-250 ${
          focused
            ? 'border-brand-primary/40 shadow-glow ring-2 ring-brand-primary/10'
            : 'border-border-input hover:border-text-muted/40'
        }`}
        role="search"
        aria-label={t('common.search')}
      >
        <div className="flex items-center ps-4">
          <Search
            className={`h-4 w-4 transition-colors duration-200 ${focused ? 'text-brand-primary' : 'text-text-muted'}`}
          />
        </div>
        <input
          ref={inputRef}
          type="search"
          name="q"
          value={q}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            setFocused(true)
            setShowDropdown(true)
          }}
          onBlur={() => setFocused(false)}
          placeholder={t('header.searchPlaceholder')}
          className="h-11 flex-1 border-0 bg-transparent px-3 text-sm text-text-heading placeholder:text-text-muted/70 focus:outline-none focus:ring-0"
          aria-label={t('header.searchPlaceholder')}
          autoComplete="off"
        />
        <button
          type="submit"
          className="me-1 h-9 rounded-pill bg-brand-primary px-5 text-sm font-semibold text-white transition-all duration-200 hover:bg-brand-primary-hover hover:shadow-md active:scale-[0.97]"
        >
          {t('common.search')}
        </button>
      </form>

      {/* Suggestions dropdown */}
      {showDropdown && hasContent && (
        <div className="absolute top-full z-50 mt-1 w-full rounded-lg border border-border-light bg-white shadow-lg">
          {/* Live API results when typing */}
          {q.length >= 2 && apiResults.length > 0 && (
            <div className="p-2">
              {apiResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleSuggestionClick(item.name)
                  }}
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-text-heading hover:bg-muted/50"
                >
                  <Search className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                  {item.name}
                </button>
              ))}
            </div>
          )}

          {/* Recent + Popular when input is empty or short */}
          {q.length < 2 && (
            <>
              {recentSearches.length > 0 && (
                <div className="border-b border-border-light p-2">
                  <div className="flex items-center justify-between px-3 py-1">
                    <span className="text-xs font-medium text-text-muted">البحث الأخير</span>
                    <button
                      type="button"
                      onMouseDown={handleClearRecent}
                      className="text-xs text-text-muted hover:text-destructive"
                    >
                      مسح
                    </button>
                  </div>
                  {recentSearches.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        handleSuggestionClick(s)
                      }}
                      className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-text-heading hover:bg-muted/50"
                    >
                      <Clock className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <div className="p-2">
                <div className="px-3 py-1">
                  <span className="text-xs font-medium text-text-muted">رائج</span>
                </div>
                {POPULAR_SEARCHES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleSuggestionClick(s)
                    }}
                    className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-text-heading hover:bg-muted/50"
                  >
                    <TrendingUp className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                    {s}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
