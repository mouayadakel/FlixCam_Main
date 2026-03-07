// ============================================================================
// Specifications Utilities & Helpers
// ============================================================================

import type {
  SpecItem,
  SpecGroup,
  SpecHighlight,
  QuickSpec,
  StructuredSpecifications,
} from './types'

// ============================================================================
// Sample Data - Complete Examples
// ============================================================================

/**
 * Sony A7S III - Complete example with all features
 */
export const sampleCamera: StructuredSpecifications = {
  highlights: [
    {
      icon: 'camera',
      label: 'Sensor',
      value: '12.1MP',
      sublabel: 'Full-Frame BSI',
    },
    {
      icon: 'video',
      label: 'Video',
      value: '4K 120p',
      sublabel: '10-bit 4:2:2',
    },
    {
      icon: 'scale',
      label: 'Weight',
      value: '699g',
      sublabel: 'Body Only',
    },
    {
      icon: 'battery',
      label: 'Battery',
      value: 'NP-FZ100',
      sublabel: '~600 shots',
    },
  ],
  quickSpecs: [
    { icon: 'aperture', label: 'Mount', value: 'E-Mount' },
    { icon: 'monitor', label: 'EVF', value: '9.44M-dot OLED' },
    { icon: 'layers', label: 'Cards', value: 'CFexpress + SD' },
    { icon: 'move', label: 'IBIS', value: '5-Axis 5.5 stops' },
  ],
  groups: [
    {
      label: 'Key Specs',
      labelAr: 'المواصفات الرئيسية',
      icon: 'star',
      priority: 1,
      specs: [
        {
          key: 'sensor',
          label: 'Sensor',
          labelAr: 'المستشعر',
          value: '12.1MP Full-Frame Exmor R BSI CMOS',
          highlight: true,
        },
        {
          key: 'video',
          label: 'Video',
          labelAr: 'الفيديو',
          value: '4K 120p 10-bit 4:2:2 Internal',
          highlight: true,
        },
        {
          key: 'iso',
          label: 'ISO Range',
          labelAr: 'نطاق ISO',
          value: '80–102,400 (Exp: 40–409,600)',
          type: 'range',
          rangePercent: 85,
        },
        {
          key: 'af',
          label: 'Autofocus',
          labelAr: 'التركيز التلقائي',
          value: '759-Point Fast Hybrid AF',
          highlight: true,
        },
        {
          key: 'ibis',
          label: 'Stabilization',
          labelAr: 'الاستقرار',
          value: '5-Axis In-Body (5.5 stops)',
        },
      ],
    },
    {
      label: 'Body & Display',
      labelAr: 'الجسم والشاشة',
      icon: 'monitor',
      priority: 2,
      specs: [
        {
          key: 'weight',
          label: 'Weight',
          labelAr: 'الوزن',
          value: '699g (body only)',
          type: 'range',
          rangePercent: 45,
        },
        {
          key: 'dimensions',
          label: 'Dimensions',
          labelAr: 'الأبعاد',
          value: '128.9 × 96.9 × 80.8 mm',
        },
        {
          key: 'display',
          label: 'Display',
          labelAr: 'الشاشة',
          value: '3.0" Vari-angle Touchscreen LCD',
        },
        {
          key: 'evf',
          label: 'EVF',
          labelAr: 'المنظار الإلكتروني',
          value: '9.44M-dot OLED',
        },
        {
          key: 'weather',
          label: 'Weather Sealed',
          labelAr: 'مقاومة للعوامل الجوية',
          value: 'Yes',
          type: 'boolean',
        },
      ],
    },
    {
      label: 'Storage & Power',
      labelAr: 'التخزين والطاقة',
      icon: 'hard-drive',
      priority: 3,
      specs: [
        {
          key: 'recording',
          label: 'Card Slots',
          labelAr: 'منافذ الذاكرة',
          value: 'Dual CFexpress Type A / SD UHS-II',
        },
        {
          key: 'battery',
          label: 'Battery',
          labelAr: 'البطارية',
          value: 'NP-FZ100 (~600 shots)',
        },
        {
          key: 'usb',
          label: 'USB Charging',
          labelAr: 'شحن USB',
          value: 'Yes',
          type: 'boolean',
        },
        {
          key: 'usbType',
          label: 'USB Port',
          labelAr: 'منفذ USB',
          value: 'USB-C 3.2 Gen 1',
        },
      ],
    },
    {
      label: 'Connectivity',
      labelAr: 'الاتصال',
      icon: 'wifi',
      priority: 4,
      specs: [
        {
          key: 'wifi',
          label: 'WiFi',
          labelAr: 'واي فاي',
          value: 'Yes',
          type: 'boolean',
        },
        {
          key: 'bluetooth',
          label: 'Bluetooth',
          labelAr: 'بلوتوث',
          value: 'Yes',
          type: 'boolean',
        },
        {
          key: 'hdmi',
          label: 'HDMI',
          labelAr: 'HDMI',
          value: 'Full-size Type A',
        },
        {
          key: 'mount',
          label: 'Lens Mount',
          labelAr: 'قاعدة العدسة',
          value: 'Sony E-Mount',
          highlight: true,
        },
      ],
    },
  ],
}

/**
 * ARRI SkyPanel S60-C - Lighting example
 */
export const sampleLighting: StructuredSpecifications = {
  highlights: [
    {
      icon: 'sun',
      label: 'Type',
      value: 'LED Panel',
      sublabel: 'Softlight',
    },
    {
      icon: 'gauge',
      label: 'CRI',
      value: '95+',
      sublabel: 'TLCI 90+',
    },
    {
      icon: 'scale',
      label: 'Weight',
      value: '12 kg',
      sublabel: 'Fixture Only',
    },
    {
      icon: 'zap',
      label: 'Power',
      value: '400W',
      sublabel: 'Max Draw',
    },
  ],
  quickSpecs: [
    { icon: 'sun', label: 'Color Temp', value: '2800-10000K' },
    { icon: 'aperture', label: 'Beam Angle', value: '105° w/ Diffuser' },
    { icon: 'cable', label: 'DMX', value: '18 channels' },
    { icon: 'wifi', label: 'Control', value: 'DMX / RDM / App' },
  ],
  groups: [
    {
      label: 'Key Specs',
      labelAr: 'المواصفات الرئيسية',
      icon: 'star',
      priority: 1,
      specs: [
        {
          key: 'type',
          label: 'Type',
          labelAr: 'النوع',
          value: 'LED Softlight Panel',
          highlight: true,
        },
        {
          key: 'colorTemp',
          label: 'Color Temperature',
          labelAr: 'درجة اللون',
          value: '2800–10,000K',
          type: 'colorTemp',
          highlight: true,
        },
        {
          key: 'colorModes',
          label: 'Color Modes',
          labelAr: 'أوضاع اللون',
          value: 'RGB, Daylight, Tungsten',
        },
        {
          key: 'cri',
          label: 'CRI / TLCI',
          labelAr: 'دقة الألوان',
          value: 'CRI 95 / TLCI 90',
          highlight: true,
        },
        {
          key: 'beamAngle',
          label: 'Beam Angle',
          labelAr: 'زاوية الإضاءة',
          value: '105° with Diffuser',
        },
        {
          key: 'dimming',
          label: 'Dimming',
          labelAr: 'التعتيم',
          value: '0–100% (DMX / RDM / Built-In)',
          type: 'range',
          rangePercent: 100,
        },
      ],
    },
    {
      label: 'Power & I/O',
      labelAr: 'الطاقة والتوصيلات',
      icon: 'zap',
      priority: 2,
      specs: [
        {
          key: 'acInput',
          label: 'AC Input',
          labelAr: 'مدخل الكهرباء',
          value: '100–250 VAC, 50/60 Hz',
        },
        {
          key: 'dcInput',
          label: 'DC Input',
          labelAr: 'مدخل DC',
          value: '23–36 VDC / 48 VDC',
        },
        {
          key: 'power',
          label: 'Power Consumption',
          labelAr: 'استهلاك الطاقة',
          value: '400W',
          highlight: true,
        },
        {
          key: 'battery',
          label: 'Battery Support',
          labelAr: 'دعم البطارية',
          value: '23–36 VDC (Not Included, 50% max)',
        },
      ],
    },
    {
      label: 'Physical',
      labelAr: 'المواصفات الفيزيائية',
      icon: 'ruler',
      priority: 3,
      specs: [
        {
          key: 'dimensions',
          label: 'Dimensions',
          labelAr: 'الأبعاد',
          value: '82.5 × 56.6 × 13.2 cm (with Yoke)',
        },
        {
          key: 'weight',
          label: 'Weight',
          labelAr: 'الوزن',
          value: '12 kg (Fixture) + 5 kg (PSU)',
          type: 'range',
          rangePercent: 60,
          highlight: true,
        },
        {
          key: 'cooling',
          label: 'Cooling',
          labelAr: 'التبريد',
          value: 'Fan',
        },
        {
          key: 'ip',
          label: 'Protection',
          labelAr: 'الحماية',
          value: 'IP20 (Dust-Resistant)',
        },
        {
          key: 'opTemp',
          label: 'Operating Temp',
          labelAr: 'حرارة التشغيل',
          value: '-20°C to 45°C',
        },
      ],
    },
    {
      label: 'Connectivity',
      labelAr: 'الاتصال',
      icon: 'cable',
      priority: 4,
      specs: [
        {
          key: 'dmxChannels',
          label: 'DMX Channels',
          labelAr: 'قنوات DMX',
          value: '18 channels',
        },
        {
          key: 'ios',
          label: 'Inputs/Outputs',
          labelAr: 'المداخل/المخارج',
          value: 'XLR 3-Pin, XLR 5-Pin DMX In/Out, etherCON/RJ45, USB-A',
        },
        {
          key: 'app',
          label: 'App Control',
          labelAr: 'التحكم بالتطبيق',
          value: 'Yes',
          type: 'boolean',
        },
      ],
    },
  ],
}

// ============================================================================
// Conversion Utilities
// ============================================================================

/**
 * Convert flat specifications to structured format
 */
export function convertFlatToStructured(
  flatSpecs: Record<string, any>,
  categoryHint?: string
): StructuredSpecifications {
  // Filter out non-spec keys
  const entries = Object.entries(flatSpecs).filter(
    ([key]) => !['mode', 'html', 'highlights', 'quickSpecs', 'groups'].includes(key)
  )

  // Group specs into a single "General" group
  const generalGroup: SpecGroup = {
    label: 'Specifications',
    labelAr: 'المواصفات',
    icon: 'star',
    priority: 1,
    specs: entries.map(([key, value]) => ({
      key,
      label: key.replace(/([A-Z])/g, ' $1').trim(),
      value: String(value ?? ''),
      type: 'text' as const,
    })),
  }

  return {
    groups: [generalGroup],
  }
}

/**
 * Extract key specs for quick pills (auto-detect important specs)
 */
export function extractQuickSpecs(
  specs: StructuredSpecifications,
  maxCount: number = 4
): QuickSpec[] {
  const allSpecs: Array<{ spec: SpecItem; groupIcon: string }> = []

  // Collect all highlighted specs
  specs.groups.forEach((group) => {
    group.specs.forEach((spec) => {
      if (spec.highlight) {
        allSpecs.push({ spec, groupIcon: group.icon })
      }
    })
  })

  // Return top N
  return allSpecs.slice(0, maxCount).map(({ spec, groupIcon }) => ({
    icon: groupIcon,
    label: spec.label,
    value: spec.value,
  }))
}

/**
 * Extract hero highlights (auto-detect most important specs)
 */
export function extractHighlights(
  specs: StructuredSpecifications,
  maxCount: number = 4
): SpecHighlight[] {
  const keyGroup = specs.groups.find(
    (g) => g.label.toLowerCase().includes('key') || g.priority === 1
  )

  if (!keyGroup) return []

  const topSpecs = keyGroup.specs.filter((s) => s.highlight).slice(0, maxCount)

  return topSpecs.map((spec) => {
    // Try to split value into main + sublabel
    const parts = spec.value.split(/[\(\)]/)
    return {
      icon: keyGroup.icon,
      label: spec.label,
      value: parts[0].trim(),
      sublabel: parts[1]?.trim(),
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

  if (!specs.groups || specs.groups.length === 0) {
    errors.push('At least one specification group is required')
  }

  specs.groups.forEach((group, groupIdx) => {
    if (!group.label) {
      errors.push(`Group ${groupIdx + 1}: Label is required`)
    }

    if (!group.icon) {
      errors.push(`Group ${groupIdx + 1}: Icon is required`)
    }

    group.specs.forEach((spec, specIdx) => {
      if (!spec.key) {
        errors.push(`Group "${group.label}" - Spec ${specIdx + 1}: Key is required`)
      }
      if (!spec.label) {
        errors.push(`Group "${group.label}" - Spec ${specIdx + 1}: Label is required`)
      }
      if (!spec.value) {
        errors.push(`Group "${group.label}" - Spec ${specIdx + 1}: Value is required`)
      }
    })
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}

// ============================================================================
// Category Templates (Expanded)
// ============================================================================

export const categoryTemplates: Record<string, Partial<StructuredSpecifications>> = {
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
          { key: 'stabilization', label: 'Stabilization', labelAr: 'الاستقرار', value: '' },
        ],
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
          {
            key: 'weather',
            label: 'Weather Sealed',
            labelAr: 'مقاومة للعوامل',
            value: '',
            type: 'boolean',
          },
        ],
      },
      {
        label: 'Storage & Power',
        labelAr: 'التخزين والطاقة',
        icon: 'hard-drive',
        priority: 3,
        specs: [
          { key: 'recording', label: 'Card Slots', labelAr: 'منافذ الذاكرة', value: '' },
          { key: 'battery', label: 'Battery', labelAr: 'البطارية', value: '' },
          {
            key: 'usbCharging',
            label: 'USB Charging',
            labelAr: 'شحن USB',
            value: '',
            type: 'boolean',
          },
        ],
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
          {
            key: 'mount',
            label: 'Lens Mount',
            labelAr: 'قاعدة العدسة',
            value: '',
            highlight: true,
          },
        ],
      },
    ],
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
          {
            key: 'colorTemp',
            label: 'Color Temperature',
            labelAr: 'درجة اللون',
            value: '',
            type: 'colorTemp',
            highlight: true,
          },
          { key: 'cri', label: 'CRI / TLCI', labelAr: 'دقة الألوان', value: '', highlight: true },
          { key: 'beamAngle', label: 'Beam Angle', labelAr: 'زاوية الإضاءة', value: '' },
          { key: 'dimming', label: 'Dimming', labelAr: 'التعتيم', value: '', type: 'range' },
        ],
      },
      {
        label: 'Power & I/O',
        labelAr: 'الطاقة والتوصيلات',
        icon: 'zap',
        priority: 2,
        specs: [
          {
            key: 'power',
            label: 'Power Consumption',
            labelAr: 'استهلاك الطاقة',
            value: '',
            highlight: true,
          },
          { key: 'acInput', label: 'AC Input', labelAr: 'مدخل الكهرباء', value: '' },
          { key: 'dcInput', label: 'DC Input', labelAr: 'مدخل DC', value: '' },
          { key: 'battery', label: 'Battery Support', labelAr: 'دعم البطارية', value: '' },
        ],
      },
      {
        label: 'Physical',
        labelAr: 'المواصفات الفيزيائية',
        icon: 'ruler',
        priority: 3,
        specs: [
          { key: 'dimensions', label: 'Dimensions', labelAr: 'الأبعاد', value: '' },
          {
            key: 'weight',
            label: 'Weight',
            labelAr: 'الوزن',
            value: '',
            type: 'range',
            highlight: true,
          },
          { key: 'cooling', label: 'Cooling', labelAr: 'التبريد', value: '' },
          { key: 'ip', label: 'Protection Rating', labelAr: 'درجة الحماية', value: '' },
        ],
      },
      {
        label: 'Connectivity',
        labelAr: 'الاتصال',
        icon: 'cable',
        priority: 4,
        specs: [
          { key: 'dmx', label: 'DMX Channels', labelAr: 'قنوات DMX', value: '' },
          { key: 'ios', label: 'Inputs/Outputs', labelAr: 'المداخل/المخارج', value: '' },
          {
            key: 'app',
            label: 'App Control',
            labelAr: 'التحكم بالتطبيق',
            value: '',
            type: 'boolean',
          },
        ],
      },
    ],
  },

  lenses: {
    groups: [
      {
        label: 'Key Specs',
        labelAr: 'المواصفات الرئيسية',
        icon: 'aperture',
        priority: 1,
        specs: [
          {
            key: 'focalLength',
            label: 'Focal Length',
            labelAr: 'البعد البؤري',
            value: '',
            highlight: true,
          },
          {
            key: 'maxAperture',
            label: 'Max Aperture',
            labelAr: 'فتحة العدسة القصوى',
            value: '',
            highlight: true,
          },
          { key: 'mount', label: 'Mount', labelAr: 'القاعدة', value: '', highlight: true },
          { key: 'format', label: 'Format', labelAr: 'التنسيق', value: '' },
        ],
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
          { key: 'mfd', label: 'Min Focus Distance', labelAr: 'أقل مسافة تركيز', value: '' },
        ],
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
          {
            key: 'weather',
            label: 'Weather Sealed',
            labelAr: 'مقاومة للعوامل',
            value: '',
            type: 'boolean',
          },
        ],
      },
    ],
  },

  audio: {
    groups: [
      {
        label: 'Key Specs',
        labelAr: 'المواصفات الرئيسية',
        icon: 'star',
        priority: 1,
        specs: [
          {
            key: 'type',
            label: 'Microphone Type',
            labelAr: 'نوع الميكروفون',
            value: '',
            highlight: true,
          },
          {
            key: 'pattern',
            label: 'Polar Pattern',
            labelAr: 'نمط الالتقاط',
            value: '',
            highlight: true,
          },
          { key: 'frequency', label: 'Frequency Response', labelAr: 'نطاق التردد', value: '' },
          { key: 'spl', label: 'Max SPL', labelAr: 'أقصى SPL', value: '' },
        ],
      },
      {
        label: 'Connectivity',
        labelAr: 'الاتصال',
        icon: 'cable',
        priority: 2,
        specs: [
          { key: 'output', label: 'Output', labelAr: 'المخرج', value: '' },
          {
            key: 'phantom',
            label: 'Phantom Power',
            labelAr: 'الطاقة الوهمية',
            value: '',
            type: 'boolean',
          },
          { key: 'cable', label: 'Cable Length', labelAr: 'طول الكيبل', value: '' },
        ],
      },
      {
        label: 'Physical',
        labelAr: 'المواصفات الفيزيائية',
        icon: 'ruler',
        priority: 3,
        specs: [
          { key: 'weight', label: 'Weight', labelAr: 'الوزن', value: '', type: 'range' },
          { key: 'dimensions', label: 'Dimensions', labelAr: 'الأبعاد', value: '' },
          { key: 'mount', label: 'Mount Type', labelAr: 'نوع التثبيت', value: '' },
        ],
      },
    ],
  },

  tripods: {
    groups: [
      {
        label: 'Key Specs',
        labelAr: 'المواصفات الرئيسية',
        icon: 'star',
        priority: 1,
        specs: [
          {
            key: 'maxLoad',
            label: 'Max Load',
            labelAr: 'الحمل الأقصى',
            value: '',
            highlight: true,
            type: 'range',
          },
          {
            key: 'maxHeight',
            label: 'Max Height',
            labelAr: 'أقصى ارتفاع',
            value: '',
            highlight: true,
          },
          { key: 'minHeight', label: 'Min Height', labelAr: 'أقل ارتفاع', value: '' },
          { key: 'legSections', label: 'Leg Sections', labelAr: 'أقسام الأرجل', value: '' },
        ],
      },
      {
        label: 'Head & Mount',
        labelAr: 'الرأس والتثبيت',
        icon: 'camera',
        priority: 2,
        specs: [
          { key: 'headType', label: 'Head Type', labelAr: 'نوع الرأس', value: '' },
          { key: 'mount', label: 'Quick Release', labelAr: 'التحرير السريع', value: '' },
          { key: 'panTilt', label: 'Pan/Tilt', labelAr: 'الدوران/الإمالة', value: '' },
        ],
      },
      {
        label: 'Physical',
        labelAr: 'المواصفات الفيزيائية',
        icon: 'ruler',
        priority: 3,
        specs: [
          { key: 'weight', label: 'Weight', labelAr: 'الوزن', value: '', type: 'range' },
          { key: 'folded', label: 'Folded Length', labelAr: 'الطول المطوي', value: '' },
          { key: 'material', label: 'Material', labelAr: 'المادة', value: '' },
        ],
      },
    ],
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
          { key: 'aspectRatio', label: 'Aspect Ratio', labelAr: 'نسبة الأبعاد', value: '' },
        ],
      },
      {
        label: 'Display',
        labelAr: 'الشاشة',
        icon: 'monitor',
        priority: 2,
        specs: [
          { key: 'panelType', label: 'Panel Type', labelAr: 'نوع اللوحة', value: '' },
          {
            key: 'touchscreen',
            label: 'Touchscreen',
            labelAr: 'شاشة لمس',
            value: '',
            type: 'boolean',
          },
          { key: 'colorGamut', label: 'Color Gamut', labelAr: 'مجال الألوان', value: '' },
        ],
      },
      {
        label: 'Connectivity',
        labelAr: 'الاتصال',
        icon: 'cable',
        priority: 3,
        specs: [
          { key: 'hdmi', label: 'HDMI', labelAr: 'HDMI', value: '' },
          { key: 'sdi', label: 'SDI', labelAr: 'SDI', value: '' },
          { key: 'usb', label: 'USB', labelAr: 'USB', value: '' },
        ],
      },
      {
        label: 'Power & Physical',
        labelAr: 'الطاقة والمواصفات الفيزيائية',
        icon: 'zap',
        priority: 4,
        specs: [
          { key: 'power', label: 'Power Input', labelAr: 'مدخل الطاقة', value: '' },
          {
            key: 'battery',
            label: 'Battery Mount',
            labelAr: 'حامل البطارية',
            value: '',
            type: 'boolean',
          },
          { key: 'weight', label: 'Weight', labelAr: 'الوزن', value: '', type: 'range' },
        ],
      },
    ],
  },
}

// ============================================================================
// Export All
// ============================================================================

export {
  sampleCamera,
  sampleLighting,
  convertFlatToStructured,
  extractQuickSpecs,
  extractHighlights,
  validateSpecifications,
  categoryTemplates,
}
