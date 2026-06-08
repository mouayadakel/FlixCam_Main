/**
 * Public site search – pill-shaped input with search icon + attached primary button.
 * Submits to /equipment?q=...
 * Includes: recent searches (localStorage), popular suggestions, live API results.
 *
 * Supports two modes:
 *  - `inline` (default): dropdown uses absolute positioning, good for desktop header
 *  - `dialog`: suggestions render inline below input, good for mobile dialogs to avoid overflow clipping
 *
 * `autoFocus` prop: when true, focuses input on mount (used in mobile dialog)
 */

'use client'

import { useRouter } from 'next/navigation'
import { useLocale } from '@/hooks/use-locale'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, Clock, TrendingUp, X, Loader2 } from 'lucide-react'

const RECENT_KEY = 'flixcam_recent_searches'
const MAX_RECENT = 5

const POPULAR_SEARCHES: Record<string, string[]> = {
  ar: ['كاميرا Sony', 'عدسات Canon', 'إضاءة استوديو', 'ميكروفون لاسلكي', 'حامل ثلاثي'],
  en: ['Sony Camera', 'Canon Lens', 'Studio Lighting', 'Wireless Mic', 'Tripod'],
  fr: ['Caméra Sony', 'Objectif Canon', 'Éclairage studio', 'Micro sans fil', 'Trépied'],
  zh: ['Sony 相机', 'Canon 镜头', '影棚灯光', '无线麦克风', '三脚架'],
}

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

interface PublicSearchProps {
  /** 'inline' = absolute dropdown (desktop), 'dialog' = inline suggestions (mobile dialog) */
  mode?: 'inline' | 'dialog'
  /** Auto-focus input on mount */
  autoFocus?: boolean
  /** Called after navigation (to close parent dialog) */
  onNavigate?: () => void
  /** Applies hero-specific desktop positioning styles for homepage banner usage */
  isHeroPositioned?: boolean
}

export function PublicSearch({
  mode = 'inline',
  autoFocus = false,
  onNavigate,
  isHeroPositioned = false,
}: PublicSearchProps) {
  const router = useRouter()
  const { t, locale } = useLocale()
  const [q, setQ] = useState('')
  const [focused, setFocused] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [apiResults, setApiResults] = useState<{ id: string; name: string }[]>([])
  const [apiLoading, setApiLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDialogMode = mode === 'dialog'

  const popularList = POPULAR_SEARCHES[locale] || POPULAR_SEARCHES.ar

  useEffect(() => {
    setRecentSearches(getRecentSearches())
  }, [])

  // Auto-focus for mobile dialog mode
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      // Small delay to let dialog opening animation finish
      const timer = setTimeout(() => inputRef.current?.focus(), 150)
      return () => clearTimeout(timer)
    }
  }, [autoFocus])

  // Close dropdown on outside click (only in inline mode)
  useEffect(() => {
    if (mode !== 'inline') return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [mode])

  // Live search API
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
          items.slice(0, 5).map((item: { id: string; model?: string; sku?: string; name?: string }) => ({
            id: item.id,
            name: item.model || item.sku || item.name || '',
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
    onNavigate?.()
  }

  const handleSuggestionClick = (text: string) => {
    saveRecentSearch(text)
    setRecentSearches(getRecentSearches())
    setQ(text)
    setShowDropdown(false)
    router.push(`/equipment?q=${encodeURIComponent(text)}`)
    onNavigate?.()
  }

  const handleClearRecent = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    clearRecentSearches()
    setRecentSearches([])
  }

  const handleSuggestionPointerDown = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault()
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current)
  }

  // Fix onBlur race condition on touch devices:
  // Delay hiding so onMouseDown/onClick on suggestions can fire first
  const handleBlur = () => {
    setFocused(false)
    blurTimeoutRef.current = setTimeout(() => {
      setShowDropdown(false)
    }, 200)
  }

  const handleFocus = () => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current)
    setFocused(true)
    setShowDropdown(true)
    if (isDialogMode) {
      containerRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }
  }

  const hasContent =
    q.length >= 2 ? apiResults.length > 0 || apiLoading : recentSearches.length > 0 || popularList.length > 0

  const shouldShowDropdown = mode === 'dialog' ? hasContent : showDropdown && hasContent

  const suggestionsContent = (
    <>
      {/* Live API results when typing */}
      {q.length >= 2 && (
        <div className="p-2">
          {apiLoading ? (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t('common.loading')}</span>
            </div>
          ) : apiResults.length > 0 ? (
            apiResults.map((item) => (
              <button
                key={item.id}
                type="button"
                onMouseDown={handleSuggestionPointerDown}
                onTouchStart={handleSuggestionPointerDown}
                onClick={() => handleSuggestionClick(item.name)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-heading transition-colors duration-150 hover:bg-brand-primary/5 active:bg-brand-primary/10"
              >
                <Search className="h-3.5 w-3.5 shrink-0 text-brand-primary/60" />
                <span className="truncate">{item.name}</span>
              </button>
            ))
          ) : (
            <div className="flex items-center justify-center py-4 text-sm text-text-muted">
              {t('header.noResults')}
            </div>
          )}
        </div>
      )}

      {/* Recent + Popular when input is empty or short */}
      {q.length < 2 && (
        <>
          {recentSearches.length > 0 && (
            <div className="border-b border-border-light p-2">
              <div className="flex items-center justify-between px-3 py-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-muted/80">
                  {t('header.recentSearches')}
                </span>
                <button
                  type="button"
                  onMouseDown={handleSuggestionPointerDown}
                  onTouchStart={handleSuggestionPointerDown}
                  onClick={handleClearRecent}
                  className="rounded px-1.5 py-0.5 text-xs text-text-muted transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  {t('header.clearHistory')}
                </button>
              </div>
              {recentSearches.map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={handleSuggestionPointerDown}
                  onTouchStart={handleSuggestionPointerDown}
                  onClick={() => handleSuggestionClick(s)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-heading transition-colors duration-150 hover:bg-brand-primary/5 active:bg-brand-primary/10"
                >
                  <Clock className="h-3.5 w-3.5 shrink-0 text-text-muted/60" />
                  <span className="truncate">{s}</span>
                  <X className="ms-auto h-3 w-3 shrink-0 text-text-muted/40 transition-colors hover:text-text-muted" />
                </button>
              ))}
            </div>
          )}
          <div className="p-2">
            <div className="px-3 py-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted/80">
                {t('header.popularSearches')}
              </span>
            </div>
            {popularList.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={handleSuggestionPointerDown}
                onTouchStart={handleSuggestionPointerDown}
                onClick={() => handleSuggestionClick(s)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-heading transition-colors duration-150 hover:bg-brand-primary/5 active:bg-brand-primary/10"
              >
                <TrendingUp className="h-3.5 w-3.5 shrink-0 text-brand-primary/50" />
                <span className="truncate">{s}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  )

  return (
    <div
      ref={containerRef}
      className={`relative w-full flex-1 ${isDialogMode ? 'max-w-none' : 'max-w-md md:max-w-sm lg:max-w-md'}`}
    >
      <form
        onSubmit={handleSubmit}
        className={`relative flex w-full items-center gap-0 rounded-pill border bg-white transition-all duration-250 ${
          isHeroPositioned
            ? 'py-5 lg:absolute lg:left-[-82px] lg:top-[190px] lg:w-[393px] lg:justify-start lg:text-left'
            : ''
        } ${
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
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={t('header.searchPlaceholder')}
          className="h-11 min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-text-heading placeholder:text-text-muted/70 focus:outline-none focus:ring-0"
          aria-label={t('header.searchPlaceholder')}
          autoComplete="off"
          enterKeyHint="search"
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ('')
              setApiResults([])
              inputRef.current?.focus()
            }}
            className="me-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-text-muted/50 transition-colors hover:bg-muted/30 hover:text-text-muted"
            aria-label={t('common.clear')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="submit"
          className={`me-1 shrink-0 rounded-pill bg-brand-primary px-3 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-brand-primary-hover hover:shadow-md active:scale-[0.97] min-h-[38px] sm:px-4 sm:text-sm ${
            isDialogMode ? 'min-w-[66px]' : ''
          }`}
        >
          {t('common.search')}
        </button>
      </form>

      {/* Suggestions – inline for dialogs, absolute for header */}
      {shouldShowDropdown && (
        <div
          className={
            mode === 'dialog'
              ? 'mt-3 max-h-[50vh] overflow-y-auto rounded-xl border border-border-light bg-white shadow-sm'
              : 'absolute top-full z-50 mt-1.5 w-full max-h-[60vh] overflow-y-auto rounded-xl border border-border-light bg-white shadow-xl animate-in fade-in-0 slide-in-from-top-1 duration-200'
          }
        >
          {suggestionsContent}
        </div>
      )}
    </div>
  )
}
