'use client'

import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SpecsPanelModel } from './specs-panel.utils'

type SpecsPanelClientProps = {
  model: SpecsPanelModel
  locale: 'ar' | 'en'
  comparisonReady?: boolean
}

const GROUPS_COLLAPSE_AFTER = 4
const ROWS_COLLAPSE_AFTER = 6

export function SpecsPanelClient({ model, locale, comparisonReady }: SpecsPanelClientProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [showAllGroups, setShowAllGroups] = useState(false)
  const [visibleGroups, setVisibleGroups] = useState<Record<string, boolean>>({})
  const [activeGroup, setActiveGroup] = useState<string | null>(null)

  const groups = useMemo(
    () => (showAllGroups ? model.groups : model.groups.slice(0, GROUPS_COLLAPSE_AFTER)),
    [model.groups, showAllGroups]
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const targets = groups
      .map((group) => document.getElementById(`spec-group-${group.id}`))
      .filter((node): node is HTMLElement => !!node)
    if (targets.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleGroups((prev) => {
          const next = { ...prev }
          for (const entry of entries) {
            const id = entry.target.id.replace('spec-group-', '')
            if (entry.isIntersecting) next[id] = true
          }
          return next
        })

        const inView = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (inView) {
          const id = inView.target.id.replace('spec-group-', '')
          setActiveGroup(id)
        }
      },
      { threshold: [0.15, 0.35, 0.6], rootMargin: '-10% 0px -60% 0px' }
    )
    targets.forEach((target) => observer.observe(target))
    return () => observer.disconnect()
  }, [groups])

  return (
    <div className="space-y-6">
      {model.quickSpecs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {model.quickSpecs.map((item) => (
            <span
              key={`${item.label}-${item.value}`}
              className="rounded-full border border-border-light/70 bg-muted/40 px-3 py-1 text-xs text-text-heading"
            >
              {item.label}: <span className="font-semibold">{item.value}</span>
            </span>
          ))}
        </div>
      )}

      <div className="hidden flex-wrap items-start gap-2 lg:flex lg:sticky lg:top-20 lg:z-10 lg:bg-background/90 lg:backdrop-blur lg:py-1">
        {groups.map((group) => (
          <a
            key={group.id}
            href={`#spec-group-${group.id}`}
            className={cn(
              'rounded-full border px-3 py-1 text-xs transition',
              activeGroup === group.id
                ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                : 'border-border-light/70 text-text-muted hover:text-text-heading'
            )}
          >
            {locale === 'ar' && group.labelAr ? group.labelAr : group.label}
          </a>
        ))}
      </div>

      {groups.map((group, index) => {
        const isExpanded = expandedGroups[group.id] ?? false
        const rows = isExpanded ? group.specs : group.specs.slice(0, ROWS_COLLAPSE_AFTER)
        const canExpandRows = group.specs.length > ROWS_COLLAPSE_AFTER
        const revealed = visibleGroups[group.id]
        const groupHeading = locale === 'ar' && group.labelAr ? group.labelAr : group.label
        return (
          <section
            key={group.id}
            id={`spec-group-${group.id}`}
            className={cn(
              'rounded-2xl border border-border-light/70 bg-gradient-to-br from-white via-white to-muted/20 p-4 shadow-sm transition-all duration-500',
              revealed ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-80'
            )}
            style={{ transitionDelay: `${index * 40}ms` }}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-text-heading">{groupHeading}</h3>
              {comparisonReady ? (
                <Badge variant="secondary" className="text-[10px]">
                  Comparison Ready
                </Badge>
              ) : null}
            </div>

            <div className="space-y-2">
              {rows.map((item, rowIdx) => (
                <div
                  key={`${group.id}-${item.key}-${rowIdx}`}
                  className="grid grid-cols-1 gap-2 rounded-xl border border-transparent px-3 py-2 transition hover:border-brand-primary/30 hover:bg-brand-primary/[0.04] sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] sm:items-start sm:gap-4"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'inline-block h-2 w-2 shrink-0 rounded-full',
                        item.badge === 'Key Spec'
                          ? 'bg-brand-primary'
                          : item.badge === 'Pro Feature'
                            ? 'bg-emerald-500'
                            : item.badge === 'Needs Review'
                              ? 'bg-amber-500'
                              : 'bg-border'
                      )}
                    />
                    <span className="min-w-0 break-words text-sm text-text-muted">
                      {locale === 'ar' && item.labelAr ? item.labelAr : item.label}
                    </span>
                    {item.badge ? (
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {item.badge}
                      </Badge>
                    ) : null}
                  </div>
                  <span
                    className="min-w-0 break-words text-sm font-medium text-text-heading sm:text-end"
                    dir="auto"
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            {canExpandRows ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setExpandedGroups((prev) => ({
                    ...prev,
                    [group.id]: !isExpanded,
                  }))
                }
                className="mt-2 h-8"
              >
                {isExpanded ? 'Show Less' : 'Show More'}
              </Button>
            ) : null}
          </section>
        )
      })}

      {model.groups.length > GROUPS_COLLAPSE_AFTER ? (
        <Button variant="outline" onClick={() => setShowAllGroups((v) => !v)}>
          {showAllGroups ? 'Show Less Groups' : 'Show More Groups'}
        </Button>
      ) : null}
    </div>
  )
}

