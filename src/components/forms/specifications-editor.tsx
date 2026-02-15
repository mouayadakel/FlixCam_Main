/**
 * @file specifications-editor.tsx
 * @description Grouped specifications editor with highlights, quick specs, groups, preview, and JSON view.
 * @module components/forms
 */

'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Plus,
  Trash2,
  GripVertical,
  Eye,
  Code,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Copy,
  Check,
  Star,
  Zap,
  HardDrive,
  Wifi,
  Ruler,
  Cable,
  Monitor,
  Camera,
  Info,
  Sun,
  Gauge,
  Link2,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type {
  SpecItem,
  SpecGroup,
  SpecHighlight,
  QuickSpec,
  StructuredSpecifications
} from '@/lib/types/specifications.types'
import { isStructuredSpecifications } from '@/lib/types/specifications.types'
import {
  convertFlatToStructured,
  categoryTemplates
} from '@/lib/utils/specifications.utils'
import { SpecificationsDisplay } from '@/components/features/equipment/specifications-display'

const ICON_OPTIONS = [
  { value: 'star', label: 'Star' },
  { value: 'zap', label: 'Power' },
  { value: 'hard-drive', label: 'Storage' },
  { value: 'wifi', label: 'Connectivity' },
  { value: 'ruler', label: 'Dimensions' },
  { value: 'cable', label: 'Cable' },
  { value: 'monitor', label: 'Display' },
  { value: 'camera', label: 'Camera' },
  { value: 'sun', label: 'Sun' },
  { value: 'gauge', label: 'Gauge' },
  { value: 'info', label: 'Info' }
]

const DEFAULT_STRUCTURED: StructuredSpecifications = {
  groups: [
    { label: 'Specifications', labelAr: 'المواصفات', icon: 'star', priority: 1, specs: [] }
  ]
}

export interface SpecificationsEditorProps {
  value?: Record<string, unknown> | StructuredSpecifications
  onChange: (value: StructuredSpecifications) => void
  label?: string
  className?: string
  categoryHint?: string
}

function normalizeValue(
  value: Record<string, unknown> | StructuredSpecifications | undefined,
  categoryHint?: string
): StructuredSpecifications {
  if (!value || typeof value !== 'object') return DEFAULT_STRUCTURED
  if (isStructuredSpecifications(value)) return value
  return convertFlatToStructured(value as Record<string, unknown>, categoryHint)
}

function SpecItemEditor({
  spec,
  onChange,
  onDelete
}: {
  spec: SpecItem
  onChange: (s: SpecItem) => void
  onDelete: () => void
}) {
  return (
    <div className="group relative rounded-lg border border-border-light bg-white p-4 space-y-3 hover:border-brand-primary/30 hover:shadow-sm transition-all">
      <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-4 w-4 text-text-muted" />
      </div>
      <div className="pl-6 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-medium text-text-muted">Key *</Label>
            <Input
              value={spec.key}
              onChange={(e) => onChange({ ...spec, key: e.target.value })}
              placeholder="e.g., sensor"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-text-muted">Label (EN) *</Label>
            <Input
              value={spec.label}
              onChange={(e) => onChange({ ...spec, label: e.target.value })}
              placeholder="e.g., Sensor"
              className="mt-1"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-medium text-text-muted">Value *</Label>
            <Input
              value={spec.value}
              onChange={(e) => onChange({ ...spec, value: e.target.value })}
              placeholder="e.g., 12.1MP Full-Frame"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-text-muted">Label (AR)</Label>
            <Input
              value={spec.labelAr ?? ''}
              onChange={(e) => onChange({ ...spec, labelAr: e.target.value })}
              placeholder="e.g., المستشعر"
              className="mt-1"
              dir="rtl"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs font-medium text-text-muted">Type</Label>
            <select
              value={spec.type ?? 'text'}
              onChange={(e) =>
                onChange({ ...spec, type: e.target.value as SpecItem['type'] })
              }
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              aria-label="Specification type"
            >
              <option value="text">Text</option>
              <option value="boolean">Yes/No</option>
              <option value="range">Range Bar</option>
              <option value="colorTemp">Color Temp</option>
            </select>
          </div>
          {spec.type === 'range' && (
            <div>
              <Label className="text-xs font-medium text-text-muted">Range %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={spec.rangePercent ?? 70}
                onChange={(e) =>
                  onChange({ ...spec, rangePercent: parseInt(e.target.value, 10) })
                }
                className="mt-1"
              />
            </div>
          )}
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={spec.highlight ?? false}
                onChange={(e) => onChange({ ...spec, highlight: e.target.checked })}
                className="rounded border-border-light text-brand-primary focus:ring-brand-primary/20"
              />
              <span className="text-xs font-medium text-text-muted">Highlight</span>
            </label>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-all"
        aria-label="Delete spec"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

function GroupEditor({
  group,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown
}: {
  group: SpecGroup
  onChange: (g: SpecGroup) => void
  onDelete: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  const [expanded, setExpanded] = useState(true)

  const addSpec = () => {
    onChange({
      ...group,
      specs: [
        ...group.specs,
        { key: '', label: '', value: '', type: 'text' }
      ]
    })
  }

  return (
    <div className="rounded-xl border-2 border-border-light bg-surface-light/30 overflow-hidden">
      <div className="flex items-center gap-3 bg-white border-b border-border-light p-4">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="p-1 hover:bg-surface-light rounded transition-colors"
          aria-label={expanded ? 'Collapse group' : 'Expand group'}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-text-muted" />
          ) : (
            <ChevronUp className="h-4 w-4 text-text-muted" />
          )}
        </button>
        <select
          value={group.icon}
          onChange={(e) => onChange({ ...group, icon: e.target.value })}
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          aria-label="Group icon"
        >
          {ICON_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Input
          value={group.label}
          onChange={(e) => onChange({ ...group, label: e.target.value })}
          placeholder="Group Label (EN)"
          className="flex-1 font-medium"
        />
        <Input
          value={group.labelAr ?? ''}
          onChange={(e) => onChange({ ...group, labelAr: e.target.value })}
          placeholder="التسمية (AR)"
          className="flex-1"
          dir="rtl"
        />
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="h-8 w-8"
            aria-label="Move group up"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="h-8 w-8"
            aria-label="Move group down"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-red-500 hover:bg-red-50" aria-label="Delete group">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {expanded && (
        <div className="p-4 space-y-3">
          {group.specs.map((spec, idx) => (
            <SpecItemEditor
              key={`${spec.key}-${idx}`}
              spec={spec}
              onChange={(updated) => {
                const next = [...group.specs]
                next[idx] = updated
                onChange({ ...group, specs: next })
              }}
              onDelete={() =>
                onChange({
                  ...group,
                  specs: group.specs.filter((_, i) => i !== idx)
                })
              }
            />
          ))}
          <Button
            type="button"
            variant="outline"
            className="w-full border-2 border-dashed"
            onClick={addSpec}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Specification
          </Button>
        </div>
      )}
    </div>
  )
}

export function SpecificationsEditor({
  value,
  onChange,
  label = 'Specifications',
  className,
  categoryHint
}: SpecificationsEditorProps) {
  const normalized = useMemo(
    () => normalizeValue(value, categoryHint),
    [value, categoryHint]
  )
  const [state, setState] = useState<StructuredSpecifications>(normalized)
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'json'>('edit')
  const [copied, setCopied] = useState(false)
  const [fetchDialogOpen, setFetchDialogOpen] = useState(false)
  const [fetchUrl, setFetchUrl] = useState('')
  const [fetchLoading, setFetchLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const lastSyncedFlatRef = useRef<Record<string, unknown> | null>(null)
  useEffect(() => {
    const next = normalizeValue(value, categoryHint)
    setState(next)
    if (!isStructuredSpecifications(value) && value && typeof value === 'object' && Object.keys(value).length > 0) {
      if (lastSyncedFlatRef.current !== value) {
        lastSyncedFlatRef.current = value as Record<string, unknown>
        onChange(next)
      }
    } else {
      lastSyncedFlatRef.current = null
    }
  }, [value, categoryHint])

  const syncChange = (next: StructuredSpecifications) => {
    setState(next)
    onChange(next)
  }

  const template = categoryHint ? categoryTemplates[categoryHint.toLowerCase()] : undefined

  const addGroup = () => {
    const newPriority = state.groups.length + 1
    syncChange({
      ...state,
      groups: [
        ...state.groups,
        { label: '', icon: 'star', priority: newPriority, specs: [] }
      ]
    })
  }

  const loadTemplate = () => {
    if (!template?.groups?.length) return
    syncChange({
      ...state,
      groups: template.groups as SpecGroup[]
    })
  }

  const moveGroup = (index: number, direction: 'up' | 'down') => {
    const next = [...state.groups]
    const to = direction === 'up' ? index - 1 : index + 1
    if (to < 0 || to >= next.length) return
    ;[next[index], next[to]] = [next[to], next[index]]
    next.forEach((g, i) => {
      g.priority = i + 1
    })
    syncChange({ ...state, groups: next })
  }

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(state, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const updateHighlights = (highlights: SpecHighlight[]) => {
    syncChange({ ...state, highlights })
  }

  const updateQuickSpecs = (quickSpecs: QuickSpec[]) => {
    syncChange({ ...state, quickSpecs })
  }

  const handleFetchFromUrl = async () => {
    const url = fetchUrl.trim()
    if (!url) {
      setFetchError('أدخل رابط الصفحة')
      return
    }
    setFetchError(null)
    setFetchLoading(true)
    try {
      const res = await fetch('/api/admin/equipment/fetch-specs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          categoryHint: categoryHint || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFetchError(data.error || 'فشل جلب المواصفات')
        return
      }
      if (data.specifications?.groups?.length) {
        syncChange(data.specifications)
        setFetchDialogOpen(false)
        setFetchUrl('')
      } else {
        setFetchError('لم يتم استخراج مواصفات من الصفحة')
      }
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'خطأ في الاتصال')
    } finally {
      setFetchLoading(false)
    }
  }

  return (
    <div className={cn('space-y-4', className)} dir="rtl">
      {label && <Label>{label}</Label>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={viewMode === 'edit' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('edit')}
          >
            Edit
          </Button>
          <Button
            type="button"
            variant={viewMode === 'preview' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('preview')}
          >
            <Eye className="h-4 w-4 ml-1.5" />
            Preview
          </Button>
          <Button
            type="button"
            variant={viewMode === 'json' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('json')}
          >
            <Code className="h-4 w-4 ml-1.5" />
            JSON
          </Button>
        </div>
        {template && (
          <Button
            type="button"
            size="sm"
            onClick={loadTemplate}
            className="bg-brand-primary hover:bg-brand-primary/90"
          >
            <Sparkles className="h-4 w-4 ml-1.5" />
            Load {categoryHint} Template
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setFetchError(null)
            setFetchUrl('')
            setFetchDialogOpen(true)
          }}
        >
          <Link2 className="h-4 w-4 ml-1.5" />
          جلب المواصفات من رابط
        </Button>
      </div>

      <Dialog open={fetchDialogOpen} onOpenChange={setFetchDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>جلب المواصفات من صفحة ويب</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-muted">
            الصق رابط أي صفحة منتج (موقع الشركة، متجر، إلخ) وسيتم استخراج المواصفات تلقائياً.
          </p>
          <div className="space-y-2">
            <Label htmlFor="fetch-specs-url">رابط الصفحة</Label>
            <Input
              id="fetch-specs-url"
              type="url"
              placeholder="https://..."
              value={fetchUrl}
              onChange={(e) => setFetchUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFetchFromUrl()}
              disabled={fetchLoading}
              className="font-mono text-sm"
            />
            {categoryHint && (
              <p className="text-xs text-text-muted">
                الفئة الحالية: {categoryHint} — ستُستخدم لتحسين الاستخراج
              </p>
            )}
            {fetchError && (
              <p className="text-sm text-red-600" role="alert">
                {fetchError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFetchDialogOpen(false)}
              disabled={fetchLoading}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleFetchFromUrl}
              disabled={fetchLoading}
            >
              {fetchLoading ? (
                <>
                  <Loader2 className="h-4 w-4 ml-1.5 animate-spin" />
                  جاري الجلب...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 ml-1.5" />
                  جلب المواصفات
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {viewMode === 'edit' && (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <h4 className="text-sm font-semibold text-text-heading mb-3">Hero Highlights (optional)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((idx) => {
                  const h = (state.highlights ?? [])[idx] ?? { icon: 'star', label: '', value: '', sublabel: '' }
                  return (
                    <div key={idx} className="space-y-2">
                      <Input
                        placeholder="Icon (e.g. camera)"
                        value={h.icon}
                        onChange={(e) => {
                          const list = [...(state.highlights ?? [])]
                          while (list.length <= idx) list.push({ icon: 'star', label: '', value: '' })
                          list[idx] = { ...list[idx], icon: e.target.value }
                          updateHighlights(list)
                        }}
                      />
                      <Input
                        placeholder="Label"
                        value={h.label}
                        onChange={(e) => {
                          const list = [...(state.highlights ?? [])]
                          while (list.length <= idx) list.push({ icon: 'star', label: '', value: '' })
                          list[idx] = { ...list[idx], label: e.target.value }
                          updateHighlights(list)
                        }}
                      />
                      <Input
                        placeholder="Value"
                        value={h.value}
                        onChange={(e) => {
                          const list = [...(state.highlights ?? [])]
                          while (list.length <= idx) list.push({ icon: 'star', label: '', value: '' })
                          list[idx] = { ...list[idx], value: e.target.value }
                          updateHighlights(list)
                        }}
                      />
                      <Input
                        placeholder="Sublabel"
                        value={h.sublabel ?? ''}
                        onChange={(e) => {
                          const list = [...(state.highlights ?? [])]
                          while (list.length <= idx) list.push({ icon: 'star', label: '', value: '' })
                          list[idx] = { ...list[idx], sublabel: e.target.value }
                          updateHighlights(list)
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h4 className="text-sm font-semibold text-text-heading mb-3">Quick Spec Pills (optional)</h4>
              <div className="space-y-2">
                {[0, 1, 2, 3, 4, 5].map((idx) => {
                  const q = (state.quickSpecs ?? [])[idx] ?? { icon: 'star', label: '', value: '' }
                  return (
                    <div key={idx} className="flex gap-2">
                      <Input
                        placeholder="Icon"
                        value={q.icon}
                        onChange={(e) => {
                          const list = [...(state.quickSpecs ?? [])]
                          while (list.length <= idx) list.push({ icon: 'star', label: '', value: '' })
                          list[idx] = { ...list[idx], icon: e.target.value }
                          updateQuickSpecs(list)
                        }}
                        className="w-24"
                      />
                      <Input
                        placeholder="Label"
                        value={q.label}
                        onChange={(e) => {
                          const list = [...(state.quickSpecs ?? [])]
                          while (list.length <= idx) list.push({ icon: 'star', label: '', value: '' })
                          list[idx] = { ...list[idx], label: e.target.value }
                          updateQuickSpecs(list)
                        }}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Value"
                        value={q.value}
                        onChange={(e) => {
                          const list = [...(state.quickSpecs ?? [])]
                          while (list.length <= idx) list.push({ icon: 'star', label: '', value: '' })
                          list[idx] = { ...list[idx], value: e.target.value }
                          updateQuickSpecs(list)
                        }}
                        className="flex-1"
                      />
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-text-heading">Groups</h4>
            {state.groups.map((group, idx) => (
              <GroupEditor
                key={`${group.label}-${idx}`}
                group={group}
                onChange={(updated) => {
                  const next = [...state.groups]
                  next[idx] = updated
                  syncChange({ ...state, groups: next })
                }}
                onDelete={() =>
                  syncChange({
                    ...state,
                    groups: state.groups.filter((_, i) => i !== idx)
                  })
                }
                onMoveUp={() => moveGroup(idx, 'up')}
                onMoveDown={() => moveGroup(idx, 'down')}
                canMoveUp={idx > 0}
                canMoveDown={idx < state.groups.length - 1}
              />
            ))}
            <Button
              type="button"
              variant="outline"
              className="w-full border-2 border-dashed"
              onClick={addGroup}
            >
              <Plus className="h-5 w-5 ml-2" />
              Add Group
            </Button>
          </div>
        </div>
      )}

      {viewMode === 'preview' && (
        <div className="rounded-2xl border border-border-light/60 bg-white p-6">
          <SpecificationsDisplay
            specifications={state}
            locale="ar"
            showQuickSpecPills={true}
          />
        </div>
      )}

      {viewMode === 'json' && (
        <div className="relative">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="absolute top-3 right-3"
            onClick={copyJson}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 ml-1.5 text-emerald-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 ml-1.5" />
                Copy
              </>
            )}
          </Button>
          <pre className="p-4 bg-neutral-900 text-emerald-400 rounded-xl text-xs overflow-x-auto min-h-[200px]">
            {JSON.stringify(state, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

export default SpecificationsEditor
