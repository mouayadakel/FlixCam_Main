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
  Loader2,
  FileText,
  LayoutTemplate,
} from 'lucide-react'
import DOMPurify from 'dompurify'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  SpecGroup,
  SpecHighlight,
  SpecItem,
  QuickSpec,
  StructuredSpecifications,
  IconName,
} from '@/lib/types/specifications.types'
import { isStructuredSpecifications } from '@/lib/types/specifications.types'
import {
  convertFlatToStructured,
  categoryTemplates,
  hasCorruptedValues,
  repairSpecifications,
} from '@/lib/utils/specifications.utils'
import { SpecificationsDisplay } from '@/components/features/equipment/specifications-display'

const ICON_OPTIONS = [
  { value: 'star', label: 'Star / Featured' },
  { value: 'zap', label: 'Power / Battery' },
  { value: 'hard-drive', label: 'Storage / Media' },
  { value: 'wifi', label: 'Wireless / Network' },
  { value: 'ruler', label: 'Physical / Specs' },
  { value: 'cable', label: 'I/O / Connectors' },
  { value: 'monitor', label: 'Display / Screen' },
  { value: 'camera', label: 'Camera / Still' },
  { value: 'video', label: 'Video / Cinema' },
  { value: 'aperture', label: 'Lenses / Optics' },
  { value: 'scale', label: 'Weight / Payload' },
  { value: 'layers', label: 'Sensor / Format' },
  { value: 'move', label: 'Mount / Grip' },
  { value: 'thermometer', label: 'Color Temp' },
  { value: 'sun', label: 'Lighting / CRI' },
  { value: 'gauge', label: 'Performance' },
  { value: 'info', label: 'General Info' },
]

const DEFAULT_STRUCTURED: StructuredSpecifications = {
  groups: [{ label: 'Specifications', labelAr: 'المواصفات', icon: 'star', priority: 1, specs: [] }],
}

function createSpecKeyFromLabel(label: string, fallback = 'spec_item'): string {
  const normalized = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return normalized || fallback
}

function escapeHtml(s: string): string {
  const m: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
  return String(s).replace(/[&<>"']/g, (c) => m[c] ?? c)
}

export interface SpecificationsEditorProps {
  value?: Record<string, unknown> | StructuredSpecifications
  onChange: (value: StructuredSpecifications) => void
  label?: string
  className?: string
  categoryHint?: string
  /** Optional: fetch AI-inferred specs and merge into editor (e.g. from /api/admin/equipment/ai-suggest) */
  onAiInfer?: () => Promise<Record<string, unknown> | null>
}

function normalizeValue(
  value: Record<string, unknown> | StructuredSpecifications | undefined,
  categoryHint?: string
): StructuredSpecifications {
  if (!value || typeof value !== 'object') return DEFAULT_STRUCTURED
  if (isStructuredSpecifications(value)) {
    // Auto-repair any corrupted values silently on load
    if (hasCorruptedValues(value)) {
      return repairSpecifications(value)
    }
    return value
  }
  return convertFlatToStructured(value as Record<string, unknown>, categoryHint)
}

function SpecItemEditor({
  spec,
  onChange,
  onDelete,
  duplicateKey,
}: {
  spec: SpecItem
  onChange: (s: SpecItem) => void
  onDelete: () => void
  duplicateKey: boolean
}) {
  return (
    <div className="group relative space-y-3 rounded-lg border border-border-light bg-white p-4 transition-all hover:border-brand-primary/30 hover:shadow-sm">
      <div className="absolute start-2 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
        <GripVertical className="h-4 w-4 text-text-muted" />
      </div>
      <div className="space-y-3 ps-6">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-medium text-text-muted">المفتاح *</Label>
            <Input
              value={spec.key}
              onChange={(e) => onChange({ ...spec, key: e.target.value })}
              placeholder="مثال: sensor"
              className="mt-1"
            />
            {duplicateKey && (
              <p className="mt-1 text-xs text-red-600">هذا المفتاح مكرر في مجموعة أخرى.</p>
            )}
          </div>
          <div>
            <Label className="text-xs font-medium text-text-muted">التسمية (EN) *</Label>
            <Input
              value={spec.label}
              onChange={(e) => onChange({ ...spec, label: e.target.value })}
              onBlur={() => {
                if (!spec.key.trim() && spec.label.trim()) {
                  onChange({ ...spec, key: createSpecKeyFromLabel(spec.label) })
                }
              }}
              placeholder="مثال: Sensor"
              className="mt-1"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-medium text-text-muted">القيمة *</Label>
            <Input
              value={spec.value}
              onChange={(e) => onChange({ ...spec, value: e.target.value })}
              placeholder="مثال: 12.1MP Full-Frame"
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
            <Label className="text-xs font-medium text-text-muted">النوع</Label>
            <select
              value={spec.type ?? 'text'}
              onChange={(e) => onChange({ ...spec, type: e.target.value as SpecItem['type'] })}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              aria-label="Specification type"
            >
              <option value="text">نص</option>
              <option value="boolean">نعم / لا</option>
              <option value="range">شريط نطاق</option>
              <option value="colorTemp">حرارة لون</option>
            </select>
          </div>
          {spec.type === 'range' && (
            <div>
              <Label className="text-xs font-medium text-text-muted">النطاق %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={spec.rangePercent ?? 70}
                onChange={(e) => onChange({ ...spec, rangePercent: parseInt(e.target.value, 10) })}
                className="mt-1"
              />
            </div>
          )}
          <div className="flex items-end gap-2">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={spec.highlight ?? false}
                onChange={(e) => onChange({ ...spec, highlight: e.target.checked })}
                className="rounded border-border-light text-brand-primary focus:ring-brand-primary/20"
              />
              <span className="text-xs font-medium text-text-muted">مميز</span>
            </label>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="absolute end-3 top-3 rounded-lg p-1.5 text-red-500 opacity-0 transition-all hover:bg-red-50 group-hover:opacity-100"
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
  canMoveDown,
  duplicateKeys,
}: {
  group: SpecGroup
  onChange: (g: SpecGroup) => void
  onDelete: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  canMoveUp: boolean
  canMoveDown: boolean
  duplicateKeys: Set<string>
}) {
  const [expanded, setExpanded] = useState(true)

  const addSpec = () => {
    onChange({
      ...group,
      specs: [...group.specs, { key: '', label: '', value: '', type: 'text' }],
    })
  }

  return (
    <div className="overflow-hidden rounded-xl border-2 border-border-light bg-surface-light/30">
      <div className="flex items-center gap-3 border-b border-border-light bg-white p-4">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="rounded p-1 transition-colors hover:bg-surface-light"
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
          onChange={(e) => onChange({ ...group, icon: e.target.value as any })}
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
          placeholder="اسم المجموعة (EN)"
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
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-8 w-8 text-red-500 hover:bg-red-50"
          aria-label="Delete group"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {expanded && (
        <div className="space-y-3 p-4">
          {group.specs.map((spec, idx) => (
            <SpecItemEditor
              key={`${spec.key}-${idx}`}
              spec={spec}
              duplicateKey={duplicateKeys.has(spec.key.trim().toLowerCase())}
              onChange={(updated) => {
                const next = [...group.specs]
                next[idx] = updated
                onChange({ ...group, specs: next })
              }}
              onDelete={() =>
                onChange({
                  ...group,
                  specs: group.specs.filter((_, i) => i !== idx),
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
            <Plus className="me-2 h-4 w-4" />
            إضافة مواصفة
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
  categoryHint,
  onAiInfer,
}: SpecificationsEditorProps) {
  const normalized = useMemo(() => normalizeValue(value, categoryHint), [value, categoryHint])
  const [state, setState] = useState<StructuredSpecifications>(normalized)
  const [viewMode, setViewMode] = useState<'htmlEditor' | 'edit' | 'preview' | 'htmlPreview' | 'json'>('edit')
  const [showAdvancedTools, setShowAdvancedTools] = useState(false)
  const [copied, setCopied] = useState(false)
  const [fetchDialogOpen, setFetchDialogOpen] = useState(false)
  const [fetchUrl, setFetchUrl] = useState('')
  const [fetchLoading, setFetchLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [aiInferLoading, setAiInferLoading] = useState(false)

  const lastSyncedFlatRef = useRef<Record<string, unknown> | null>(null)
  useEffect(() => {
    const next = normalizeValue(value, categoryHint)
    setState(next)
    if (
      !isStructuredSpecifications(value) &&
      value &&
      typeof value === 'object' &&
      Object.keys(value).length > 0
    ) {
      if (lastSyncedFlatRef.current !== value) {
        lastSyncedFlatRef.current = value as Record<string, unknown>
        onChange(next)
      }
    } else {
      lastSyncedFlatRef.current = null
    }
    // Intentionally omit onChange to avoid re-sync when parent callback identity changes
     
  }, [value, categoryHint])

  useEffect(() => {
    if (!showAdvancedTools && ['htmlEditor', 'htmlPreview', 'json'].includes(viewMode)) {
      setViewMode('edit')
    }
  }, [showAdvancedTools, viewMode])

  const syncChange = (next: StructuredSpecifications) => {
    setState(next)
    onChange(next)
  }

  const template = categoryHint ? categoryTemplates[categoryHint.toLowerCase()] : undefined

  const addGroup = () => {
    const newPriority = state.groups.length + 1
    syncChange({
      ...state,
      groups: [...state.groups, { label: '', icon: 'star', priority: newPriority, specs: [] }],
    })
  }

  const loadTemplate = () => {
    if (!template?.groups?.length) return
    syncChange({
      ...state,
      groups: template.groups as SpecGroup[],
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

  const duplicateKeySet = useMemo(() => {
    const counts = new Map<string, number>()
    for (const group of state.groups) {
      for (const spec of group.specs) {
        const key = spec.key.trim().toLowerCase()
        if (!key) continue
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }
    }
    return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key))
  }, [state.groups])

  const totalGroups = state.groups.length
  const totalSpecs = state.groups.reduce((sum, group) => sum + group.specs.length, 0)
  const highlightedCount = state.groups.reduce(
    (sum, group) => sum + group.specs.filter((spec) => spec.highlight).length,
    0
  )

  const isCorrupted = useMemo(() => hasCorruptedValues(state), [state])

  const handleRepair = () => {
    const repaired = repairSpecifications(state)
    syncChange(repaired)
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
      {label && <Label className="text-lg font-bold text-text-heading">{label}</Label>}

      {isCorrupted && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50/50 p-4 text-sm text-red-900 shadow-sm">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-red-600" />
            <p className="font-medium">
              تم اكتشاف رموز غير صالحة ([object Object]) في البيانات. قد يؤدي ذلك لفشل الحفظ.
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleRepair}
            className="shrink-0 font-bold"
          >
            نظف وصحح البيانات الآن
          </Button>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-light/40 pb-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={viewMode === 'edit' ? 'default' : 'secondary'}
            size="sm"
            onClick={() => setViewMode('edit')}
            className="px-6 font-semibold shadow-sm"
          >
            التحرير
          </Button>
          <Button
            type="button"
            variant={viewMode === 'preview' ? 'default' : 'secondary'}
            size="sm"
            onClick={() => setViewMode('preview')}
            className="px-6 transition-all"
          >
            <Eye className="ms-1.5 h-4 w-4" />
            معاينة
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvancedTools((prev) => !prev)}
            className="text-text-muted hover:text-brand-primary"
          >
            {showAdvancedTools ? 'إخفاء الخيارات' : 'خيارات إتقدمة'}
          </Button>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium text-text-muted">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brand-primary/40"></span>
            {totalSpecs} مواصفة
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400/40"></span>
            {highlightedCount} مميزة
          </div>
        </div>
      </div>

      {showAdvancedTools && (
        <>
          <div className="space-y-3 rounded-lg border border-dashed border-border-light bg-surface-light/30 p-3">
            <p className="text-xs text-text-muted">خيارات إضافية للمستخدم المتقدم (JSON/HTML/استيراد).</p>
            <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={viewMode === 'htmlPreview' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('htmlPreview')}
              title="معاينة HTML"
            >
              <LayoutTemplate className="ms-1.5 h-4 w-4" />
              معاينة HTML
            </Button>
            <Button
              type="button"
              variant={viewMode === 'json' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('json')}
            >
              <Code className="ms-1.5 h-4 w-4" />
              JSON
            </Button>
            <Button
              type="button"
              variant={viewMode === 'htmlEditor' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('htmlEditor')}
              title="محرر HTML / نصوص"
            >
              <FileText className="ms-1.5 h-4 w-4" />
              محرر HTML / نصوص
            </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
          {template && (
            <Button
              type="button"
              size="sm"
              onClick={loadTemplate}
              className="bg-brand-primary hover:bg-brand-primary/90"
            >
              <Sparkles className="ms-1.5 h-4 w-4" />
              تحميل قالب {categoryHint}
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
            <Link2 className="ms-1.5 h-4 w-4" />
            جلب المواصفات من رابط
          </Button>
          {onAiInfer && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={aiInferLoading}
              onClick={async () => {
                setAiInferLoading(true)
                try {
                  const flat = await onAiInfer()
                  if (flat && Object.keys(flat).length > 0) {
                    const inferred = convertFlatToStructured(flat, categoryHint)
                    const mergedGroups = state.groups.map((g) => ({
                      ...g,
                      specs: [...g.specs],
                    }))
                    const existingKeys = new Set(
                      mergedGroups.flatMap((g) => g.specs.map((s) => s.key))
                    )
                    for (const aiGroup of inferred.groups) {
                      const targetGroup =
                        mergedGroups.find(
                          (g) =>
                            g.label.toLowerCase() === aiGroup.label.toLowerCase() ||
                            (!!g.labelAr && !!aiGroup.labelAr && g.labelAr === aiGroup.labelAr)
                        ) ?? mergedGroups[0]
                      if (!targetGroup) continue

                      for (const spec of aiGroup.specs) {
                        if (!existingKeys.has(spec.key)) {
                          targetGroup.specs.push(spec)
                          existingKeys.add(spec.key)
                        }
                      }
                    }
                    if (mergedGroups.length > 0) {
                      syncChange({ ...state, groups: mergedGroups })
                    } else {
                      syncChange({ ...state, ...inferred })
                    }
                  }
                } finally {
                  setAiInferLoading(false)
                }
              }}
            >
              {aiInferLoading ? (
                <Loader2 className="ms-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="ms-1.5 h-4 w-4" />
              )}
              استنتاج بالذكاء الاصطناعي
            </Button>
          )}
          </div>
        </>
      )}

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
            <Button type="button" onClick={handleFetchFromUrl} disabled={fetchLoading}>
              {fetchLoading ? (
                <>
                  <Loader2 className="ms-1.5 h-4 w-4 animate-spin" />
                  جاري الجلب...
                </>
              ) : (
                <>
                  <Link2 className="ms-1.5 h-4 w-4" />
                  جلب المواصفات
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {viewMode === 'htmlEditor' && (
        <Card>
          <CardContent className="pt-6">
            <Label className="mb-2 block text-sm font-semibold text-text-heading">
              محرر HTML / نصوص — مقطع مواصفات مخصص
            </Label>
            <p className="mb-3 text-xs text-muted-foreground">
              اكتب أو الصق HTML أو نصاً غنياً. سيُحفظ مع المواصفات ويُعرض في معاينة HTML.
            </p>
            <Textarea
              value={state.customHtml ?? ''}
              onChange={(e) => syncChange({ ...state, customHtml: e.target.value })}
              placeholder="<p>مثال: جدول أو قائمة مواصفات مخصصة...</p>"
              rows={14}
              className="font-mono text-sm"
              dir="rtl"
            />
          </CardContent>
        </Card>
      )}

      {viewMode === 'edit' && (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-bold text-text-heading">
                    <Sparkles className="h-4 w-4 text-brand-primary" />
                    النقاط الرئيسية (Tier 1: High-Level Highlights)
                  </h4>
                  <p className="text-xs text-text-muted">
                    أهم مميزات المعدة التي تظهر في بطاقة المنتج العلوية.
                  </p>
                </div>
                <div className="rounded-full bg-brand-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-primary">
                  Professional
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[0, 1, 2, 3].map((idx) => {
                  const h = (state.highlights ?? [])[idx] ?? {
                    icon: 'star',
                    label: '',
                    value: '',
                    sublabel: '',
                  }
                  return (
                    <div key={idx} className="space-y-2">
                      <select
                        value={h.icon}
                        onChange={(e) => {
                          const list = [...(state.highlights ?? [])]
                          list[idx] = { ...list[idx], icon: e.target.value as IconName }
                          updateHighlights(list)
                        }}
                        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                      >
                        {ICON_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <Input
                        placeholder="Label"
                        value={h.label}
                        onChange={(e) => {
                          const list = [...(state.highlights ?? [])]
                          while (list.length <= idx)
                            list.push({ icon: 'star', label: '', value: '' })
                          list[idx] = { ...list[idx], label: e.target.value }
                          updateHighlights(list)
                        }}
                      />
                      <Input
                        placeholder="Value"
                        value={h.value}
                        onChange={(e) => {
                          const list = [...(state.highlights ?? [])]
                          while (list.length <= idx)
                            list.push({ icon: 'star', label: '', value: '' })
                          list[idx] = { ...list[idx], value: e.target.value }
                          updateHighlights(list)
                        }}
                      />
                      <Input
                        placeholder="Sublabel"
                        value={h.sublabel ?? ''}
                        onChange={(e) => {
                          const list = [...(state.highlights ?? [])]
                          while (list.length <= idx)
                            list.push({ icon: 'star', label: '', value: '' })
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
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-bold text-text-heading">
                    <Zap className="h-4 w-4 text-amber-500" />
                    المواصفات السريعة (Tier 2: Quick Specs)
                  </h4>
                  <p className="text-xs text-text-muted">
                    تظهر كـ Pills سريعة أعلى تفاصيل المنتج. مثالية للقيم الفنية المختصرة.
                  </p>
                </div>
                <div className="rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-500">
                  Quick View
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {[0, 1, 2, 3, 4, 5].map((idx) => {
                  const q = (state.quickSpecs ?? [])[idx] ?? { icon: 'star', label: '', value: '' }
                  return (
                    <div key={idx} className="flex gap-2">
                      <select
                        value={q.icon}
                        onChange={(e) => {
                          const list = [...(state.quickSpecs ?? [])]
                          while (list.length <= idx)
                            list.push({ icon: 'star', label: '', value: '' })
                          list[idx] = { ...list[idx], icon: e.target.value as IconName }
                          updateQuickSpecs(list)
                        }}
                        className="w-24 rounded-md border border-input bg-background px-1 py-1 text-xs"
                      >
                        {ICON_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <Input
                        placeholder="Label"
                        value={q.label}
                        onChange={(e) => {
                          const list = [...(state.quickSpecs ?? [])]
                          while (list.length <= idx)
                            list.push({ icon: 'star', label: '', value: '' })
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
                          while (list.length <= idx)
                            list.push({ icon: 'star', label: '', value: '' })
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
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-text-heading">مجموعات المواصفات</h4>
              {duplicateKeySet.size > 0 && (
                <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                  مفاتيح مكررة: {duplicateKeySet.size}
                </span>
              )}
            </div>
            {state.groups.map((group, idx) => (
              <GroupEditor
                key={`${group.label}-${idx}`}
                group={group}
                duplicateKeys={duplicateKeySet}
                onChange={(updated) => {
                  const next = [...state.groups]
                  next[idx] = updated
                  syncChange({ ...state, groups: next })
                }}
                onDelete={() =>
                  syncChange({
                    ...state,
                    groups: state.groups.filter((_, i) => i !== idx),
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
              <Plus className="ms-2 h-5 w-5" />
              إضافة مجموعة
            </Button>
          </div>
        </div>
      )}

      {viewMode === 'preview' && (
        <div className="rounded-2xl border border-border-light/60 bg-white p-6">
          <SpecificationsDisplay specifications={state} locale="ar" showQuickSpecPills={true} />
        </div>
      )}

      {viewMode === 'htmlPreview' && (
        <Card>
          <CardContent className="pt-6">
            <h4 className="mb-3 text-sm font-semibold text-text-heading">معاينة HTML</h4>
            <div
              className="min-h-[200px] rounded-xl border border-border-light bg-white p-4 [&_table]:w-full [&_th]:border [&_th]:bg-muted [&_th]:p-2 [&_td]:border [&_td]:p-2 [&_ul]:list-disc [&_ul]:ps-6 [&_ol]:list-decimal [&_ol]:ps-6"
              dir="rtl"
              dangerouslySetInnerHTML={{
                __html: (() => {
                  const raw = state.customHtml?.trim()
                  if (raw) {
                    return DOMPurify.sanitize(raw, {
                      ALLOWED_TAGS: [
                        'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li',
                        'table', 'thead', 'tbody', 'tr', 'th', 'td', 'h1', 'h2', 'h3', 'h4',
                        'a', 'span', 'div', 'hr',
                      ],
                      ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
                    })
                  }
                  const parts: string[] = []
                  if (state.highlights?.length) {
                    parts.push('<div class="mb-4"><h3>أبرز المواصفات</h3><ul>')
                    state.highlights.forEach((h) => {
                      parts.push(`<li><strong>${escapeHtml(h.label)}</strong>: ${escapeHtml(h.value)}</li>`)
                    })
                    parts.push('</ul></div>')
                  }
                  state.groups.forEach((g) => {
                    parts.push(`<div class="mb-4"><h3>${escapeHtml(g.labelAr || g.label)}</h3><table><thead><tr><th>المواصفة</th><th>القيمة</th></tr></thead><tbody>`)
                    g.specs.forEach((s) => {
                      parts.push(`<tr><td>${escapeHtml(s.labelAr || s.label || s.key)}</td><td>${escapeHtml(s.value)}</td></tr>`)
                    })
                    parts.push('</tbody></table></div>')
                  })
                  return parts.length ? parts.join('') : '<p class="text-muted-foreground">لا يوجد محتوى. أضف مواصفات في تبويب Edit أو HTML مخصص في محرر HTML / نصوص.</p>'
                })(),
              }}
            />
          </CardContent>
        </Card>
      )}

      {viewMode === 'json' && (
        <div className="relative">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="absolute end-3 top-3"
            onClick={copyJson}
          >
            {copied ? (
              <>
                <Check className="ms-1.5 h-4 w-4 text-emerald-500" />
                تم النسخ
              </>
            ) : (
              <>
                <Copy className="ms-1.5 h-4 w-4" />
                نسخ
              </>
            )}
          </Button>
          <pre className="min-h-[200px] overflow-x-auto rounded-xl bg-neutral-900 p-4 text-xs text-emerald-400">
            {JSON.stringify(state, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

export default SpecificationsEditor
