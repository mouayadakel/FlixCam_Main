'use client'

import { Info } from 'lucide-react'
import type { AnySpecifications } from '@/lib/types/specifications.types'
import { isStructuredSpecifications } from '@/lib/types/specifications.types'
import { sanitizeHtml } from '@/lib/utils/sanitize'
import { buildSpecsPanelModel } from './specs-panel.utils'
import { SpecsPanelClient } from './specs-panel.client'
import { NotesBlock, SpecificationsDisplay } from './specifications-display'

export type SpecsPanelProps = {
  specs: AnySpecifications | null
  locale: 'ar' | 'en'
  mode?: 'enhanced' | 'classic'
  categoryHint?: string
  comparisonReady?: boolean
}

/**
 * Server-safe shell intent:
 * - this wrapper performs deterministic model-building only
 * - browser APIs (IntersectionObserver / scrollspy) live in SpecsPanelClient
 */
export function SpecsPanel({
  specs,
  locale,
  mode = 'enhanced',
  categoryHint,
  comparisonReady = false,
}: SpecsPanelProps) {
  if (mode === 'classic') {
    return (
      <SpecificationsDisplay
        specifications={specs}
        locale={locale}
        showQuickSpecPills={false}
        showAllLabel="Show More"
        showLessLabel="Show Less"
      />
    )
  }

  const notesText =
    specs && typeof specs === 'object' && !isStructuredSpecifications(specs)
      ? typeof (specs as Record<string, unknown>).notes === 'string'
        ? ((specs as Record<string, unknown>).notes as string).trim()
        : null
      : null

  const customHtmlRaw =
    specs && typeof specs === 'object'
      ? isStructuredSpecifications(specs)
        ? specs.customHtml
        : typeof (specs as Record<string, unknown>).customHtml === 'string'
          ? ((specs as Record<string, unknown>).customHtml as string).trim()
          : null
      : null

  const legacyHtmlRaw =
    specs && typeof specs === 'object' && !isStructuredSpecifications(specs)
      ? typeof (specs as Record<string, unknown>).html === 'string'
        ? ((specs as Record<string, unknown>).html as string).trim()
        : null
      : null

  const customHtmlSafe = customHtmlRaw ? sanitizeHtml(customHtmlRaw) : null
  const legacyHtmlSafe = legacyHtmlRaw ? sanitizeHtml(legacyHtmlRaw) : null

  const model = buildSpecsPanelModel(specs, categoryHint)
  if (model.groups.length === 0 && !notesText && !customHtmlSafe && !legacyHtmlSafe) {
    return (
      <div className="rounded-2xl border border-border-light/60 bg-white p-12 text-center">
        <Info className="mx-auto mb-3 h-12 w-12 text-text-muted" />
        <p className="text-lg text-text-muted">No specifications available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {notesText ? <NotesBlock text={notesText} /> : null}
      {customHtmlSafe ? (
        <div className="rounded-2xl border border-border-light/60 bg-white p-6 shadow-card">
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: customHtmlSafe }}
          />
        </div>
      ) : null}
      {legacyHtmlSafe ? (
        <div className="rounded-2xl border border-border-light/60 bg-white p-6 shadow-card">
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: legacyHtmlSafe }}
          />
        </div>
      ) : null}
      {model.highlights.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {model.highlights.map((item) => (
            <div
              key={`${item.label}-${item.value}`}
              className="rounded-2xl border border-border-light/70 bg-gradient-to-br from-brand-primary/[0.06] via-white to-white p-4 shadow-sm"
            >
              <p
                className={
                  locale === 'ar'
                    ? 'text-xs tracking-wide text-text-muted'
                    : 'text-xs uppercase tracking-wide text-text-muted'
                }
              >
                {locale === 'ar' && item.labelAr ? item.labelAr : item.label}
              </p>
              <p className="mt-1 text-2xl font-semibold leading-tight text-text-heading">
                {item.value}
                {item.unit ? <span className="ml-1 text-sm text-text-muted">{item.unit}</span> : null}
              </p>
            </div>
          ))}
        </div>
      ) : null}
      <SpecsPanelClient model={model} locale={locale} comparisonReady={comparisonReady} />
    </div>
  )
}

export default SpecsPanel

