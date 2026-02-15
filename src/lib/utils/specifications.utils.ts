// ============================================================================
// Specifications Utilities & Helpers
// ============================================================================

import type {
  SpecItem,
  SpecGroup,
  SpecHighlight,
  QuickSpec,
  StructuredSpecifications
} from '@/lib/types/specifications.types'
import { isStructuredSpecifications } from '@/lib/types/specifications.types'

// ============================================================================
// Flatten & Read Helpers (for AI service and consumers)
// ============================================================================

/**
 * Flatten structured specifications to key-value map (for consumers that expect flat format)
 */
export function flattenStructuredSpecs(
  specs: StructuredSpecifications
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const group of specs.groups) {
    for (const spec of group.specs) {
      if (spec.key) out[spec.key] = spec.value
    }
  }
  return out
}

/**
 * Get a single spec value from either structured or flat specifications.
 * Used by AI service (e.g. lensMount, compatibleMounts).
 */
export function getSpecValue(
  specs: unknown,
  key: string
): string | undefined {
  if (specs == null || typeof specs !== 'object') return undefined
  if (isStructuredSpecifications(specs)) {
    for (const group of specs.groups) {
      const item = group.specs.find((s) => s.key === key)
      if (item) return item.value
    }
    return undefined
  }
  const flat = specs as Record<string, unknown>
  const val = flat[key]
  if (val === undefined || val === null) return undefined
  return String(val)
}

/**
 * Get array value from specs (e.g. compatibleMounts). Works for both formats.
 */
export function getSpecArray(specs: unknown, key: string): string[] {
  if (specs == null || typeof specs !== 'object') return []
  if (isStructuredSpecifications(specs)) {
    const v = getSpecValue(specs, key)
    if (!v) return []
    try {
      const parsed = JSON.parse(v) as unknown
      return Array.isArray(parsed) ? parsed.map(String) : [v]
    } catch {
      return [v]
    }
  }
  const flat = specs as Record<string, unknown>
  const val = flat[key]
  if (Array.isArray(val)) return val.map((m) => String(m))
  if (val != null) return [String(val)]
  return []
}

// ============================================================================
// Conversion
// ============================================================================

const RESERVED_KEYS = ['mode', 'html', 'highlights', 'quickSpecs', 'groups']

/**
 * Convert flat specifications to structured format.
 * If categoryHint is provided, matches keys against category template and distributes into groups.
 */
export function convertFlatToStructured(
  flatSpecs: Record<string, unknown>,
  categoryHint?: string
): StructuredSpecifications {
  const entries = Object.entries(flatSpecs).filter(
    ([key]) => !RESERVED_KEYS.includes(key)
  ) as [string, string][]

  const template = categoryHint
    ? categoryTemplates[categoryHint.toLowerCase()]
    : undefined

  if (template?.groups?.length) {
    const groups: SpecGroup[] = template.groups.map((g) => ({
      ...g,
      specs: g.specs.map((s) => {
        const pair = entries.find(
          ([k]) => k === s.key || k.toLowerCase() === s.key.toLowerCase()
        )
        return {
          ...s,
          value: pair ? String(pair[1] ?? '') : s.value
        }
      })
    }))
    const usedKeys = new Set(
      template.groups.flatMap((g) => g.specs.map((s) => s.key.toLowerCase()))
    )
    const remaining = entries.filter(
      ([k]) => !usedKeys.has(k.toLowerCase())
    )
    if (remaining.length > 0 && groups[0]) {
      groups[0].specs.push(
        ...remaining.map(([key, value]) => ({
          key,
          label: key.replace(/([A-Z])/g, ' $1').trim(),
          value: String(value ?? ''),
          type: 'text' as const
        }))
      )
    }
    return { groups }
  }

  const generalGroup: SpecGroup = {
    label: 'Specifications',
    labelAr: 'المواصفات',
    icon: 'star',
    priority: 1,
    specs: entries.map(([key, value]) => ({
      key,
      label: key.replace(/([A-Z])/g, ' $1').trim(),
      value: String(value ?? ''),
      type: 'text' as const
    }))
  }
  return { groups: [generalGroup] }
}

// ============================================================================
// Extraction
// ============================================================================

export function extractQuickSpecs(
  specs: StructuredSpecifications,
  maxCount = 4
): QuickSpec[] {
  const allSpecs: Array<{ spec: SpecItem; groupIcon: string }> = []
  specs.groups.forEach((group) => {
    group.specs.forEach((spec) => {
      if (spec.highlight) allSpecs.push({ spec, groupIcon: group.icon })
    })
  })
  return allSpecs.slice(0, maxCount).map(({ spec, groupIcon }) => ({
    icon: groupIcon,
    label: spec.label,
    value: spec.value
  }))
}

export function extractHighlights(
  specs: StructuredSpecifications,
  maxCount = 4
): SpecHighlight[] {
  const keyGroup = specs.groups.find(
    (g) => g.label.toLowerCase().includes('key') || g.priority === 1
  )
  if (!keyGroup) return []
  const topSpecs = keyGroup.specs.filter((s) => s.highlight).slice(0, maxCount)
  return topSpecs.map((spec) => {
    const parts = spec.value.split(/[()]/)
    return {
      icon: keyGroup.icon,
      label: spec.label,
      value: parts[0].trim(),
      sublabel: parts[1]?.trim()
    }
  })
}

// ============================================================================
// Validation
// ============================================================================

export function validateSpecifications(specs: StructuredSpecifications): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  if (!specs.groups?.length) {
    errors.push('At least one specification group is required')
  }
  specs.groups?.forEach((group, groupIdx) => {
    if (!group.label) errors.push(`Group ${groupIdx + 1}: Label is required`)
    if (!group.icon) errors.push(`Group ${groupIdx + 1}: Icon is required`)
    group.specs.forEach((spec, specIdx) => {
      if (!spec.key)
        errors.push(`Group "${group.label}" - Spec ${specIdx + 1}: Key is required`)
      if (!spec.label)
        errors.push(`Group "${group.label}" - Spec ${specIdx + 1}: Label is required`)
      if (spec.value === undefined || spec.value === '')
        errors.push(`Group "${group.label}" - Spec ${specIdx + 1}: Value is required`)
    })
  })
  return { valid: errors.length === 0, errors }
}

// ============================================================================
// Category Templates
// ============================================================================

export const categoryTemplates: Record<
  string,
  Partial<StructuredSpecifications>
> = {
  cameras: {
    groups: [
      {
        label: 'Key Specs',
        labelAr: 'المواصفات الرئيسية',
        icon: 'star',
        priority: 1,
        specs: [
          { key: 'sensor', label: 'Sensor', labelAr: 'المستشعر', value: '', highlight: true },
          { key: 'video', label: 'Video', labelAr: 'الفيديو', value: '', highlight: true },
          { key: 'iso', label: 'ISO Range', labelAr: 'نطاق ISO', value: '', type: 'range' },
          { key: 'autofocus', label: 'Autofocus', labelAr: 'التركيز التلقائي', value: '' },
          { key: 'stabilization', label: 'Stabilization', labelAr: 'الاستقرار', value: '' }
        ]
      },
      {
        label: 'Body & Display',
        labelAr: 'الجسم والشاشة',
        icon: 'monitor',
        priority: 2,
        specs: [
          { key: 'weight', label: 'Weight', labelAr: 'الوزن', value: '', type: 'range' },
          { key: 'dimensions', label: 'Dimensions', labelAr: 'الأبعاد', value: '' },
          { key: 'display', label: 'Display', labelAr: 'الشاشة', value: '' },
          { key: 'evf', label: 'EVF', labelAr: 'المنظار الإلكتروني', value: '' },
          { key: 'weather', label: 'Weather Sealed', labelAr: 'مقاومة للعوامل', value: '', type: 'boolean' }
        ]
      },
      {
        label: 'Storage & Power',
        labelAr: 'التخزين والطاقة',
        icon: 'hard-drive',
        priority: 3,
        specs: [
          { key: 'recording', label: 'Card Slots', labelAr: 'منافذ الذاكرة', value: '' },
          { key: 'battery', label: 'Battery', labelAr: 'البطارية', value: '' },
          { key: 'usbCharging', label: 'USB Charging', labelAr: 'شحن USB', value: '', type: 'boolean' }
        ]
      },
      {
        label: 'Connectivity',
        labelAr: 'الاتصال',
        icon: 'wifi',
        priority: 4,
        specs: [
          { key: 'wifi', label: 'WiFi', labelAr: 'واي فاي', value: '', type: 'boolean' },
          { key: 'bluetooth', label: 'Bluetooth', labelAr: 'بلوتوث', value: '', type: 'boolean' },
          { key: 'hdmi', label: 'HDMI', labelAr: 'HDMI', value: '' },
          { key: 'mount', label: 'Lens Mount', labelAr: 'قاعدة العدسة', value: '', highlight: true }
        ]
      }
    ]
  },
  lighting: {
    groups: [
      {
        label: 'Key Specs',
        labelAr: 'المواصفات الرئيسية',
        icon: 'star',
        priority: 1,
        specs: [
          { key: 'type', label: 'Type', labelAr: 'النوع', value: '', highlight: true },
          { key: 'colorTemp', label: 'Color Temperature', labelAr: 'درجة اللون', value: '', type: 'colorTemp', highlight: true },
          { key: 'cri', label: 'CRI / TLCI / CQS', labelAr: 'دقة الألوان', value: '', highlight: true },
          { key: 'beamAngle', label: 'Beam Angle', labelAr: 'زاوية الإضاءة', value: '' },
          { key: 'dimming', label: 'Dimming', labelAr: 'التعتيم', value: '', type: 'range' },
          { key: 'accessoryMount', label: 'Front Accessory Mount', labelAr: 'قاعدة الإكسسوار', value: '' },
          { key: 'powerSource', label: 'Power Source', labelAr: 'مصدر الطاقة', value: '' }
        ]
      },
      {
        label: 'Photometrics',
        labelAr: 'القياس الضوئي',
        icon: 'sun',
        priority: 2,
        specs: [
          { key: 'output', label: 'Output / Lux', labelAr: 'الإضاءة / لوكس', value: '' },
          { key: 'lumens', label: 'Lumens', labelAr: 'لومن', value: '' },
          { key: 'colorModes', label: 'Color Modes', labelAr: 'أوضاع اللون', value: '' },
          { key: 'photometrics', label: 'Photometrics (fc/Lux @ distance)', labelAr: 'القياس عند المسافات', value: '' }
        ]
      },
      {
        label: 'Connectivity',
        labelAr: 'الاتصال',
        icon: 'wifi',
        priority: 3,
        specs: [
          { key: 'wireless', label: 'Wireless Remote', labelAr: 'التحكم اللاسلكي', value: '' },
          { key: 'app', label: 'App Control', labelAr: 'التحكم بالتطبيق', value: '', type: 'boolean' },
          { key: 'dmx', label: 'DMX Channels', labelAr: 'قنوات DMX', value: '' },
          { key: 'wirelessRange', label: 'Wireless Range', labelAr: 'مدى اللاسلكي', value: '' },
          { key: 'wirelessFreq', label: 'Wireless Frequency', labelAr: 'تردد اللاسلكي', value: '' }
        ]
      },
      {
        label: 'Power & I/O',
        labelAr: 'الطاقة والتوصيلات',
        icon: 'zap',
        priority: 4,
        specs: [
          { key: 'power', label: 'Power Consumption', labelAr: 'استهلاك الطاقة', value: '', highlight: true },
          { key: 'acInput', label: 'AC Input', labelAr: 'مدخل التيار', value: '' },
          { key: 'batteryPlate', label: 'Battery Plate', labelAr: 'قاعدة البطارية', value: '' },
          { key: 'battery', label: 'Battery', labelAr: 'البطارية', value: '' },
          { key: 'io', label: 'Inputs/Outputs', labelAr: 'المداخل/المخارج', value: '' },
          { key: 'includedCables', label: 'Included Cables', labelAr: 'الكابلات المرفقة', value: '' }
        ]
      },
      {
        label: 'Mounting',
        labelAr: 'التثبيت',
        icon: 'ruler',
        priority: 5,
        specs: [
          { key: 'yoke', label: 'Yoke Type', labelAr: 'نوع الحامل', value: '' },
          { key: 'fixtureMount', label: 'Fixture Mounting', labelAr: 'تثبيت الفيكسشر', value: '' }
        ]
      },
      {
        label: 'Physical & General',
        labelAr: 'المواصفات الفيزيائية والعامة',
        icon: 'ruler',
        priority: 6,
        specs: [
          { key: 'dimensions', label: 'Dimensions', labelAr: 'الأبعاد', value: '' },
          { key: 'weight', label: 'Weight', labelAr: 'الوزن', value: '', type: 'range', highlight: true },
          { key: 'cooling', label: 'Cooling', labelAr: 'التبريد', value: '' },
          { key: 'display', label: 'Display', labelAr: 'الشاشة', value: '' },
          { key: 'materials', label: 'Materials', labelAr: 'المواد', value: '' },
          { key: 'certifications', label: 'Certifications', labelAr: 'الشهادات', value: '' },
          { key: 'ip', label: 'Protection Rating', labelAr: 'درجة الحماية', value: '' }
        ]
      }
    ]
  },
  lenses: {
    groups: [
      {
        label: 'Key Specs',
        labelAr: 'المواصفات الرئيسية',
        icon: 'aperture',
        priority: 1,
        specs: [
          { key: 'focalLength', label: 'Focal Length', labelAr: 'البعد البؤري', value: '', highlight: true },
          { key: 'maxAperture', label: 'Max Aperture', labelAr: 'فتحة العدسة القصوى', value: '', highlight: true },
          { key: 'mount', label: 'Mount', labelAr: 'القاعدة', value: '', highlight: true },
          { key: 'format', label: 'Format', labelAr: 'التنسيق', value: '' }
        ]
      },
      {
        label: 'Optical',
        labelAr: 'المواصفات البصرية',
        icon: 'aperture',
        priority: 2,
        specs: [
          { key: 'elements', label: 'Lens Elements', labelAr: 'عناصر العدسة', value: '' },
          { key: 'groups', label: 'Groups', labelAr: 'المجموعات', value: '' },
          { key: 'blades', label: 'Diaphragm Blades', labelAr: 'شفرات الحاجب', value: '' },
          { key: 'mfd', label: 'Min Focus Distance', labelAr: 'أقل مسافة تركيز', value: '' }
        ]
      },
      {
        label: 'Physical',
        labelAr: 'المواصفات الفيزيائية',
        icon: 'ruler',
        priority: 3,
        specs: [
          { key: 'weight', label: 'Weight', labelAr: 'الوزن', value: '', type: 'range' },
          { key: 'dimensions', label: 'Dimensions', labelAr: 'الأبعاد', value: '' },
          { key: 'filterThread', label: 'Filter Thread', labelAr: 'قطر الفلتر', value: '' },
          { key: 'weather', label: 'Weather Sealed', labelAr: 'مقاومة للعوامل', value: '', type: 'boolean' }
        ]
      }
    ]
  },
  audio: {
    groups: [
      {
        label: 'Key Specs',
        labelAr: 'المواصفات الرئيسية',
        icon: 'star',
        priority: 1,
        specs: [
          { key: 'type', label: 'Microphone Type', labelAr: 'نوع الميكروفون', value: '', highlight: true },
          { key: 'pattern', label: 'Polar Pattern', labelAr: 'نمط الالتقاط', value: '', highlight: true },
          { key: 'frequency', label: 'Frequency Response', labelAr: 'نطاق التردد', value: '' },
          { key: 'spl', label: 'Max SPL', labelAr: 'أقصى SPL', value: '' }
        ]
      },
      {
        label: 'Connectivity',
        labelAr: 'الاتصال',
        icon: 'cable',
        priority: 2,
        specs: [
          { key: 'output', label: 'Output', labelAr: 'المخرج', value: '' },
          { key: 'phantom', label: 'Phantom Power', labelAr: 'الطاقة الوهمية', value: '', type: 'boolean' },
          { key: 'cable', label: 'Cable Length', labelAr: 'طول الكيبل', value: '' }
        ]
      },
      {
        label: 'Physical',
        labelAr: 'المواصفات الفيزيائية',
        icon: 'ruler',
        priority: 3,
        specs: [
          { key: 'weight', label: 'Weight', labelAr: 'الوزن', value: '', type: 'range' },
          { key: 'dimensions', label: 'Dimensions', labelAr: 'الأبعاد', value: '' },
          { key: 'mount', label: 'Mount Type', labelAr: 'نوع التثبيت', value: '' }
        ]
      }
    ]
  },
  tripods: {
    groups: [
      {
        label: 'Key Specs',
        labelAr: 'المواصفات الرئيسية',
        icon: 'star',
        priority: 1,
        specs: [
          { key: 'maxLoad', label: 'Max Load', labelAr: 'الحمل الأقصى', value: '', highlight: true, type: 'range' },
          { key: 'maxHeight', label: 'Max Height', labelAr: 'أقصى ارتفاع', value: '', highlight: true },
          { key: 'minHeight', label: 'Min Height', labelAr: 'أقل ارتفاع', value: '' },
          { key: 'legSections', label: 'Leg Sections', labelAr: 'أقسام الأرجل', value: '' }
        ]
      },
      {
        label: 'Head & Mount',
        labelAr: 'الرأس والتثبيت',
        icon: 'camera',
        priority: 2,
        specs: [
          { key: 'headType', label: 'Head Type', labelAr: 'نوع الرأس', value: '' },
          { key: 'mount', label: 'Quick Release', labelAr: 'التحرير السريع', value: '' },
          { key: 'panTilt', label: 'Pan/Tilt', labelAr: 'الدوران/الإمالة', value: '' }
        ]
      },
      {
        label: 'Physical',
        labelAr: 'المواصفات الفيزيائية',
        icon: 'ruler',
        priority: 3,
        specs: [
          { key: 'weight', label: 'Weight', labelAr: 'الوزن', value: '', type: 'range' },
          { key: 'folded', label: 'Folded Length', labelAr: 'الطول المطوي', value: '' },
          { key: 'material', label: 'Material', labelAr: 'المادة', value: '' }
        ]
      }
    ]
  },
  monitors: {
    groups: [
      {
        label: 'Key Specs',
        labelAr: 'المواصفات الرئيسية',
        icon: 'monitor',
        priority: 1,
        specs: [
          { key: 'size', label: 'Screen Size', labelAr: 'حجم الشاشة', value: '', highlight: true },
          { key: 'resolution', label: 'Resolution', labelAr: 'الدقة', value: '', highlight: true },
          { key: 'brightness', label: 'Brightness', labelAr: 'السطوع', value: '', highlight: true },
          { key: 'aspectRatio', label: 'Aspect Ratio', labelAr: 'نسبة الأبعاد', value: '' }
        ]
      },
      {
        label: 'Display',
        labelAr: 'الشاشة',
        icon: 'monitor',
        priority: 2,
        specs: [
          { key: 'panelType', label: 'Panel Type', labelAr: 'نوع اللوحة', value: '' },
          { key: 'touchscreen', label: 'Touchscreen', labelAr: 'شاشة لمس', value: '', type: 'boolean' },
          { key: 'colorGamut', label: 'Color Gamut', labelAr: 'مجال الألوان', value: '' }
        ]
      },
      {
        label: 'Connectivity',
        labelAr: 'الاتصال',
        icon: 'cable',
        priority: 3,
        specs: [
          { key: 'hdmi', label: 'HDMI', labelAr: 'HDMI', value: '' },
          { key: 'sdi', label: 'SDI', labelAr: 'SDI', value: '' },
          { key: 'usb', label: 'USB', labelAr: 'USB', value: '' }
        ]
      },
      {
        label: 'Power & Physical',
        labelAr: 'الطاقة والمواصفات الفيزيائية',
        icon: 'zap',
        priority: 4,
        specs: [
          { key: 'power', label: 'Power Input', labelAr: 'مدخل الطاقة', value: '' },
          { key: 'battery', label: 'Battery Mount', labelAr: 'حامل البطارية', value: '', type: 'boolean' },
          { key: 'weight', label: 'Weight', labelAr: 'الوزن', value: '', type: 'range' }
        ]
      }
    ]
  }
}
