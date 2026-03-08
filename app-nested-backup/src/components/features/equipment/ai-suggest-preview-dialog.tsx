/**
 * @file ai-suggest-preview-dialog.tsx
 * @description Dialog to preview and apply AI-suggested content for equipment (specs, descriptions, SEO, box, related).
 * @module components/features/equipment
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
  Star,
  Zap,
  HardDrive,
  Wifi,
  Ruler,
  Cable,
  Monitor,
  Camera,
  Sun,
  Gauge,
  Info,
  Pencil,
  Trash2,
  Code,
  LayoutGrid,
  Search,
  Languages,
} from 'lucide-react'
import { useLocale } from '@/hooks/use-locale'
import { t as tForLocale } from '@/lib/i18n/translate'
import { LOCALES, LOCALE_LABELS, type Locale } from '@/lib/i18n/locales'

export interface TranslationLocaleData {
  name: string
  shortDescription: string
  longDescription: string
  seoTitle: string
  seoDescription: string
  seoKeywords: string
}

export type AISuggestPayload = {
  specs: Record<string, unknown>
  shortDescription: string
  longDescription: string
  seo: { metaTitle: string; metaDescription: string; metaKeywords: string }
  boxContents?: string
  tags?: string
  relatedEquipmentIds?: string[]
  confidence?: Record<string, number>
  translations?: Record<'ar' | 'en' | 'zh', TranslationLocaleData>
}

function ConfidenceBadge({
  value,
  labels,
}: {
  value: number | undefined
  labels?: { high: string; med: string; low: string }
}) {
  if (value == null) return null
  const cls =
    value >= 90
      ? 'bg-green-100 text-green-800 border-green-300'
      : value >= 70
        ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
        : 'bg-orange-100 text-orange-800 border-orange-300'
  const label = value >= 90 ? (labels?.high ?? 'High') : value >= 70 ? (labels?.med ?? 'Med') : (labels?.low ?? 'Low')
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${cls}`}
    >
      {value}% {label}
    </span>
  )
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  star: Star,
  zap: Zap,
  'hard-drive': HardDrive,
  wifi: Wifi,
  ruler: Ruler,
  cable: Cable,
  monitor: Monitor,
  camera: Camera,
  sun: Sun,
  gauge: Gauge,
  info: Info,
}

function SpecIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] ?? Star
  return <Icon className={className} />
}

/** Reserved top-level keys that are structure, not flat spec entries. Never show as a spec row. */
const SPEC_STRUCTURAL_KEYS = new Set(['groups', 'highlights', 'quickSpecs', 'mode', 'html'])

/** Coerce a spec value to a display string. Avoids "[object Object]" for objects/arrays. */
function specValueToDisplayString(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value))
    return value.length === 0 ? '' : value.map((v) => specValueToDisplayString(v)).join(', ')
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 200)
  return String(value)
}

/** Group specs by smart categories for display */
function groupSpecsByCategory(specs: Record<string, unknown>): Array<{
  label: string
  icon: string
  entries: Array<{ key: string; label: string; value: string }>
}> {
  const entries = Object.entries(specs).filter(([key, v]) => {
    if (SPEC_STRUCTURAL_KEYS.has(key)) return false
    if (v == null) return false
    const display = specValueToDisplayString(v)
    return display.trim() !== '' && display.trim() !== 'unknown' && display !== '[object Object]'
  })

  if (entries.length === 0) return []

  const groups: Record<
    string,
    { label: string; icon: string; entries: Array<{ key: string; label: string; value: string }> }
  > = {}

  const categoryMapping: Record<string, { group: string; icon: string }> = {
    // Sensor & Image
    sensor: { group: 'Sensor & Image', icon: 'camera' },
    resolution: { group: 'Sensor & Image', icon: 'camera' },
    pixel: { group: 'Sensor & Image', icon: 'camera' },
    iso: { group: 'Sensor & Image', icon: 'camera' },
    dynamic_range: { group: 'Sensor & Image', icon: 'camera' },
    bit_depth: { group: 'Sensor & Image', icon: 'camera' },
    color_s: { group: 'Sensor & Image', icon: 'camera' },
    aspect: { group: 'Sensor & Image', icon: 'camera' },
    // Video
    video: { group: 'Video Performance', icon: 'monitor' },
    framerate: { group: 'Video Performance', icon: 'monitor' },
    codec: { group: 'Video Performance', icon: 'monitor' },
    raw: { group: 'Video Performance', icon: 'monitor' },
    log: { group: 'Video Performance', icon: 'monitor' },
    hdr: { group: 'Video Performance', icon: 'monitor' },
    slow_motion: { group: 'Video Performance', icon: 'monitor' },
    rolling: { group: 'Video Performance', icon: 'monitor' },
    // Autofocus & Stabilization
    autofocus: { group: 'Autofocus & Stabilization', icon: 'camera' },
    af_: { group: 'Autofocus & Stabilization', icon: 'camera' },
    face_eye: { group: 'Autofocus & Stabilization', icon: 'camera' },
    ibis: { group: 'Autofocus & Stabilization', icon: 'camera' },
    stabiliz: { group: 'Autofocus & Stabilization', icon: 'camera' },
    // Lens & Optics
    focal: { group: 'Lens & Optics', icon: 'camera' },
    aperture: { group: 'Lens & Optics', icon: 'camera' },
    mount: { group: 'Lens & Optics', icon: 'camera' },
    flange: { group: 'Lens & Optics', icon: 'camera' },
    nd: { group: 'Lens & Optics', icon: 'camera' },
    image_circle: { group: 'Lens & Optics', icon: 'camera' },
    lens: { group: 'Lens & Optics', icon: 'camera' },
    blade: { group: 'Lens & Optics', icon: 'camera' },
    iris: { group: 'Lens & Optics', icon: 'camera' },
    focus: { group: 'Lens & Optics', icon: 'camera' },
    coating: { group: 'Lens & Optics', icon: 'camera' },
    filter: { group: 'Lens & Optics', icon: 'camera' },
    zoom: { group: 'Lens & Optics', icon: 'camera' },
    // Connectivity
    sdi: { group: 'Connectivity & I/O', icon: 'cable' },
    hdmi: { group: 'Connectivity & I/O', icon: 'cable' },
    usb: { group: 'Connectivity & I/O', icon: 'cable' },
    ethernet: { group: 'Connectivity & I/O', icon: 'cable' },
    wifi: { group: 'Connectivity & I/O', icon: 'wifi' },
    bluetooth: { group: 'Connectivity & I/O', icon: 'wifi' },
    wireless: { group: 'Connectivity & I/O', icon: 'wifi' },
    timecode: { group: 'Connectivity & I/O', icon: 'cable' },
    genlock: { group: 'Connectivity & I/O', icon: 'cable' },
    audio_input: { group: 'Connectivity & I/O', icon: 'cable' },
    headphone: { group: 'Connectivity & I/O', icon: 'cable' },
    speaker: { group: 'Connectivity & I/O', icon: 'cable' },
    remote: { group: 'Connectivity & I/O', icon: 'wifi' },
    dmx: { group: 'Connectivity & I/O', icon: 'cable' },
    art_net: { group: 'Connectivity & I/O', icon: 'cable' },
    connector: { group: 'Connectivity & I/O', icon: 'cable' },
    output: { group: 'Connectivity & I/O', icon: 'cable' },
    input: { group: 'Connectivity & I/O', icon: 'cable' },
    antenna: { group: 'Connectivity & I/O', icon: 'wifi' },
    // Display
    lcd: { group: 'Display & Viewfinder', icon: 'monitor' },
    evf: { group: 'Display & Viewfinder', icon: 'monitor' },
    screen: { group: 'Display & Viewfinder', icon: 'monitor' },
    display: { group: 'Display & Viewfinder', icon: 'monitor' },
    touch: { group: 'Display & Viewfinder', icon: 'monitor' },
    panel: { group: 'Display & Viewfinder', icon: 'monitor' },
    brightness: { group: 'Display & Viewfinder', icon: 'monitor' },
    contrast: { group: 'Display & Viewfinder', icon: 'monitor' },
    viewing_angle: { group: 'Display & Viewfinder', icon: 'monitor' },
    lut: { group: 'Display & Viewfinder', icon: 'monitor' },
    waveform: { group: 'Display & Viewfinder', icon: 'monitor' },
    vectorscope: { group: 'Display & Viewfinder', icon: 'monitor' },
    histogram: { group: 'Display & Viewfinder', icon: 'monitor' },
    false_color: { group: 'Display & Viewfinder', icon: 'monitor' },
    zebra: { group: 'Display & Viewfinder', icon: 'monitor' },
    focus_peaking: { group: 'Display & Viewfinder', icon: 'monitor' },
    // Lighting Specific
    cri: { group: 'Light Quality', icon: 'sun' },
    tlci: { group: 'Light Quality', icon: 'sun' },
    cqs: { group: 'Light Quality', icon: 'sun' },
    ssi: { group: 'Light Quality', icon: 'sun' },
    color_temp: { group: 'Light Quality', icon: 'sun' },
    color_accuracy: { group: 'Light Quality', icon: 'sun' },
    green_magenta: { group: 'Light Quality', icon: 'sun' },
    gel: { group: 'Light Quality', icon: 'sun' },
    rgb: { group: 'Light Quality', icon: 'sun' },
    hsi: { group: 'Light Quality', icon: 'sun' },
    beam: { group: 'Light Quality', icon: 'sun' },
    lux: { group: 'Light Quality', icon: 'sun' },
    lumen: { group: 'Light Quality', icon: 'sun' },
    dimming: { group: 'Light Quality', icon: 'sun' },
    flicker: { group: 'Light Quality', icon: 'sun' },
    strobe: { group: 'Light Quality', icon: 'sun' },
    fresnel: { group: 'Light Quality', icon: 'sun' },
    barn_door: { group: 'Light Quality', icon: 'sun' },
    bowens: { group: 'Light Quality', icon: 'sun' },
    diffusion: { group: 'Light Quality', icon: 'sun' },
    photometric: { group: 'Light Quality', icon: 'sun' },
    // Audio Specific
    polar: { group: 'Audio Performance', icon: 'gauge' },
    frequency: { group: 'Audio Performance', icon: 'gauge' },
    sensitivity: { group: 'Audio Performance', icon: 'gauge' },
    impedance: { group: 'Audio Performance', icon: 'gauge' },
    spl: { group: 'Audio Performance', icon: 'gauge' },
    noise: { group: 'Audio Performance', icon: 'gauge' },
    signal: { group: 'Audio Performance', icon: 'gauge' },
    thd: { group: 'Audio Performance', icon: 'gauge' },
    phantom: { group: 'Audio Performance', icon: 'gauge' },
    capsule: { group: 'Audio Performance', icon: 'gauge' },
    transducer: { group: 'Audio Performance', icon: 'gauge' },
    preamp: { group: 'Audio Performance', icon: 'gauge' },
    latency: { group: 'Audio Performance', icon: 'gauge' },
    channel: { group: 'Audio Performance', icon: 'gauge' },
    sample_rate: { group: 'Audio Performance', icon: 'gauge' },
    recording: { group: 'Audio Performance', icon: 'gauge' },
    // Storage & Media
    media: { group: 'Storage & Media', icon: 'hard-drive' },
    card: { group: 'Storage & Media', icon: 'hard-drive' },
    storage: { group: 'Storage & Media', icon: 'hard-drive' },
    // Power & Battery
    battery: { group: 'Power & Battery', icon: 'zap' },
    power: { group: 'Power & Battery', icon: 'zap' },
    charging: { group: 'Power & Battery', icon: 'zap' },
    charge: { group: 'Power & Battery', icon: 'zap' },
    voltage: { group: 'Power & Battery', icon: 'zap' },
    capacity: { group: 'Power & Battery', icon: 'zap' },
    watt: { group: 'Power & Battery', icon: 'zap' },
    dc_input: { group: 'Power & Battery', icon: 'zap' },
    ac_input: { group: 'Power & Battery', icon: 'zap' },
    v_mount: { group: 'Power & Battery', icon: 'zap' },
    gold_mount: { group: 'Power & Battery', icon: 'zap' },
    d_tap: { group: 'Power & Battery', icon: 'zap' },
    // Physical
    weight: { group: 'Physical & Build', icon: 'ruler' },
    dimension: { group: 'Physical & Build', icon: 'ruler' },
    material: { group: 'Physical & Build', icon: 'ruler' },
    weather: { group: 'Physical & Build', icon: 'ruler' },
    operating_temp: { group: 'Physical & Build', icon: 'ruler' },
    humidity: { group: 'Physical & Build', icon: 'ruler' },
    ip_rating: { group: 'Physical & Build', icon: 'ruler' },
    cooling: { group: 'Physical & Build', icon: 'ruler' },
    certification: { group: 'Physical & Build', icon: 'ruler' },
    body: { group: 'Physical & Build', icon: 'ruler' },
    length: { group: 'Physical & Build', icon: 'ruler' },
    folded: { group: 'Physical & Build', icon: 'ruler' },
    height: { group: 'Physical & Build', icon: 'ruler' },
    // Grip & Support
    load: { group: 'Support & Mounting', icon: 'ruler' },
    head: { group: 'Support & Mounting', icon: 'ruler' },
    leg: { group: 'Support & Mounting', icon: 'ruler' },
    quick_release: { group: 'Support & Mounting', icon: 'ruler' },
    yoke: { group: 'Support & Mounting', icon: 'ruler' },
    clamp: { group: 'Support & Mounting', icon: 'ruler' },
    spreader: { group: 'Support & Mounting', icon: 'ruler' },
    bowl: { group: 'Support & Mounting', icon: 'ruler' },
    pan: { group: 'Support & Mounting', icon: 'ruler' },
    tilt: { group: 'Support & Mounting', icon: 'ruler' },
    gimbal: { group: 'Support & Mounting', icon: 'ruler' },
    axis: { group: 'Support & Mounting', icon: 'ruler' },
    payload: { group: 'Support & Mounting', icon: 'ruler' },
    // Drone
    flight: { group: 'Flight Performance', icon: 'camera' },
    speed: { group: 'Flight Performance', icon: 'camera' },
    wind: { group: 'Flight Performance', icon: 'camera' },
    altitude: { group: 'Flight Performance', icon: 'camera' },
    transmission: { group: 'Flight Performance', icon: 'camera' },
    gps: { group: 'Flight Performance', icon: 'camera' },
    obstacle: { group: 'Flight Performance', icon: 'camera' },
    propeller: { group: 'Flight Performance', icon: 'camera' },
    tracking: { group: 'Flight Performance', icon: 'camera' },
    hyperlapse: { group: 'Flight Performance', icon: 'camera' },
    panorama: { group: 'Flight Performance', icon: 'camera' },
    intelligent: { group: 'Flight Performance', icon: 'camera' },
  }

  for (const [key, value] of entries) {
    const keyLower = key.toLowerCase()
    let assigned = false
    for (const [pattern, config] of Object.entries(categoryMapping)) {
      if (keyLower.includes(pattern)) {
        if (!groups[config.group]) {
          groups[config.group] = { label: config.group, icon: config.icon, entries: [] }
        }
        groups[config.group].entries.push({
          key,
          label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          value: specValueToDisplayString(value),
        })
        assigned = true
        break
      }
    }
    if (!assigned) {
      const generalKey = 'General'
      if (!groups[generalKey]) {
        groups[generalKey] = { label: generalKey, icon: 'info', entries: [] }
      }
      groups[generalKey].entries.push({
        key,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        value: specValueToDisplayString(value),
      })
    }
  }

  return Object.values(groups).filter((g) => g.entries.length > 0)
}

function SpecGroupCard({
  group,
  confidence,
  onEditValue,
  onDeleteSpec,
  confidenceLabels,
}: {
  group: {
    label: string
    icon: string
    entries: Array<{ key: string; label: string; value: string }>
  }
  confidence?: Record<string, number>
  confidenceLabels?: { high: string; med: string; low: string }
  onEditValue: (key: string, value: string) => void
  onDeleteSpec: (key: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-muted/30"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-primary/5">
          <SpecIcon name={group.icon} className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <span className="text-sm font-semibold text-foreground">{group.label}</span>
          <span className="ms-2 text-xs text-muted-foreground">
            {group.entries.length} spec{group.entries.length !== 1 ? 's' : ''}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border/40">
          {group.entries.map((entry, idx) => (
            <div
              key={entry.key}
              className={`group flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-muted/20 ${
                idx < group.entries.length - 1 ? 'border-b border-border/20' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">{entry.label}</span>
                  <ConfidenceBadge value={confidence?.[entry.key]} labels={confidenceLabels} />
                </div>
                {editingKey === entry.key ? (
                  <div className="mt-1 flex items-center gap-2">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="h-7 text-xs"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onEditValue(entry.key, editValue)
                          setEditingKey(null)
                        }
                        if (e.key === 'Escape') setEditingKey(null)
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => {
                        onEditValue(entry.key, editValue)
                        setEditingKey(null)
                      }}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <p className="mt-0.5 text-sm font-medium leading-snug text-foreground">
                    {entry.value}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditingKey(entry.key)
                    setEditValue(entry.value)
                  }}
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title="Edit value"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteSpec(entry.key)}
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500"
                  title="Remove spec"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export interface AISuggestPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loading: boolean
  suggestion: AISuggestPayload | null
  onApply: (payload: AISuggestPayload) => void
}

const AI_SUGGEST_DIALOG_NS = 'equipment.aiSuggestDialog'

export function AISuggestPreviewDialog({
  open,
  onOpenChange,
  loading,
  suggestion,
  onApply,
}: AISuggestPreviewDialogProps) {
  const { locale } = useLocale()
  const [dialogLocale, setDialogLocale] = useState<Locale>(locale)
  const [edited, setEdited] = useState<AISuggestPayload | null>(suggestion)
  const [specsView, setSpecsView] = useState<'grouped' | 'json'>('grouped')
  const [specSearch, setSpecSearch] = useState('')

  useEffect(() => {
    if (open) setDialogLocale(locale)
  }, [open, locale])

  const tDialog = (key: string) => tForLocale(dialogLocale, key)

  const confidenceLabels = {
    high: tDialog(`${AI_SUGGEST_DIALOG_NS}.confidenceHigh`),
    med: tDialog(`${AI_SUGGEST_DIALOG_NS}.confidenceMed`),
    low: tDialog(`${AI_SUGGEST_DIALOG_NS}.confidenceLow`),
  }

  useEffect(() => {
    if (suggestion) setEdited(suggestion)
    else setEdited(null)
  }, [suggestion])

  const current = edited ?? suggestion
  const canApply =
    current &&
    (current.shortDescription?.trim() ||
      current.longDescription?.trim() ||
      Object.keys(current.specs ?? {}).length > 0)

  const specGroups = useMemo(() => {
    if (!current?.specs) return []
    return groupSpecsByCategory(current.specs)
  }, [current?.specs])

  const filteredGroups = useMemo(() => {
    if (!specSearch.trim()) return specGroups
    const q = specSearch.toLowerCase()
    return specGroups
      .map((g) => ({
        ...g,
        entries: g.entries.filter(
          (e) =>
            e.label.toLowerCase().includes(q) ||
            e.value.toLowerCase().includes(q) ||
            e.key.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.entries.length > 0)
  }, [specGroups, specSearch])

  const totalSpecCount = Object.entries(current?.specs ?? {}).filter(([k, v]) => {
    if (SPEC_STRUCTURAL_KEYS.has(k)) return false
    const display = specValueToDisplayString(v)
    return display.trim() !== '' && display.trim() !== 'unknown' && display !== '[object Object]'
  }).length

  const handleApply = () => {
    if (current) {
      onApply(current)
      onOpenChange(false)
    }
  }

  const handleEditSpecValue = (key: string, value: string) => {
    setEdited((prev) => (prev ? { ...prev, specs: { ...prev.specs, [key]: value } } : null))
  }

  const handleDeleteSpec = (key: string) => {
    setEdited((prev) => {
      if (!prev) return null
      const next = { ...prev.specs }
      delete next[key]
      return { ...prev, specs: next }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20">
              <Sparkles className="h-4 w-4 text-violet-600" />
            </div>
            {tDialog(`${AI_SUGGEST_DIALOG_NS}.title`)}
          </DialogTitle>
          <DialogDescription>
            {tDialog(`${AI_SUGGEST_DIALOG_NS}.description`)}
          </DialogDescription>
          <div className="flex flex-wrap items-center gap-1.5 pt-2">
            <Languages className="h-4 w-4 text-muted-foreground" aria-hidden />
            {LOCALES.map((loc) => (
              <Button
                key={loc}
                type="button"
                variant={dialogLocale === loc ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 min-w-[2.5rem] text-xs font-medium"
                onClick={() => setDialogLocale(loc)}
                aria-label={LOCALE_LABELS[loc]}
                aria-pressed={dialogLocale === loc}
              >
                {LOCALE_LABELS[loc]}
              </Button>
            ))}
          </div>
        </DialogHeader>

        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-violet-400/20" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/10 to-purple-500/10">
                <Loader2 className="h-7 w-7 animate-spin text-violet-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {tDialog(`${AI_SUGGEST_DIALOG_NS}.generating`)}
            </p>
            <p className="text-xs text-muted-foreground/70">
              {tDialog(`${AI_SUGGEST_DIALOG_NS}.analyzing`)}
            </p>
          </div>
        )}

        {!loading && current && (
          <Tabs defaultValue="specs" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="specs" className="gap-1.5">
                <Gauge className="h-3.5 w-3.5" />
                {tDialog(`${AI_SUGGEST_DIALOG_NS}.tabSpecs`)}
                {totalSpecCount > 0 && (
                  <Badge variant="secondary" className="ms-1 h-5 px-1.5 text-[10px]">
                    {totalSpecCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="content">{tDialog(`${AI_SUGGEST_DIALOG_NS}.tabContent`)}</TabsTrigger>
              <TabsTrigger value="seo">{tDialog(`${AI_SUGGEST_DIALOG_NS}.tabSeo`)}</TabsTrigger>
              <TabsTrigger value="extra">{tDialog(`${AI_SUGGEST_DIALOG_NS}.tabExtra`)}</TabsTrigger>
            </TabsList>

            <TabsContent value="specs" className="space-y-3 pt-4">
              {/* Specs header with stats & view toggle */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {tDialog(`${AI_SUGGEST_DIALOG_NS}.technicalSpecsCount`).replace(
                        '{count}',
                        String(totalSpecCount)
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tDialog(`${AI_SUGGEST_DIALOG_NS}.categoriesDetected`).replace(
                        '{count}',
                        String(specGroups.length)
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg border bg-muted/30 p-0.5">
                  <button
                    type="button"
                    onClick={() => setSpecsView('grouped')}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      specsView === 'grouped'
                        ? 'bg-white text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <LayoutGrid className="me-1 inline h-3 w-3" />
                    {tDialog(`${AI_SUGGEST_DIALOG_NS}.grouped`)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpecsView('json')}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      specsView === 'json'
                        ? 'bg-white text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Code className="me-1 inline h-3 w-3" />
                    {tDialog(`${AI_SUGGEST_DIALOG_NS}.json`)}
                  </button>
                </div>
              </div>

              {specsView === 'grouped' && (
                <>
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder={tDialog(`${AI_SUGGEST_DIALOG_NS}.searchPlaceholder`)}
                      value={specSearch}
                      onChange={(e) => setSpecSearch(e.target.value)}
                      className="ps-9 text-sm"
                    />
                  </div>

                  {/* Grouped spec cards */}
                  <div className="space-y-3">
                    {filteredGroups.map((group) => (
                      <SpecGroupCard
                        key={group.label}
                        group={group}
                        confidence={current.confidence}
                        confidenceLabels={confidenceLabels}
                        onEditValue={handleEditSpecValue}
                        onDeleteSpec={handleDeleteSpec}
                      />
                    ))}
                    {filteredGroups.length === 0 && (
                      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-8 text-center">
                        <Info className="mb-2 h-8 w-8 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">
                          {specSearch
                            ? tDialog(`${AI_SUGGEST_DIALOG_NS}.noSpecsMatch`)
                            : tDialog(`${AI_SUGGEST_DIALOG_NS}.noSpecsGenerated`)}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {specsView === 'json' && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    {tDialog(`${AI_SUGGEST_DIALOG_NS}.editJsonLabel`)}
                  </Label>
                  <Textarea
                    value={JSON.stringify(current.specs ?? {}, null, 2)}
                    onChange={(e) => {
                      try {
                        const v = e.target.value.trim()
                        const next = v ? (JSON.parse(v) as Record<string, unknown>) : {}
                        setEdited((prev) => (prev ? { ...prev, specs: next } : null))
                      } catch {
                        /* keep previous when JSON is invalid while typing */
                      }
                    }}
                    rows={16}
                    className="resize-none font-mono text-xs leading-relaxed"
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="content" className="space-y-4 pt-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{tDialog(`${AI_SUGGEST_DIALOG_NS}.shortDescription`)}</Label>
                  <ConfidenceBadge value={current.confidence?.shortDescription} labels={confidenceLabels} />
                </div>
                <Textarea
                  value={current.shortDescription ?? ''}
                  onChange={(e) =>
                    setEdited((prev) =>
                      prev ? { ...prev, shortDescription: e.target.value } : null
                    )
                  }
                  rows={2}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{tDialog(`${AI_SUGGEST_DIALOG_NS}.longDescription`)}</Label>
                  <ConfidenceBadge value={current.confidence?.longDescription} labels={confidenceLabels} />
                </div>
                <Textarea
                  value={current.longDescription ?? ''}
                  onChange={(e) =>
                    setEdited((prev) =>
                      prev ? { ...prev, longDescription: e.target.value } : null
                    )
                  }
                  rows={4}
                  className="resize-none"
                />
              </div>
              {current.boxContents != null && (
                <div className="space-y-2">
                  <Label>{tDialog(`${AI_SUGGEST_DIALOG_NS}.boxContents`)}</Label>
                  <Textarea
                    value={current.boxContents ?? ''}
                    onChange={(e) =>
                      setEdited((prev) => (prev ? { ...prev, boxContents: e.target.value } : null))
                    }
                    rows={3}
                    className="resize-none"
                  />
                </div>
              )}
              {current.tags != null && (
                <div className="space-y-2">
                  <Label>{tDialog(`${AI_SUGGEST_DIALOG_NS}.tagsLabel`)}</Label>
                  <Input
                    value={
                      typeof current.tags === 'string'
                        ? current.tags
                        : Array.isArray(current.tags)
                          ? (current.tags as string[]).join(', ')
                          : ''
                    }
                    onChange={(e) =>
                      setEdited((prev) => (prev ? { ...prev, tags: e.target.value } : null))
                    }
                    placeholder={tDialog(`${AI_SUGGEST_DIALOG_NS}.tagsPlaceholder`)}
                  />
                </div>
              )}
            </TabsContent>
            <TabsContent value="seo" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>{tDialog(`${AI_SUGGEST_DIALOG_NS}.seoTitle`)}</Label>
                <Input
                  value={current.seo?.metaTitle ?? ''}
                  onChange={(e) =>
                    setEdited((prev) =>
                      prev
                        ? {
                            ...prev,
                            seo: { ...prev.seo, metaTitle: e.target.value },
                          }
                        : null
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{tDialog(`${AI_SUGGEST_DIALOG_NS}.seoDescription`)}</Label>
                <Textarea
                  value={current.seo?.metaDescription ?? ''}
                  onChange={(e) =>
                    setEdited((prev) =>
                      prev
                        ? {
                            ...prev,
                            seo: { ...prev.seo, metaDescription: e.target.value },
                          }
                        : null
                    )
                  }
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>{tDialog(`${AI_SUGGEST_DIALOG_NS}.seoKeywords`)}</Label>
                <Input
                  value={current.seo?.metaKeywords ?? ''}
                  onChange={(e) =>
                    setEdited((prev) =>
                      prev
                        ? {
                            ...prev,
                            seo: { ...prev.seo, metaKeywords: e.target.value },
                          }
                        : null
                    )
                  }
                />
              </div>
            </TabsContent>
            <TabsContent value="extra" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>{tDialog(`${AI_SUGGEST_DIALOG_NS}.relatedIdsLabel`)}</Label>
                <Input
                  value={(current.relatedEquipmentIds ?? []).join(', ')}
                  onChange={(e) => {
                    const ids = e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                    setEdited((prev) => (prev ? { ...prev, relatedEquipmentIds: ids } : null))
                  }}
                  placeholder="id1, id2, id3"
                />
                <p className="text-xs text-muted-foreground">
                  {tDialog(`${AI_SUGGEST_DIALOG_NS}.relatedIdsHint`).replace(
                    '{count}',
                    String(current.relatedEquipmentIds?.length ?? 0)
                  )}
                </p>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tDialog(`${AI_SUGGEST_DIALOG_NS}.cancel`)}
          </Button>
          <Button onClick={handleApply} disabled={!canApply} className="gap-2">
            <Check className="h-4 w-4" />
            {tDialog(`${AI_SUGGEST_DIALOG_NS}.applyToForm`)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
