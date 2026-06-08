import type { AnySpecifications, SpecItem, StructuredSpecifications } from '@/lib/types/specifications.types'
import { isStructuredSpecifications } from '@/lib/types/specifications.types'
import { convertFlatToStructured, safeStringifySpecValue } from '@/lib/utils/specifications.utils'

export type CanonicalGroup =
  | 'sensor'
  | 'optics'
  | 'power'
  | 'connectivity'
  | 'physical'
  | 'audio'
  | 'media'
  | 'additional'

export type PanelBadge = 'Key Spec' | 'Pro Feature' | 'Needs Review'

export type PanelSpecItem = SpecItem & {
  badge?: PanelBadge
}

export type PanelGroup = {
  id: string
  label: string
  /** Arabic section title when grouped by canonical hints */
  labelAr?: string
  icon: string
  priority: number
  canonical: CanonicalGroup
  specs: PanelSpecItem[]
}

export type SpecsPanelModel = {
  highlights: Array<{ label: string; labelAr?: string; value: string; unit?: string }>
  groups: PanelGroup[]
  quickSpecs: Array<{ label: string; value: string }>
}

const GROUP_HINTS: Array<{
  canonical: CanonicalGroup
  matchers: RegExp[]
  label: string
  labelAr: string
  icon: string
}> = [
  {
    canonical: 'sensor',
    label: 'Sensor',
    labelAr: 'المستشعر',
    icon: 'camera',
    matchers: [/sensor/i, /iso/i, /dynamic/i, /resolution/i, /megapixels/i, /full frame/i, /low[- ]light/i],
  },
  {
    canonical: 'optics',
    label: 'Optics',
    labelAr: 'البصريات',
    icon: 'aperture',
    matchers: [/lens/i, /mount/i, /aperture/i, /focal/i, /stabilization/i, /ibis/i],
  },
  {
    canonical: 'power',
    label: 'Power',
    labelAr: 'الطاقة',
    icon: 'battery',
    matchers: [/power/i, /battery/i, /voltage/i, /wh/i, /charging/i, /v-mount/i, /gold mount/i],
  },
  {
    canonical: 'connectivity',
    label: 'Connectivity',
    labelAr: 'الاتصال',
    icon: 'wifi',
    matchers: [/hdmi/i, /sdi/i, /wifi/i, /bluetooth/i, /usb/i, /xlr/i, /bnc/i],
  },
  {
    canonical: 'physical',
    label: 'Physical',
    labelAr: 'المواصفات الفيزيائية',
    icon: 'scale',
    matchers: [/weight/i, /size/i, /dimension/i, /temp/i, /weather/i, /material/i],
  },
  {
    canonical: 'audio',
    label: 'Audio',
    labelAr: 'الصوت',
    icon: 'gauge',
    matchers: [/audio/i, /db/i, /frequency/i, /mic/i, /headphone/i, /speaker/i],
  },
  {
    canonical: 'media',
    label: 'Media',
    labelAr: 'التسجيل والوسائط',
    icon: 'hard-drive',
    matchers: [/codec/i, /card/i, /record/i, /media/i, /bitrate/i, /4k/i, /1080p/i, /8k/i, /cinema/i, /raw/i],
  },
]

function isBlankDisplayValue(value: string): boolean {
  const t = value.trim().toLowerCase()
  return (
    t === '' ||
    t === '-' ||
    t === '—' ||
    t === 'n/a' ||
    t === 'na' ||
    t === 'none' ||
    t === 'null' ||
    t === 'undefined' ||
    t === 'tbd' ||
    t === 'pending'
  )
}

function pickCanonical(item: SpecItem): CanonicalGroup {
  const val = safeStringifySpecValue(item.value)
  const target = `${item.key} ${item.label} ${val}`.toLowerCase()
  const found = GROUP_HINTS.find((entry) => entry.matchers.some((matcher) => matcher.test(target)))
  return found?.canonical ?? 'additional'
}

function badgeForSpec(item: SpecItem): PanelBadge | undefined {
  const v = safeStringifySpecValue(item.value)
  if (item.highlight) return 'Key Spec'
  if (/(pro|cine|raw|12g|8k|full frame)/i.test(`${item.label} ${v}`)) return 'Pro Feature'
  return undefined
}

function stripUnit(value: unknown): { value: string; unit?: string } {
  const str = safeStringifySpecValue(value).trim()
  const match = str.match(/^(.+?)\s([a-zA-Z%μ²℃°]+)$/)
  if (!match) return { value: str }
  return { value: match[1].trim(), unit: match[2].trim() }
}

export function buildSpecsPanelModel(
  specs: AnySpecifications | null,
  categoryHint?: string
): SpecsPanelModel {
  if (!specs) return { highlights: [], groups: [], quickSpecs: [] }
  const structured: StructuredSpecifications = isStructuredSpecifications(specs)
    ? specs
    : convertFlatToStructured(specs as Record<string, unknown>, categoryHint)

  const groupMap = new Map<CanonicalGroup, PanelGroup>()
  let additionalCounter = 1

  for (const group of structured.groups) {
    for (const spec of group.specs) {
      const valueNorm = safeStringifySpecValue(spec.value)
      if (isBlankDisplayValue(valueNorm)) continue

      const specNorm: SpecItem = { ...spec, value: valueNorm }
      const canonical = pickCanonical(specNorm)
      const existing = groupMap.get(canonical)
      const panelSpec: PanelSpecItem = { ...specNorm, badge: badgeForSpec(specNorm) }
      if (existing) {
        existing.specs.push(panelSpec)
      } else {
        const hint = GROUP_HINTS.find((h) => h.canonical === canonical)
        const label =
          canonical === 'additional' ? 'Additional Specs' : (hint?.label ?? group.label)
        const labelAr =
          canonical === 'additional'
            ? 'مواصفات إضافية'
            : (hint?.labelAr ?? group.labelAr ?? undefined)
        groupMap.set(canonical, {
          id: `${canonical}-${additionalCounter++}`,
          label,
          labelAr,
          icon: hint?.icon ?? group.icon ?? 'info',
          priority: canonical === 'additional' ? 99 : group.priority ?? 50,
          canonical,
          specs: [panelSpec],
        })
      }
    }
  }

  const groups = Array.from(groupMap.values()).sort((a, b) => a.priority - b.priority)
  const quickSpecs = (structured.quickSpecs ?? [])
    .map((item) => ({
      label: item.label,
      value: safeStringifySpecValue(item.value),
    }))
    .filter((item) => !isBlankDisplayValue(item.value))
    .slice(0, 5)

  const highlights = (structured.highlights ?? [])
    .filter((item) => !isBlankDisplayValue(safeStringifySpecValue(item.value)))
    .slice(0, 5)
    .map((item) => {
      const parsed = stripUnit(item.value)
      return { label: item.label, value: parsed.value, unit: parsed.unit }
    })

  if (highlights.length === 0) {
    const promoted = groups
      .flatMap((group) => group.specs.filter((item) => item.badge === 'Key Spec').slice(0, 2))
      .slice(0, 5)
      .map((item) => {
        const parsed = stripUnit(item.value)
        return {
          label: item.label,
          labelAr: item.labelAr,
          value: parsed.value,
          unit: parsed.unit,
        }
      })
    return { highlights: promoted, groups, quickSpecs }
  }

  return { highlights, groups, quickSpecs }
}

