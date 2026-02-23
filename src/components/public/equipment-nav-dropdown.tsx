/**
 * Equipment nav dropdown: hover-triggered panel with flat list of categories
 * and subcategories (indented). Opens after ~200ms hover; click trigger goes to /equipment.
 */

'use client'

import { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLocale } from '@/hooks/use-locale'
import { cn } from '@/lib/utils'

const HOVER_OPEN_MS = 200
const HOVER_CLOSE_MS = 150
const DROPDOWN_MIN_WIDTH = 220

interface CategoryItem {
  id: string
  name: string
  slug: string
  parentId: string | null
  equipmentCount?: number
}

interface FlatCategoryEntry {
  id: string
  name: string
  isSubcategory: boolean
}

interface EquipmentNavDropdownProps {
  className?: string
  isActive: boolean
  onLinkClick?: () => void
  hidden?: boolean
}

export function EquipmentNavDropdown({
  className,
  isActive,
  onLinkClick,
  hidden,
}: EquipmentNavDropdownProps) {
  const { t } = useLocale()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [categories, setCategories] = useState<CategoryItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0 })

  const flatList = useMemo(() => {
    if (!categories || categories.length === 0) return []
    const parents = categories.filter((c) => !c.parentId)
    const result: FlatCategoryEntry[] = []
    for (const parent of parents) {
      result.push({ id: parent.id, name: parent.name, isSubcategory: false })
      const children = categories.filter((c) => c.parentId === parent.id)
      for (const child of children) {
        result.push({ id: child.id, name: child.name, isSubcategory: true })
      }
    }
    return result
  }, [categories])

  useEffect(() => {
    if (!open) return
    if (categories !== null) return
    setLoading(true)
    setError(false)
    fetch('/api/public/categories')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.data)) {
          setCategories(data.data)
        } else {
          setCategories([])
        }
      })
      .catch(() => {
        setError(true)
        setCategories([])
      })
      .finally(() => setLoading(false))
  }, [open, categories])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  function updatePanelPosition() {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const isRtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl'
    setPanelPosition({
      top: rect.bottom,
      left: isRtl ? rect.right - DROPDOWN_MIN_WIDTH : rect.left,
    })
  }

  useLayoutEffect(() => {
    if (!open) return
    updatePanelPosition()
    window.addEventListener('scroll', updatePanelPosition, true)
    window.addEventListener('resize', updatePanelPosition)
    return () => {
      window.removeEventListener('scroll', updatePanelPosition, true)
      window.removeEventListener('resize', updatePanelPosition)
    }
  }, [open])

  const clearOpenTimer = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }
  }

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const handleMouseEnter = () => {
    clearCloseTimer()
    openTimerRef.current = setTimeout(() => setOpen(true), HOVER_OPEN_MS)
  }

  const handleMouseLeave = () => {
    clearOpenTimer()
    closeTimerRef.current = setTimeout(() => setOpen(false), HOVER_CLOSE_MS)
  }

  const handlePanelMouseEnter = () => {
    clearCloseTimer()
    setOpen(true)
  }

  useEffect(() => {
    return () => {
      clearOpenTimer()
      clearCloseTimer()
    }
  }, [])

  if (hidden) return null

  const dropdownPanel = open ? (
    <div
      role="menu"
      aria-label={t('nav.equipment')}
      onMouseEnter={handlePanelMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'min-w-[200px] overflow-y-auto overflow-x-hidden rounded-xl border border-border-light/60 bg-white py-2 shadow-lg',
        'max-h-[60vh]'
      )}
      style={{
        position: 'fixed',
        top: panelPosition.top,
        left: panelPosition.left,
        zIndex: 9999,
        minWidth: DROPDOWN_MIN_WIDTH,
      }}
    >
      <div className="border-b border-border-light/40 px-3 py-2">
        <Link
          href="/equipment"
          onClick={onLinkClick}
          role="menuitem"
          className={cn(
            'block rounded-lg px-2 py-1.5 text-sm font-medium text-text-heading transition-colors',
            'hover:bg-brand-primary/10 hover:text-brand-primary'
          )}
        >
          {t('common.viewAll')}
        </Link>
      </div>
      <div className="py-1">
        {loading && (
          <div className="px-3 py-4 text-center text-sm text-text-muted">{t('common.loading')}</div>
        )}
        {error && !loading && (
          <div className="px-3 py-2 text-sm text-text-muted">
            <Link
              href="/equipment"
              onClick={onLinkClick}
              className="font-medium text-brand-primary hover:underline"
            >
              {t('common.viewAll')}
            </Link>
          </div>
        )}
        {!loading && !error && flatList.length === 0 && (
          <div className="px-3 py-2 text-sm text-text-muted">
            <Link
              href="/equipment"
              onClick={onLinkClick}
              className="font-medium text-brand-primary hover:underline"
            >
              {t('common.viewAll')}
            </Link>
          </div>
        )}
        {!loading && !error && flatList.length > 0 && (
          <ul className="list-none">
            {flatList.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/equipment?categoryId=${item.id}`}
                  onClick={onLinkClick}
                  role="menuitem"
                  className={cn(
                    'block px-3 py-1.5 text-start text-sm transition-colors',
                    item.isSubcategory
                      ? 'ms-4 text-text-body hover:bg-brand-primary/10 hover:text-brand-primary'
                      : 'font-medium text-text-heading hover:bg-brand-primary/10 hover:text-brand-primary'
                  )}
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  ) : null

  return (
    <div
      ref={triggerRef}
      className={cn('relative', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link
        href="/equipment"
        onClick={onLinkClick}
        aria-haspopup="true"
        aria-expanded={open}
        className={cn(
          'flex h-10 items-center text-sm font-medium transition-colors',
          isActive ? 'font-semibold text-brand-primary' : 'text-foreground/90 hover:text-foreground'
        )}
      >
        {t('nav.equipment')}
      </Link>
      {typeof document !== 'undefined' && dropdownPanel
        ? createPortal(dropdownPanel, document.body)
        : null}
    </div>
  )
}
