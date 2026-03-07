import React, { useState } from 'react'
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
  Info,
  Ruler,
  Cable,
  ThermometerSun,
  Sun,
  Gauge,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

interface SpecHighlight {
  icon: string
  label: string
  value: string
  sublabel?: string
}

interface QuickSpec {
  icon: string
  label: string
  value: string
}

interface SpecItem {
  key: string
  label: string
  labelAr?: string
  value: string
  type?: 'text' | 'boolean' | 'range' | 'colorTemp'
  highlight?: boolean
  rangePercent?: number
  unit?: string
}

interface SpecGroup {
  label: string
  labelAr?: string
  icon: string
  priority: number
  specs: SpecItem[]
}

interface StructuredSpecifications {
  highlights?: SpecHighlight[]
  quickSpecs?: QuickSpec[]
  groups: SpecGroup[]
}

interface SpecificationsDisplayProps {
  specifications: Record<string, any> | StructuredSpecifications
  locale?: 'en' | 'ar'
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

const SpecIcon = ({ name, className }: { name: string; className?: string }) => {
  const Icon = iconMap[name] || Info
  return <Icon className={className} />
}

// ============================================================================
// Hero Card Component
// ============================================================================

const SpecHeroCard: React.FC<{ highlights: SpecHighlight[] }> = ({ highlights }) => {
  if (!highlights || highlights.length === 0) return null

  return (
    <div className="rounded-2xl border border-brand-primary/10 bg-gradient-to-br from-brand-primary/[0.02] to-transparent p-6 shadow-sm">
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
// Quick Spec Pills Component
// ============================================================================

const QuickSpecPills: React.FC<{ specs: QuickSpec[] }> = ({ specs }) => {
  if (!specs || specs.length === 0) return null

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

const BooleanSpec: React.FC<{ value: string }> = ({ value }) => {
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

const RangeSpec: React.FC<{ value: string; rangePercent?: number }> = ({
  value,
  rangePercent = 70,
}) => {
  return (
    <div className="flex flex-1 items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-light/80">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-primary/60 to-brand-primary transition-all duration-300"
          style={{ width: `${rangePercent}%` }}
        />
      </div>
      <span className="min-w-[100px] shrink-0 text-right text-sm font-medium text-text-heading">
        {value}
      </span>
    </div>
  )
}

const ColorTempSpec: React.FC<{ value: string }> = ({ value }) => {
  return (
    <div className="flex flex-1 items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gradient-to-r from-orange-500 via-yellow-200 to-blue-500" />
      <span className="min-w-[120px] shrink-0 text-right text-sm font-medium text-text-heading">
        {value}
      </span>
    </div>
  )
}

// ============================================================================
// Grouped Specs Component
// ============================================================================

const GroupedSpecs: React.FC<{
  groups: SpecGroup[]
  locale?: 'en' | 'ar'
}> = ({ groups, locale = 'en' }) => {
  const sortedGroups = [...groups].sort((a, b) => a.priority - b.priority)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {sortedGroups.map((group, groupIdx) => (
        <div
          key={`${group.label}-${groupIdx}`}
          className="overflow-hidden rounded-2xl border border-border-light/60 bg-white shadow-card transition-all hover:shadow-lg"
        >
          {/* Group Header */}
          <div className="flex items-center gap-2.5 border-b border-border-light/40 bg-gradient-to-r from-surface-light/50 to-surface-light/20 px-5 py-3.5">
            <SpecIcon name={group.icon} className="h-5 w-5 text-brand-primary" />
            <h3 className="text-sm font-semibold tracking-wide text-text-heading">
              {locale === 'ar' && group.labelAr ? group.labelAr : group.label}
            </h3>
          </div>

          {/* Spec Rows */}
          <div className="divide-y divide-border-light/30">
            {group.specs.map((spec, specIdx) => (
              <div
                key={`${spec.key}-${specIdx}`}
                className={cn(
                  'flex items-center gap-4 px-5 py-3.5 text-sm transition-colors hover:bg-surface-light/30',
                  spec.highlight && 'border-l-2 border-l-brand-primary/40 bg-brand-primary/[0.03]',
                  specIdx % 2 !== 0 && !spec.highlight && 'bg-surface-light/20'
                )}
              >
                <span className="min-w-[140px] shrink-0 font-medium text-text-muted">
                  {locale === 'ar' && spec.labelAr ? spec.labelAr : spec.label}
                </span>

                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {spec.type === 'boolean' ? (
                    <BooleanSpec value={spec.value} />
                  ) : spec.type === 'range' ? (
                    <RangeSpec value={spec.value} rangePercent={spec.rangePercent} />
                  ) : spec.type === 'colorTemp' ? (
                    <ColorTempSpec value={spec.value} />
                  ) : (
                    <span
                      className={cn(
                        'truncate text-text-body',
                        spec.highlight && 'font-semibold text-text-heading'
                      )}
                    >
                      {spec.value}
                    </span>
                  )}
                </div>

                {spec.highlight && (
                  <span className="shrink-0 rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-primary">
                    Key
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Mobile Accordion Component
// ============================================================================

const MobileAccordion: React.FC<{
  groups: SpecGroup[]
  locale?: 'en' | 'ar'
}> = ({ groups, locale = 'en' }) => {
  const [openGroup, setOpenGroup] = useState<string | null>(groups[0]?.label || null)
  const sortedGroups = [...groups].sort((a, b) => a.priority - b.priority)

  return (
    <div className="space-y-2">
      {sortedGroups.map((group, groupIdx) => {
        const isOpen = openGroup === group.label

        return (
          <div
            key={`${group.label}-${groupIdx}`}
            className="overflow-hidden rounded-xl border border-border-light/60 bg-white"
          >
            {/* Accordion Header */}
            <button
              onClick={() => setOpenGroup(isOpen ? null : group.label)}
              className="flex w-full items-center justify-between px-4 py-3.5 text-sm font-semibold transition-colors hover:bg-surface-light/50"
            >
              <span className="flex items-center gap-2.5">
                <SpecIcon name={group.icon} className="h-4.5 w-4.5 text-brand-primary" />
                <span className="text-text-heading">
                  {locale === 'ar' && group.labelAr ? group.labelAr : group.label}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-text-muted transition-transform duration-200',
                  isOpen && 'rotate-180'
                )}
              />
            </button>

            {/* Accordion Content */}
            {isOpen && (
              <div className="divide-y divide-border-light/30 border-t border-border-light/40">
                {group.specs.map((spec, specIdx) => (
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
            )}
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// Fallback Flat Table Component
// ============================================================================

const FlatSpecsTable: React.FC<{
  specifications: Record<string, any>
}> = ({ specifications }) => {
  const entries = Object.entries(specifications).filter(
    ([key]) => !['mode', 'html', 'highlights', 'quickSpecs', 'groups'].includes(key)
  )

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-border-light/60 bg-white p-8 text-center">
        <Info className="mx-auto mb-2 h-8 w-8 text-text-muted" />
        <p className="text-text-muted">No specifications available</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border-light/60 bg-white shadow-card">
      <table className="w-full text-sm">
        <tbody>
          {entries.map(([key, value], idx) => (
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
  )
}

// ============================================================================
// Main Component
// ============================================================================

export const SpecificationsDisplay: React.FC<SpecificationsDisplayProps> = ({
  specifications,
  locale = 'en',
}) => {
  // Type guard to check if structured format
  const isStructured = (spec: any): spec is StructuredSpecifications => {
    return spec && Array.isArray(spec.groups)
  }

  if (!specifications || Object.keys(specifications).length === 0) {
    return (
      <div className="rounded-2xl border border-border-light/60 bg-white p-12 text-center">
        <Info className="mx-auto mb-3 h-12 w-12 text-text-muted" />
        <p className="text-lg text-text-muted">No specifications available</p>
      </div>
    )
  }

  // Structured format
  if (isStructured(specifications)) {
    return (
      <div className="space-y-6">
        {/* Hero Card */}
        {specifications.highlights && <SpecHeroCard highlights={specifications.highlights} />}

        {/* Quick Spec Pills */}
        {specifications.quickSpecs && <QuickSpecPills specs={specifications.quickSpecs} />}

        {/* Grouped Specs - Desktop */}
        <div className="hidden md:block">
          <GroupedSpecs groups={specifications.groups} locale={locale} />
        </div>

        {/* Mobile Accordion */}
        <div className="md:hidden">
          <MobileAccordion groups={specifications.groups} locale={locale} />
        </div>
      </div>
    )
  }

  // Fallback: Flat format (backward compatible)
  return <FlatSpecsTable specifications={specifications} />
}

export default SpecificationsDisplay
