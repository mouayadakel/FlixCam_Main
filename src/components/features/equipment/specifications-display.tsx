'use client'

import { useState } from 'react'
import {
  Camera,
  Video,
  Scale,
  Battery,
  Aperture,
  Monitor,
  Layers,
  Move,
  Star,
  Zap,
  HardDrive,
  Wifi,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Info,
  Ruler,
  Cable,
  ThermometerSun,
  Sun,
  Gauge,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import type {
  SpecGroup,
  SpecHighlight,
  QuickSpec,
  SpecItem,
  StructuredSpecifications,
  AnySpecifications,
} from '@/lib/types/specifications.types'
import { isStructuredSpecifications } from '@/lib/types/specifications.types'

const RESERVED_FLAT_KEYS = ['mode', 'html', 'highlights', 'quickSpecs', 'groups']
const FLAT_TABLE_COLLAPSE_AFTER = 6

/** Safely coerce spec value to display string (avoids "[object Object]" for objects/arrays). */
function specValueToString(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map((v) => specValueToString(v)).join(', ')
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 200)
  return String(value)
}

// ============================================================================
// Icon Mapping
// ============================================================================

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  camera: Camera,
  video: Video,
  scale: Scale,
  battery: Battery,
  aperture: Aperture,
  monitor: Monitor,
  layers: Layers,
  move: Move,
  star: Star,
  zap: Zap,
  'hard-drive': HardDrive,
  wifi: Wifi,
  ruler: Ruler,
  cable: Cable,
  thermometer: ThermometerSun,
  sun: Sun,
  gauge: Gauge,
  info: Info,
}

function SpecIcon({ name, className }: { name: string; className?: string }) {
  const Icon = iconMap[name] ?? Info
  return <Icon className={className} />
}

// ============================================================================
// Hero Card
// ============================================================================

function SpecHeroCard({ highlights }: { highlights: SpecHighlight[] }) {
  if (!highlights?.length) return null
  return (
    <div className="rounded-2xl border border-border-light/60 bg-gradient-to-br from-brand-primary/[0.02] to-transparent p-6 shadow-sm">
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        {highlights.map((h, idx) => (
          <div key={`${h.label}-${idx}`} className="space-y-2 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary/10 transition-all hover:scale-105 hover:bg-brand-primary/15">
              <SpecIcon name={h.icon} className="h-6 w-6 text-brand-primary" />
            </div>
            <div>
              <p className="text-xl font-bold text-text-heading">{h.value}</p>
              {h.sublabel && <p className="mt-0.5 text-xs text-text-muted">{h.sublabel}</p>}
            </div>
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
              {h.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Quick Spec Pills (exported for use above tabs on detail page)
// ============================================================================

export function QuickSpecPills({ specs }: { specs: QuickSpec[] }) {
  if (!specs?.length) return null
  return (
    <div className="flex flex-wrap gap-2">
      {specs.map((spec, idx) => (
        <div
          key={`${spec.label}-${idx}`}
          className="inline-flex items-center gap-2.5 rounded-full border border-border-light/60 bg-surface-light/50 px-4 py-2 text-sm transition-all hover:border-brand-primary/30 hover:bg-brand-primary/[0.02] hover:shadow-sm"
        >
          <SpecIcon name={spec.icon} className="h-4 w-4 text-brand-primary" />
          <span className="text-text-muted">{spec.label}</span>
          <span className="font-semibold text-text-heading">{spec.value}</span>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Spec Value Renderers
// ============================================================================

function BooleanSpec({ value }: { value: string }) {
  const isTrue = value.toLowerCase() === 'yes' || value.toLowerCase() === 'true'
  return (
    <div className="flex items-center gap-2">
      {isTrue ? (
        <>
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span className="font-medium text-emerald-700">Yes</span>
        </>
      ) : (
        <>
          <XCircle className="h-4 w-4 text-neutral-300" />
          <span className="text-text-muted">No</span>
        </>
      )}
    </div>
  )
}

function RangeSpec({ value, rangePercent = 70 }: { value: string; rangePercent?: number }) {
  return (
    <div className="flex flex-1 items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-light/80">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-primary/60 to-brand-primary transition-all duration-300"
          style={{ width: `${rangePercent}%` }}
        />
      </div>
      <span className="min-w-[100px] shrink-0 text-end text-sm font-medium text-text-heading">
        {value}
      </span>
    </div>
  )
}

function ColorTempSpec({ value }: { value: string }) {
  return (
    <div className="flex flex-1 items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gradient-to-r from-orange-500 via-yellow-200 to-blue-500" />
      <span className="min-w-[120px] shrink-0 text-end text-sm font-medium text-text-heading">
        {value}
      </span>
    </div>
  )
}

// ============================================================================
// Single Group Card (for desktop grid)
// ============================================================================

function SpecGroupCard({
  group,
  locale,
  className,
}: {
  group: SpecGroup
  locale: 'en' | 'ar'
  className?: string
}) {
  const label = locale === 'ar' && group.labelAr ? group.labelAr : group.label
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border-light/60 bg-white shadow-card transition-all hover:shadow-lg',
        className
      )}
    >
      <div className="flex items-center gap-2.5 border-b border-border-light/40 bg-gradient-to-r from-surface-light/50 to-surface-light/20 px-5 py-3.5">
        <SpecIcon name={group.icon} className="h-5 w-5 text-brand-primary" />
        <h3 className="text-sm font-semibold tracking-wide text-text-heading">{label}</h3>
      </div>
      <div className="divide-y divide-border-light/30">
        {group.specs.map((spec, specIdx) => (
          <SpecRow key={`${spec.key}-${specIdx}`} spec={spec} locale={locale} index={specIdx} />
        ))}
      </div>
    </div>
  )
}

function SpecRow({ spec, locale, index }: { spec: SpecItem; locale: 'en' | 'ar'; index: number }) {
  const label = locale === 'ar' && spec.labelAr ? spec.labelAr : spec.label
  const displayValue = specValueToString(spec.value)
  return (
    <div
      className={cn(
        'flex items-center gap-4 px-5 py-3.5 text-sm transition-colors hover:bg-surface-light/30',
        spec.highlight && 'border-s-2 border-s-brand-primary/40 bg-brand-primary/[0.03]',
        !spec.highlight && index % 2 !== 0 && 'bg-surface-light/20'
      )}
    >
      <span className="min-w-[140px] shrink-0 font-medium text-text-muted">{label}</span>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {spec.type === 'boolean' ? (
          <BooleanSpec value={displayValue} />
        ) : spec.type === 'range' ? (
          <RangeSpec value={displayValue} rangePercent={spec.rangePercent} />
        ) : spec.type === 'colorTemp' ? (
          <ColorTempSpec value={displayValue} />
        ) : (
          <span
            className={cn(
              'truncate text-text-body',
              spec.highlight && 'font-semibold text-text-heading'
            )}
          >
            {displayValue}
          </span>
        )}
      </div>
      {spec.highlight && (
        <span className="shrink-0 rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-primary">
          Key
        </span>
      )}
    </div>
  )
}

// ============================================================================
// Grouped Specs with Progressive Disclosure (Desktop)
// ============================================================================

function GroupedSpecsDesktop({
  groups,
  locale,
  isExpanded,
  onToggle,
}: {
  groups: SpecGroup[]
  locale: 'en' | 'ar'
  isExpanded: boolean
  onToggle: () => void
}) {
  const sorted = [...groups].sort((a, b) => a.priority - b.priority)
  const first = sorted[0]
  const rest = sorted.slice(1)
  const moreCount = rest.length

  return (
    <div className="space-y-4">
      {first && <SpecGroupCard group={first} locale={locale} />}
      {moreCount > 0 && (
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border-light/60 bg-surface-light/40 px-4 py-2.5 text-sm font-medium text-text-heading transition-colors hover:bg-surface-light/60"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Show All Specifications ({moreCount} more group
              {moreCount !== 1 ? 's' : ''})
            </>
          )}
        </button>
      )}
      {isExpanded && moreCount > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {rest.map((group, idx) => (
            <SpecGroupCard key={`${group.label}-${idx}`} group={group} locale={locale} />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Mobile Accordion with Progressive Disclosure
// ============================================================================

function GroupedSpecsMobile({
  groups,
  locale,
  isExpanded,
  onToggle,
}: {
  groups: SpecGroup[]
  locale: 'en' | 'ar'
  isExpanded: boolean
  onToggle: () => void
}) {
  const sorted = [...groups].sort((a, b) => a.priority - b.priority)
  const first = sorted[0]
  const rest = sorted.slice(1)
  const moreCount = rest.length
  const defaultOpen = first ? [first.label] : []

  return (
    <div className="space-y-2">
      <Accordion type="multiple" defaultValue={defaultOpen} className="w-full">
        {first && (
          <AccordionItem
            value={first.label}
            className="overflow-hidden rounded-xl border border-border-light/60 bg-white px-0"
          >
            <AccordionTrigger className="px-4 py-3.5 hover:no-underline">
              <span className="flex items-center gap-2.5">
                <SpecIcon name={first.icon} className="h-4.5 w-4.5 text-brand-primary" />
                <span className="text-text-heading">
                  {locale === 'ar' && first.labelAr ? first.labelAr : first.label}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-0 pb-0">
              <div className="divide-y divide-border-light/30 border-t border-border-light/40">
                {first.specs.map((spec, specIdx) => (
                  <div
                    key={`${spec.key}-${specIdx}`}
                    className={cn('px-4 py-3 text-sm', spec.highlight && 'bg-brand-primary/[0.03]')}
                  >
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                        {locale === 'ar' && spec.labelAr ? spec.labelAr : spec.label}
                      </span>
                      {spec.type === 'boolean' ? (
                        <BooleanSpec value={spec.value} />
                      ) : spec.type === 'range' ? (
                        <RangeSpec value={spec.value} rangePercent={spec.rangePercent} />
                      ) : spec.type === 'colorTemp' ? (
                        <ColorTempSpec value={spec.value} />
                      ) : (
                        <span
                          className={cn(
                            'text-text-body',
                            spec.highlight && 'font-semibold text-text-heading'
                          )}
                        >
                          {spec.value}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
        {isExpanded &&
          rest.map((group, idx) => (
            <AccordionItem
              key={`${group.label}-${idx}`}
              value={group.label}
              className="overflow-hidden rounded-xl border border-border-light/60 bg-white px-0"
            >
              <AccordionTrigger className="px-4 py-3.5 hover:no-underline">
                <span className="flex items-center gap-2.5">
                  <SpecIcon name={group.icon} className="h-4.5 w-4.5 text-brand-primary" />
                  <span className="text-text-heading">
                    {locale === 'ar' && group.labelAr ? group.labelAr : group.label}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-0 pb-0">
                <div className="divide-y divide-border-light/30 border-t border-border-light/40">
                  {group.specs.map((spec, specIdx) => (
                    <div
                      key={`${spec.key}-${specIdx}`}
                      className={cn(
                        'px-4 py-3 text-sm',
                        spec.highlight && 'bg-brand-primary/[0.03]'
                      )}
                    >
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                          {locale === 'ar' && spec.labelAr ? spec.labelAr : spec.label}
                        </span>
                        {spec.type === 'boolean' ? (
                          <BooleanSpec value={spec.value} />
                        ) : spec.type === 'range' ? (
                          <RangeSpec value={spec.value} rangePercent={spec.rangePercent} />
                        ) : spec.type === 'colorTemp' ? (
                          <ColorTempSpec value={spec.value} />
                        ) : (
                          <span
                            className={cn(
                              'text-text-body',
                              spec.highlight && 'font-semibold text-text-heading'
                            )}
                          >
                            {spec.value}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
      </Accordion>
      {moreCount > 0 && (
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border-light/60 bg-surface-light/40 px-4 py-2.5 text-sm font-medium text-text-heading transition-colors hover:bg-surface-light/60"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Show All Specifications ({moreCount} more)
            </>
          )}
        </button>
      )}
    </div>
  )
}

// ============================================================================
// Flat Specs Table with 6-row collapse
// ============================================================================

function FlatSpecsTable({
  specifications,
  showAllLabel,
  showLessLabel,
}: {
  specifications: Record<string, unknown>
  showAllLabel?: string
  showLessLabel?: string
}) {
  const entries = Object.entries(specifications).filter(
    ([key]) => !RESERVED_FLAT_KEYS.includes(key)
  )
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? entries : entries.slice(0, FLAT_TABLE_COLLAPSE_AFTER)
  const hasMore = entries.length > FLAT_TABLE_COLLAPSE_AFTER
  const moreCount = entries.length - FLAT_TABLE_COLLAPSE_AFTER

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-border-light/60 bg-white p-8 text-center">
        <Info className="mx-auto mb-2 h-8 w-8 text-text-muted" />
        <p className="text-text-muted">No specifications available</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-2xl border border-border-light/60 bg-white shadow-card">
        <table className="w-full text-sm">
          <tbody>
            {visible.map(([key, value], idx) => (
              <tr
                key={key}
                className={cn(
                  'transition-colors hover:bg-surface-light/50',
                  idx % 2 === 0 ? 'bg-white' : 'bg-surface-light/30'
                )}
              >
                <td className="whitespace-nowrap px-5 py-3.5 font-medium capitalize text-text-heading">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </td>
                <td className="px-5 py-3.5 text-text-body">{String(value ?? '—')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border-light/60 bg-surface-light/40 px-4 py-2.5 text-sm font-medium text-text-heading transition-colors hover:bg-surface-light/60"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              {showLessLabel ?? 'Show Less'}
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              {showAllLabel ?? `Show All (${moreCount} more)`}
            </>
          )}
        </button>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export interface SpecificationsDisplayProps {
  specifications: AnySpecifications | null | undefined
  locale?: 'en' | 'ar'
  /** When false, hides quick spec pills (e.g. when pills are shown above tabs) */
  showQuickSpecPills?: boolean
  showAllLabel?: string
  showLessLabel?: string
}

export function SpecificationsDisplay({
  specifications,
  locale = 'en',
  showQuickSpecPills = true,
  showAllLabel,
  showLessLabel,
}: SpecificationsDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!specifications || typeof specifications !== 'object') {
    return (
      <div className="rounded-2xl border border-border-light/60 bg-white p-12 text-center">
        <Info className="mx-auto mb-3 h-12 w-12 text-text-muted" />
        <p className="text-lg text-text-muted">No specifications available</p>
      </div>
    )
  }

  if (Object.keys(specifications).length === 0) {
    return (
      <div className="rounded-2xl border border-border-light/60 bg-white p-12 text-center">
        <Info className="mx-auto mb-3 h-12 w-12 text-text-muted" />
        <p className="text-lg text-text-muted">No specifications available</p>
      </div>
    )
  }

  if (isStructuredSpecifications(specifications)) {
    return (
      <div className="space-y-6">
        {specifications.highlights && <SpecHeroCard highlights={specifications.highlights} />}
        {showQuickSpecPills && specifications.quickSpecs && (
          <QuickSpecPills specs={specifications.quickSpecs} />
        )}
        <div className="hidden md:block">
          <GroupedSpecsDesktop
            groups={specifications.groups}
            locale={locale}
            isExpanded={isExpanded}
            onToggle={() => setIsExpanded((v) => !v)}
          />
        </div>
        <div className="md:hidden">
          <GroupedSpecsMobile
            groups={specifications.groups}
            locale={locale}
            isExpanded={isExpanded}
            onToggle={() => setIsExpanded((v) => !v)}
          />
        </div>
      </div>
    )
  }

  return (
    <FlatSpecsTable
      specifications={specifications as Record<string, unknown>}
      showAllLabel={showAllLabel}
      showLessLabel={showLessLabel}
    />
  )
}

export default SpecificationsDisplay
