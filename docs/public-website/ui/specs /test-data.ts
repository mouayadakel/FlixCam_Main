// ============================================================================
// Test Data & Sample Specifications
// ============================================================================

import type { StructuredSpecifications } from './types';

/**
 * ============================================================================
 * CAMERAS
 * ============================================================================
 */

export const testCameraSonyA7SIII: StructuredSpecifications = {
  highlights: [
    {
      icon: 'camera',
      label: 'Sensor',
      value: '12.1MP',
      sublabel: 'Full-Frame BSI'
    },
    {
      icon: 'video',
      label: 'Video',
      value: '4K 120p',
      sublabel: '10-bit 4:2:2'
    },
    {
      icon: 'scale',
      label: 'Weight',
      value: '699g',
      sublabel: 'Body Only'
    },
    {
      icon: 'battery',
      label: 'Battery',
      value: 'NP-FZ100',
      sublabel: '~600 shots'
    }
  ],
  quickSpecs: [
    { icon: 'aperture', label: 'Mount', value: 'E-Mount' },
    { icon: 'monitor', label: 'EVF', value: '9.44M-dot OLED' },
    { icon: 'layers', label: 'Cards', value: 'CFexpress + SD' },
    { icon: 'move', label: 'IBIS', value: '5-Axis 5.5 stops' }
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
          highlight: true
        },
        {
          key: 'video',
          label: 'Video',
          labelAr: 'الفيديو',
          value: '4K 120p 10-bit 4:2:2 Internal',
          highlight: true
        },
        {
          key: 'iso',
          label: 'ISO Range',
          labelAr: 'نطاق ISO',
          value: '80–102,400 (Exp: 40–409,600)',
          type: 'range',
          rangePercent: 85
        },
        {
          key: 'af',
          label: 'Autofocus',
          labelAr: 'التركيز التلقائي',
          value: '759-Point Fast Hybrid AF',
          highlight: true
        },
        {
          key: 'ibis',
          label: 'Stabilization',
          labelAr: 'الاستقرار',
          value: '5-Axis In-Body (5.5 stops)'
        }
      ]
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
          rangePercent: 45
        },
        {
          key: 'dimensions',
          label: 'Dimensions',
          labelAr: 'الأبعاد',
          value: '128.9 × 96.9 × 80.8 mm'
        },
        {
          key: 'display',
          label: 'Display',
          labelAr: 'الشاشة',
          value: '3.0" Vari-angle Touchscreen LCD'
        },
        {
          key: 'evf',
          label: 'EVF',
          labelAr: 'المنظار الإلكتروني',
          value: '9.44M-dot OLED'
        },
        {
          key: 'weather',
          label: 'Weather Sealed',
          labelAr: 'مقاومة للعوامل الجوية',
          value: 'Yes',
          type: 'boolean'
        }
      ]
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
          value: 'Dual CFexpress Type A / SD UHS-II'
        },
        {
          key: 'battery',
          label: 'Battery',
          labelAr: 'البطارية',
          value: 'NP-FZ100 (~600 shots)'
        },
        {
          key: 'usb',
          label: 'USB Charging',
          labelAr: 'شحن USB',
          value: 'Yes',
          type: 'boolean'
        }
      ]
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
          type: 'boolean'
        },
        {
          key: 'bluetooth',
          label: 'Bluetooth',
          labelAr: 'بلوتوث',
          value: 'Yes',
          type: 'boolean'
        },
        {
          key: 'hdmi',
          label: 'HDMI',
          labelAr: 'HDMI',
          value: 'Full-size Type A'
        },
        {
          key: 'mount',
          label: 'Lens Mount',
          labelAr: 'قاعدة العدسة',
          value: 'Sony E-Mount',
          highlight: true
        }
      ]
    }
  ]
};

/**
 * ============================================================================
 * LIGHTING
 * ============================================================================
 */

export const testLightingARRISkyPanel: StructuredSpecifications = {
  highlights: [
    {
      icon: 'sun',
      label: 'Type',
      value: 'LED Panel',
      sublabel: 'Softlight'
    },
    {
      icon: 'gauge',
      label: 'CRI',
      value: '95+',
      sublabel: 'TLCI 90+'
    },
    {
      icon: 'scale',
      label: 'Weight',
      value: '12 kg',
      sublabel: 'Fixture Only'
    },
    {
      icon: 'zap',
      label: 'Power',
      value: '400W',
      sublabel: 'Max Draw'
    }
  ],
  quickSpecs: [
    { icon: 'sun', label: 'Color Temp', value: '2800-10000K' },
    { icon: 'aperture', label: 'Beam Angle', value: '105° w/ Diffuser' },
    { icon: 'cable', label: 'DMX', value: '18 channels' },
    { icon: 'wifi', label: 'Control', value: 'DMX / RDM / App' }
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
          highlight: true
        },
        {
          key: 'colorTemp',
          label: 'Color Temperature',
          labelAr: 'درجة اللون',
          value: '2800–10,000K',
          type: 'colorTemp',
          highlight: true
        },
        {
          key: 'colorModes',
          label: 'Color Modes',
          labelAr: 'أوضاع اللون',
          value: 'RGB, Daylight, Tungsten'
        },
        {
          key: 'cri',
          label: 'CRI / TLCI',
          labelAr: 'دقة الألوان',
          value: 'CRI 95 / TLCI 90',
          highlight: true
        },
        {
          key: 'beamAngle',
          label: 'Beam Angle',
          labelAr: 'زاوية الإضاءة',
          value: '105° with Diffuser'
        },
        {
          key: 'dimming',
          label: 'Dimming',
          labelAr: 'التعتيم',
          value: '0–100% (DMX / RDM / Built-In)',
          type: 'range',
          rangePercent: 100
        }
      ]
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
          value: '100–250 VAC, 50/60 Hz'
        },
        {
          key: 'dcInput',
          label: 'DC Input',
          labelAr: 'مدخل DC',
          value: '23–36 VDC / 48 VDC'
        },
        {
          key: 'power',
          label: 'Power Consumption',
          labelAr: 'استهلاك الطاقة',
          value: '400W',
          highlight: true
        }
      ]
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
          value: '82.5 × 56.6 × 13.2 cm (with Yoke)'
        },
        {
          key: 'weight',
          label: 'Weight',
          labelAr: 'الوزن',
          value: '12 kg (Fixture) + 5 kg (PSU)',
          type: 'range',
          rangePercent: 60,
          highlight: true
        },
        {
          key: 'cooling',
          label: 'Cooling',
          labelAr: 'التبريد',
          value: 'Fan'
        },
        {
          key: 'ip',
          label: 'Protection',
          labelAr: 'الحماية',
          value: 'IP20 (Dust-Resistant)'
        }
      ]
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
          value: '18 channels'
        },
        {
          key: 'ios',
          label: 'Inputs/Outputs',
          labelAr: 'المداخل/المخارج',
          value: 'XLR 3-Pin, XLR 5-Pin DMX In/Out, etherCON/RJ45, USB-A'
        },
        {
          key: 'app',
          label: 'App Control',
          labelAr: 'التحكم بالتطبيق',
          value: 'Yes',
          type: 'boolean'
        }
      ]
    }
  ]
};

/**
 * ============================================================================
 * LENSES
 * ============================================================================
 */

export const testLensSonyGM: StructuredSpecifications = {
  highlights: [
    {
      icon: 'aperture',
      label: 'Focal Length',
      value: '24-70mm',
      sublabel: 'Full-Frame'
    },
    {
      icon: 'aperture',
      label: 'Max Aperture',
      value: 'f/2.8',
      sublabel: 'Constant'
    },
    {
      icon: 'scale',
      label: 'Weight',
      value: '886g',
      sublabel: 'Light for Range'
    },
    {
      icon: 'camera',
      label: 'Mount',
      value: 'E-Mount',
      sublabel: 'Sony FE'
    }
  ],
  quickSpecs: [
    { icon: 'aperture', label: 'Focal Length', value: '24-70mm' },
    { icon: 'aperture', label: 'Aperture', value: 'f/2.8' },
    { icon: 'scale', label: 'Weight', value: '886g' },
    { icon: 'camera', label: 'Format', value: 'Full-Frame' }
  ],
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
          value: '24-70mm',
          highlight: true
        },
        {
          key: 'maxAperture',
          label: 'Max Aperture',
          labelAr: 'فتحة العدسة القصوى',
          value: 'f/2.8 (Constant)',
          highlight: true
        },
        {
          key: 'mount',
          label: 'Mount',
          labelAr: 'القاعدة',
          value: 'Sony E-Mount (FE)',
          highlight: true
        },
        {
          key: 'format',
          label: 'Format',
          labelAr: 'التنسيق',
          value: 'Full-Frame'
        }
      ]
    },
    {
      label: 'Optical',
      labelAr: 'المواصفات البصرية',
      icon: 'aperture',
      priority: 2,
      specs: [
        {
          key: 'elements',
          label: 'Lens Elements',
          labelAr: 'عناصر العدسة',
          value: '18 elements in 13 groups'
        },
        {
          key: 'blades',
          label: 'Diaphragm Blades',
          labelAr: 'شفرات الحاجب',
          value: '9 (Circular)'
        },
        {
          key: 'mfd',
          label: 'Min Focus Distance',
          labelAr: 'أقل مسافة تركيز',
          value: '0.38m @ 70mm'
        },
        {
          key: 'magnification',
          label: 'Max Magnification',
          labelAr: 'أقصى تكبير',
          value: '0.24x'
        }
      ]
    },
    {
      label: 'Physical',
      labelAr: 'المواصفات الفيزيائية',
      icon: 'ruler',
      priority: 3,
      specs: [
        {
          key: 'weight',
          label: 'Weight',
          labelAr: 'الوزن',
          value: '886g',
          type: 'range',
          rangePercent: 55
        },
        {
          key: 'dimensions',
          label: 'Dimensions',
          labelAr: 'الأبعاد',
          value: '87.6 × 119.9mm (⌀ × L)'
        },
        {
          key: 'filterThread',
          label: 'Filter Thread',
          labelAr: 'قطر الفلتر',
          value: '82mm'
        },
        {
          key: 'weather',
          label: 'Weather Sealed',
          labelAr: 'مقاومة للعوامل',
          value: 'Yes',
          type: 'boolean'
        }
      ]
    }
  ]
};

/**
 * ============================================================================
 * AUDIO
 * ============================================================================
 */

export const testAudioSennheiser: StructuredSpecifications = {
  highlights: [
    {
      icon: 'star',
      label: 'Type',
      value: 'Shotgun',
      sublabel: 'Super-Cardioid'
    },
    {
      icon: 'gauge',
      label: 'Frequency',
      value: '40Hz-20kHz',
      sublabel: 'Wide Range'
    },
    {
      icon: 'zap',
      label: 'Max SPL',
      value: '132 dB',
      sublabel: 'High Output'
    },
    {
      icon: 'scale',
      label: 'Weight',
      value: '115g',
      sublabel: 'Lightweight'
    }
  ],
  quickSpecs: [
    { icon: 'star', label: 'Pattern', value: 'Super-Cardioid' },
    { icon: 'cable', label: 'Output', value: 'XLR-3' },
    { icon: 'zap', label: 'Phantom', value: '48V' },
    { icon: 'ruler', label: 'Length', value: '280mm' }
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
          label: 'Microphone Type',
          labelAr: 'نوع الميكروفون',
          value: 'Shotgun Condenser',
          highlight: true
        },
        {
          key: 'pattern',
          label: 'Polar Pattern',
          labelAr: 'نمط الالتقاط',
          value: 'Super-Cardioid / Lobar',
          highlight: true
        },
        {
          key: 'frequency',
          label: 'Frequency Response',
          labelAr: 'نطاق التردد',
          value: '40Hz - 20kHz'
        },
        {
          key: 'spl',
          label: 'Max SPL',
          labelAr: 'أقصى SPL',
          value: '132 dB',
          highlight: true
        }
      ]
    },
    {
      label: 'Connectivity',
      labelAr: 'الاتصال',
      icon: 'cable',
      priority: 2,
      specs: [
        {
          key: 'output',
          label: 'Output',
          labelAr: 'المخرج',
          value: 'XLR-3 (Male)'
        },
        {
          key: 'phantom',
          label: 'Phantom Power',
          labelAr: 'الطاقة الوهمية',
          value: 'Yes',
          type: 'boolean'
        },
        {
          key: 'phantomV',
          label: 'Phantom Voltage',
          labelAr: 'فولت الطاقة الوهمية',
          value: '48V ± 4V'
        }
      ]
    },
    {
      label: 'Physical',
      labelAr: 'المواصفات الفيزيائية',
      icon: 'ruler',
      priority: 3,
      specs: [
        {
          key: 'weight',
          label: 'Weight',
          labelAr: 'الوزن',
          value: '115g',
          type: 'range',
          rangePercent: 25
        },
        {
          key: 'dimensions',
          label: 'Dimensions',
          labelAr: 'الأبعاد',
          value: '280 × 20mm (L × ⌀)'
        },
        {
          key: 'mount',
          label: 'Mount Type',
          labelAr: 'نوع التثبيت',
          value: 'Camera Shoe / MZW 60-1'
        }
      ]
    }
  ]
};

/**
 * ============================================================================
 * TRIPODS
 * ============================================================================
 */

export const testTripodManfrotto: StructuredSpecifications = {
  highlights: [
    {
      icon: 'scale',
      label: 'Max Load',
      value: '12 kg',
      sublabel: 'Heavy Duty'
    },
    {
      icon: 'ruler',
      label: 'Max Height',
      value: '180 cm',
      sublabel: 'Extended'
    },
    {
      icon: 'scale',
      label: 'Weight',
      value: '2.5 kg',
      sublabel: 'Portable'
    },
    {
      icon: 'star',
      label: 'Material',
      value: 'Aluminum',
      sublabel: 'Durable'
    }
  ],
  quickSpecs: [
    { icon: 'scale', label: 'Max Load', value: '12kg' },
    { icon: 'ruler', label: 'Height', value: '60-180cm' },
    { icon: 'star', label: 'Sections', value: '4-section' },
    { icon: 'camera', label: 'Quick Release', value: 'Arca-Swiss' }
  ],
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
          value: '12 kg',
          highlight: true,
          type: 'range',
          rangePercent: 75
        },
        {
          key: 'maxHeight',
          label: 'Max Height',
          labelAr: 'أقصى ارتفاع',
          value: '180 cm',
          highlight: true
        },
        {
          key: 'minHeight',
          label: 'Min Height',
          labelAr: 'أقل ارتفاع',
          value: '60 cm'
        },
        {
          key: 'legSections',
          label: 'Leg Sections',
          labelAr: 'أقسام الأرجل',
          value: '4-section'
        }
      ]
    },
    {
      label: 'Head & Mount',
      labelAr: 'الرأس والتثبيت',
      icon: 'camera',
      priority: 2,
      specs: [
        {
          key: 'headType',
          label: 'Head Type',
          labelAr: 'نوع الرأس',
          value: 'Ball Head with Arca-Swiss'
        },
        {
          key: 'mount',
          label: 'Quick Release',
          labelAr: 'التحرير السريع',
          value: 'Arca-Swiss Compatible'
        },
        {
          key: 'panTilt',
          label: 'Pan/Tilt',
          labelAr: 'الدوران/الإمالة',
          value: '360° Pan / -30° to +90° Tilt'
        }
      ]
    },
    {
      label: 'Physical',
      labelAr: 'المواصفات الفيزيائية',
      icon: 'ruler',
      priority: 3,
      specs: [
        {
          key: 'weight',
          label: 'Weight',
          labelAr: 'الوزن',
          value: '2.5 kg',
          type: 'range',
          rangePercent: 40
        },
        {
          key: 'folded',
          label: 'Folded Length',
          labelAr: 'الطول المطوي',
          value: '66 cm'
        },
        {
          key: 'material',
          label: 'Material',
          labelAr: 'المادة',
          value: 'Aluminum Alloy'
        }
      ]
    }
  ]
};

/**
 * ============================================================================
 * MONITORS
 * ============================================================================
 */

export const testMonitorAtomosNinja: StructuredSpecifications = {
  highlights: [
    {
      icon: 'monitor',
      label: 'Screen',
      value: '7"',
      sublabel: 'IPS Touchscreen'
    },
    {
      icon: 'star',
      label: 'Resolution',
      value: '1920×1200',
      sublabel: 'Full HD+'
    },
    {
      icon: 'sun',
      label: 'Brightness',
      value: '1000 nits',
      sublabel: 'High Bright'
    },
    {
      icon: 'hard-drive',
      label: 'Recording',
      value: 'ProRes',
      sublabel: 'Up to 4K60p'
    }
  ],
  quickSpecs: [
    { icon: 'monitor', label: 'Size', value: '7" IPS' },
    { icon: 'sun', label: 'Brightness', value: '1000 nits' },
    { icon: 'cable', label: 'HDMI', value: '4K60p' },
    { icon: 'hard-drive', label: 'Record', value: 'ProRes / DNx' }
  ],
  groups: [
    {
      label: 'Key Specs',
      labelAr: 'المواصفات الرئيسية',
      icon: 'monitor',
      priority: 1,
      specs: [
        {
          key: 'size',
          label: 'Screen Size',
          labelAr: 'حجم الشاشة',
          value: '7" IPS Touchscreen',
          highlight: true
        },
        {
          key: 'resolution',
          label: 'Resolution',
          labelAr: 'الدقة',
          value: '1920 × 1200 (16:10)',
          highlight: true
        },
        {
          key: 'brightness',
          label: 'Brightness',
          labelAr: 'السطوع',
          value: '1000 nits',
          type: 'range',
          rangePercent: 80,
          highlight: true
        },
        {
          key: 'aspectRatio',
          label: 'Aspect Ratio',
          labelAr: 'نسبة الأبعاد',
          value: '16:10 (Native), 16:9, 2.39:1'
        }
      ]
    },
    {
      label: 'Display',
      labelAr: 'الشاشة',
      icon: 'monitor',
      priority: 2,
      specs: [
        {
          key: 'panelType',
          label: 'Panel Type',
          labelAr: 'نوع اللوحة',
          value: 'IPS'
        },
        {
          key: 'touchscreen',
          label: 'Touchscreen',
          labelAr: 'شاشة لمس',
          value: 'Yes',
          type: 'boolean'
        },
        {
          key: 'colorGamut',
          label: 'Color Gamut',
          labelAr: 'مجال الألوان',
          value: '100% sRGB, 95% DCI-P3'
        }
      ]
    },
    {
      label: 'Connectivity',
      labelAr: 'الاتصال',
      icon: 'cable',
      priority: 3,
      specs: [
        {
          key: 'hdmi',
          label: 'HDMI',
          labelAr: 'HDMI',
          value: 'HDMI 2.0 In/Out (4K60p)'
        },
        {
          key: 'sdi',
          label: 'SDI',
          labelAr: 'SDI',
          value: 'No',
          type: 'boolean'
        },
        {
          key: 'usb',
          label: 'USB',
          labelAr: 'USB',
          value: 'USB-C (Accessories)'
        }
      ]
    },
    {
      label: 'Power & Physical',
      labelAr: 'الطاقة والمواصفات الفيزيائية',
      icon: 'zap',
      priority: 4,
      specs: [
        {
          key: 'power',
          label: 'Power Input',
          labelAr: 'مدخل الطاقة',
          value: 'DC 12V / Sony L-Series Battery'
        },
        {
          key: 'battery',
          label: 'Battery Mount',
          labelAr: 'حامل البطارية',
          value: 'Yes',
          type: 'boolean'
        },
        {
          key: 'weight',
          label: 'Weight',
          labelAr: 'الوزن',
          value: '360g (monitor only)',
          type: 'range',
          rangePercent: 30
        }
      ]
    }
  ]
};

/**
 * ============================================================================
 * EXPORT ALL
 * ============================================================================
 */

export const allTestData = {
  camera: testCameraSonyA7SIII,
  lighting: testLightingARRISkyPanel,
  lens: testLensSonyGM,
  audio: testAudioSennheiser,
  tripod: testTripodManfrotto,
  monitor: testMonitorAtomosNinja
};
