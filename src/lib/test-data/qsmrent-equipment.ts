/**
 * Test equipment data scraped from https://www.qsmrent.com/en/shop
 * Used for: equipment catalog tests, Build Your Kit wizard, AI assist recommendations.
 * Source: QSM Rent (5 pages, 100 items). Prices in SAR/day.
 */

export const QSM_RENT_SOURCE = 'https://www.qsmrent.com/en/shop' as const

/** Category slugs that exist in FlixCam seed (prisma/seed.ts CATEGORIES) */
export const QSM_CATEGORY_MAP = {
  cameras: 'cameras',
  lenses: 'lenses',
  lighting: 'lighting',
  'light-accessories': 'light-accessories',
  'camera-accessories': 'camera-accessories',
  tripods: 'tripods-gimbals',
  monitors: 'monitors',
  audio: 'audio',
  'batteries-power': 'batteries-power',
  grip: 'grip',
  filters: 'camera-accessories',
  'sound-equipment': 'audio',
  cables: 'camera-accessories',
  crew: 'grip', // طاقم عمل / crew – map to grip or generic
  cinematic: 'camera-accessories',
  offers: 'cameras',
  lights: 'lighting',
} as const

export interface QsmRentEquipmentItem {
  /** Display name (English + Arabic where from source) */
  name: string
  /** Price in SAR per day */
  dailyPriceSar: number
  /** FlixCam category slug for catalog/kit builder */
  categorySlug: string
  /** FlixCam brand slug if identifiable */
  brandSlug?: string
  /** Optional short description for AI/display */
  description?: string
}

/**
 * All 100 equipment items from QSM Rent shop (pages 1–5).
 * Use for: seeding test DB, kit builder fixtures, AI recommendation tests.
 */
export const QSMRENT_EQUIPMENT: QsmRentEquipmentItem[] = [
  // ----- Page 1 -----
  { name: 'HZ-400 Haze Machine هيز', dailyPriceSar: 389, categorySlug: 'light-accessories', brandSlug: 'generic' },
  { name: 'Aputure Light Dome Mini II دووم ميني', dailyPriceSar: 50, categorySlug: 'light-accessories', brandSlug: 'aputure' },
  { name: 'Canon EF 50mm f/1.2L USM كانون', dailyPriceSar: 150, categorySlug: 'lenses', brandSlug: 'canon' },
  { name: 'Duclos 1.7x Expander محول', dailyPriceSar: 400, categorySlug: 'camera-accessories', brandSlug: 'generic' },
  { name: 'Aputure Light Storm C600x Pro LED Light Kit إضاءة', dailyPriceSar: 325, categorySlug: 'lighting', brandSlug: 'aputure' },
  { name: 'Impact Safety Cable', dailyPriceSar: 25, categorySlug: 'camera-accessories', brandSlug: 'generic' },
  { name: 'Sony A7S III سوني', dailyPriceSar: 298, categorySlug: 'cameras', brandSlug: 'sony' },
  { name: 'Inovativ Voyager 36 NXT Camera Cart', dailyPriceSar: 250, categorySlug: 'grip', brandSlug: 'generic' },
  { name: 'Aputure 2-Bay Battery Power Station (V-Mount) أدابتر بطارية إضاءة', dailyPriceSar: 75, categorySlug: 'batteries-power', brandSlug: 'aputure' },
  { name: 'Aputure Space Light سبيس لايت', dailyPriceSar: 25, categorySlug: 'light-accessories', brandSlug: 'aputure' },
  { name: 'Canon Fisheye EF 15mm f/2.8 Autofocus', dailyPriceSar: 150, categorySlug: 'lenses', brandSlug: 'canon' },
  { name: 'Sony FX3 سوني', dailyPriceSar: 400, categorySlug: 'cameras', brandSlug: 'sony' },
  { name: 'Director of Photography مدير تصوير وإضاءة', dailyPriceSar: 5000, categorySlug: 'grip', description: 'Crew / DP service' },
  { name: 'GoPro HERO12 Black 5.3K قوبرو', dailyPriceSar: 100, categorySlug: 'cameras', brandSlug: 'generic' },
  { name: 'Insta360 ONE RS 1-inch camera', dailyPriceSar: 159, categorySlug: 'cameras', brandSlug: 'generic' },
  { name: 'Blackmagic Design URSA Mini Pro 12K', dailyPriceSar: 500, categorySlug: 'cameras', brandSlug: 'blackmagic' },
  { name: 'Sony FE 70-200mm f/2.8 GM OSS II Lens سوني', dailyPriceSar: 200, categorySlug: 'lenses', brandSlug: 'sony' },
  { name: 'Tiffen 82mm Black Pro-Mist 1/8 Filter', dailyPriceSar: 100, categorySlug: 'camera-accessories', brandSlug: 'tiffen' },
  { name: 'Half Grip / Light Controls معدات', dailyPriceSar: 675, categorySlug: 'grip', brandSlug: 'generic' },
  { name: 'Tiffen VND 82mm', dailyPriceSar: 25, categorySlug: 'camera-accessories', brandSlug: 'tiffen' },
  // ----- Page 2 -----
  { name: 'Sony FX6 سوني', dailyPriceSar: 775, categorySlug: 'cameras', brandSlug: 'sony' },
  { name: 'Tiffen VND 77mm', dailyPriceSar: 75, categorySlug: 'camera-accessories', brandSlug: 'tiffen' },
  { name: 'Avenger A4050CS 16.4\' Steel Boom Stand 50 (Chrome-plated) بوم ستاند', dailyPriceSar: 100, categorySlug: 'grip', brandSlug: 'generic' },
  { name: 'Profoto B10 OCF Flash فلاش', dailyPriceSar: 300, categorySlug: 'lighting', brandSlug: 'generic' },
  { name: 'Aputure Lantern', dailyPriceSar: 50, categorySlug: 'light-accessories', brandSlug: 'aputure' },
  { name: 'Tilta Speed Rail Car Mounting Kit', dailyPriceSar: 799, categorySlug: 'grip', brandSlug: 'tilta' },
  { name: 'YoloLiv YoloBox Ultra Portable Multicamera Encoder/Streamer, Switcher/Monitor & Recorder جهاز بث', dailyPriceSar: 299, categorySlug: 'monitors', brandSlug: 'generic' },
  { name: 'Sirui T2.9 1.6x Full-Frame Anamorphic 4-Lens Set (35/50/75/100mm, E-Mount) عدسات أنامورفيك', dailyPriceSar: 750, categorySlug: 'lenses', brandSlug: 'generic' },
  { name: 'Tiffen 82mm Circular Polarizing Filter', dailyPriceSar: 50, categorySlug: 'camera-accessories', brandSlug: 'tiffen' },
  { name: 'Chrosziel 805-03 Matte Box', dailyPriceSar: 200, categorySlug: 'camera-accessories', brandSlug: 'generic' },
  { name: 'Manfrotto 502AH 7KG ترايبود', dailyPriceSar: 100, categorySlug: 'tripods-gimbals', brandSlug: 'generic' },
  { name: 'Tilta matte-box mini clamp-on', dailyPriceSar: 100, categorySlug: 'camera-accessories', brandSlug: 'tilta' },
  { name: 'The LightBridge CRLS C-Drive Kit with Flight Case', dailyPriceSar: 800, categorySlug: 'lighting', brandSlug: 'generic' },
  { name: 'SWIT 140Wh Pocket Battery (V-Mount)', dailyPriceSar: 300, categorySlug: 'batteries-power', brandSlug: 'swit' },
  { name: 'Impact Folding Wheeled Base Stand ستاند شاشة 17 انش', dailyPriceSar: 100, categorySlug: 'grip', brandSlug: 'generic' },
  { name: 'Nanlux Octagonal Softbox for Evoke LED Light 150Cm سوفت بوكس نانلكس', dailyPriceSar: 89, categorySlug: 'light-accessories', brandSlug: 'nanlux' },
  { name: 'Tiffen 4x5.65 Black Pro-Mist 1/8 Filter فلتر ثُمُن', dailyPriceSar: 100, categorySlug: 'camera-accessories', brandSlug: 'tiffen' },
  { name: 'Kupo 546M K Stand Junior Boom Stand بوم ستاند', dailyPriceSar: 100, categorySlug: 'grip', brandSlug: 'generic' },
  { name: 'كيس رمل 12 كجم (Sand bag 12kg)', dailyPriceSar: 25, categorySlug: 'grip', brandSlug: 'generic' },
  { name: 'Nanlux Fresnel Lens', dailyPriceSar: 100, categorySlug: 'light-accessories', brandSlug: 'nanlux' },
  // ----- Page 3 -----
  { name: 'Tiffen 4 x 5" Gold Diffusion/FX 1 Filter', dailyPriceSar: 100, categorySlug: 'camera-accessories', brandSlug: 'tiffen' },
  { name: 'Tiffen IRND 4 x 5.65" Kit عدد 4 فلاتر', dailyPriceSar: 300, categorySlug: 'camera-accessories', brandSlug: 'tiffen' },
  { name: 'سيارة نقل معدات إضاءة (Lighting equipment transport vehicle)', dailyPriceSar: 750, categorySlug: 'grip', brandSlug: 'generic' },
  { name: 'Tiffen 77mm Circular Polarizing Filter', dailyPriceSar: 50, categorySlug: 'camera-accessories', brandSlug: 'tiffen' },
  { name: 'Blackmagic Design Pocket Cinema Camera 6K', dailyPriceSar: 250, categorySlug: 'cameras', brandSlug: 'blackmagic' },
  { name: 'RODE NT1 5th Gen Condenser XLR/USB Microphone بود كاست باكج', dailyPriceSar: 400, categorySlug: 'audio', brandSlug: 'rode' },
  { name: 'Sony FE 24mm f/1.8 G سوني', dailyPriceSar: 150, categorySlug: 'lenses', brandSlug: 'sony' },
  { name: 'Aputure NOVA P300c RGBWW LED Panel', dailyPriceSar: 300, categorySlug: 'lighting', brandSlug: 'aputure' },
  { name: 'Sirui Jupiter Full-Frame Macro Cine 5-Lens Kit (ARRI PL)', dailyPriceSar: 499, categorySlug: 'lenses', brandSlug: 'generic' },
  { name: 'SmallHD 703 Bolt Director\'s Monitor', dailyPriceSar: 750, categorySlug: 'monitors', brandSlug: 'generic' },
  { name: 'Sony Studio Headphones MDR7506', dailyPriceSar: 75, categorySlug: 'audio', brandSlug: 'sony' },
  { name: 'Rode Wireless GO II', dailyPriceSar: 99, categorySlug: 'audio', brandSlug: 'rode' },
  { name: 'Sennheiser مايك يد (Handheld mic)', dailyPriceSar: 139, categorySlug: 'audio', brandSlug: 'sennheiser' },
  { name: 'عرض الأسبوع FX3 (نسخة)', dailyPriceSar: 25, categorySlug: 'cameras', description: 'Weekly offer FX3' },
  { name: 'Manfrotto 504 75mm 12KG ترايبود', dailyPriceSar: 150, categorySlug: 'tripods-gimbals', brandSlug: 'generic' },
  { name: 'Tiffen Multi Rota Tray with 138mm Circular Polarizer', dailyPriceSar: 100, categorySlug: 'camera-accessories', brandSlug: 'tiffen' },
  { name: 'Canon EF 100mm f/2.8L IS USM Macro', dailyPriceSar: 150, categorySlug: 'lenses', brandSlug: 'canon' },
  { name: 'Rode VideoMic NTG Hybrid Analog/USB Camera-Mount Shotgun Microphone مايك', dailyPriceSar: 100, categorySlug: 'audio', brandSlug: 'rode' },
  { name: 'GoPro HERO9 Black 5K', dailyPriceSar: 89, categorySlug: 'cameras', brandSlug: 'generic' },
  { name: 'Aputure Fresnel 2X Attachment', dailyPriceSar: 50, categorySlug: 'light-accessories', brandSlug: 'aputure' },
  // ----- Page 4 -----
  { name: 'Sony FE 35mm f/1.4 GM سوني', dailyPriceSar: 175, categorySlug: 'lenses', brandSlug: 'sony' },
  { name: 'Canon C500 Mark II 5.9K', dailyPriceSar: 699, categorySlug: 'cameras', brandSlug: 'canon' },
  { name: 'Sound Engineer مهندس صوت', dailyPriceSar: 2000, categorySlug: 'audio', description: 'Crew / sound engineer' },
  { name: 'Canon EF 600mm f/4 L IS II USM كانون', dailyPriceSar: 500, categorySlug: 'lenses', brandSlug: 'canon' },
  { name: 'SmallHD Cine 7 Bolt TX Monitor شاشة مرسل', dailyPriceSar: 400, categorySlug: 'monitors', brandSlug: 'generic' },
  { name: 'Laowa 24mm f/14 2X Macro Probe PL Cine ماكرو', dailyPriceSar: 250, categorySlug: 'lenses', brandSlug: 'laowa' },
  { name: 'Metabones Adapter for ARRI PL-Mount to Sony E-Mount محول', dailyPriceSar: 200, categorySlug: 'camera-accessories', brandSlug: 'generic' },
  { name: 'Canon EF 11-24mm f/4L USM كانون', dailyPriceSar: 175, categorySlug: 'lenses', brandSlug: 'canon' },
  { name: 'NiSi 4 x 5.65" Linear Polarizer Filter', dailyPriceSar: 100, categorySlug: 'camera-accessories', brandSlug: 'generic' },
  { name: 'Manfrotto Small Pro Scrim All-in-One Kit (3.6 x 3.6\')', dailyPriceSar: 50, categorySlug: 'light-accessories', brandSlug: 'generic' },
  { name: 'EasyRig Cinema 3 400N with 5" Arm 17-24 lbs', dailyPriceSar: 300, categorySlug: 'tripods-gimbals', brandSlug: 'easyrig' },
  { name: 'Canon EF 70-200mm f/2.8L IS III USM كانون', dailyPriceSar: 175, categorySlug: 'lenses', brandSlug: 'canon' },
  { name: 'Canon EF 85mm f/1.4L IS USM كانون', dailyPriceSar: 150, categorySlug: 'lenses', brandSlug: 'canon' },
  { name: 'Canon RF 28-70mm f/2L USM Lens كانون', dailyPriceSar: 250, categorySlug: 'lenses', brandSlug: 'canon' },
  { name: 'Sigma 18-35mm + 50-100mm F1.8 EF Mount', dailyPriceSar: 175, categorySlug: 'lenses', brandSlug: 'sigma' },
  { name: 'Canon EF 300mm f/4L IS USM كانون', dailyPriceSar: 150, categorySlug: 'lenses', brandSlug: 'canon' },
  { name: 'Canon TS-E 24mm f/3.5L Tilt-Shift', dailyPriceSar: 200, categorySlug: 'lenses', brandSlug: 'canon' },
  { name: 'Canon EF 35mm f/1.4L II USM كانون', dailyPriceSar: 150, categorySlug: 'lenses', brandSlug: 'canon' },
  { name: 'Tiffen 77mm Variable Neutral Density Filter فلتر', dailyPriceSar: 75, categorySlug: 'camera-accessories', brandSlug: 'tiffen' },
  { name: 'Aputure INFINIBAR PB12 RGB LED Light Panel 8-Light Kit 120cm', dailyPriceSar: 650, categorySlug: 'lighting', brandSlug: 'aputure' },
  // ----- Page 5 -----
  { name: 'Teradek Bolt 500 SDI/HDMI Video Tx/2Rx Transceiver 1:2 Set ترداك', dailyPriceSar: 300, categorySlug: 'camera-accessories', brandSlug: 'teradek' },
  { name: 'Sigma 18-35mm + 50-100mm T2.0 EF Mount', dailyPriceSar: 500, categorySlug: 'lenses', brandSlug: 'sigma' },
  { name: 'Canon EF 100-400mm f/4.5-5.6L IS II USM', dailyPriceSar: 200, categorySlug: 'lenses', brandSlug: 'canon' },
  { name: 'Canon EF 14mm f/2.8L II USM كانون', dailyPriceSar: 175, categorySlug: 'lenses', brandSlug: 'canon' },
  { name: 'Canon EF 135mm f/2.0L USM كانون', dailyPriceSar: 150, categorySlug: 'lenses', brandSlug: 'canon' },
  { name: 'Canon EF 16-35mm f/2.8L III USM', dailyPriceSar: 175, categorySlug: 'lenses', brandSlug: 'canon' },
  { name: 'Tiffen 4 x 5" Gold Diffusion/FX 2 Filter', dailyPriceSar: 100, categorySlug: 'camera-accessories', brandSlug: 'tiffen' },
  { name: 'Sachtler FSB 8 75mm 10KG', dailyPriceSar: 175, categorySlug: 'tripods-gimbals', brandSlug: 'generic' },
  { name: 'Tilta MB-T12 Matte Box ماتبوكس', dailyPriceSar: 200, categorySlug: 'camera-accessories', brandSlug: 'tilta' },
  { name: 'Tiffen 4 x 5.65" Warm Soft/FX 1', dailyPriceSar: 100, categorySlug: 'camera-accessories', brandSlug: 'tiffen' },
  { name: 'Blackmagic Design ATEM Mini Extreme ISO', dailyPriceSar: 250, categorySlug: 'monitors', brandSlug: 'blackmagic' },
  { name: 'Atomos NEON 17" 4K HDR Monitor/Recorder شاشة', dailyPriceSar: 350, categorySlug: 'monitors', brandSlug: 'atomos' },
  { name: 'Manfrotto Chromakey Collapsible Background - 270x180cm - Green كروما', dailyPriceSar: 59, categorySlug: 'light-accessories', brandSlug: 'generic' },
  { name: 'HDMI Cable 15m', dailyPriceSar: 50, categorySlug: 'camera-accessories', brandSlug: 'generic' },
  { name: 'SmallHD FOCUS 7 Bolt 500 RX Monitor شاشة مستقبل', dailyPriceSar: 300, categorySlug: 'monitors', brandSlug: 'generic' },
  { name: 'Teradek Serv Pro ترداك', dailyPriceSar: 750, categorySlug: 'camera-accessories', brandSlug: 'teradek' },
  { name: 'ARRI SkyPanel S120-C LED إضاءة', dailyPriceSar: 500, categorySlug: 'lighting', brandSlug: 'arri' },
  { name: 'Full Grip / Light Controls معدات', dailyPriceSar: 950, categorySlug: 'grip', brandSlug: 'generic' },
  { name: 'Tiffen 4 x 5.65" Graduated Sunset 2/3 Filters فلترين', dailyPriceSar: 200, categorySlug: 'camera-accessories', brandSlug: 'tiffen' },
  { name: 'Tiffen 4 x 5.65" Ultra Contrast 1/2 فلتر', dailyPriceSar: 100, categorySlug: 'camera-accessories', brandSlug: 'tiffen' },
]

/** Count by category for tests / UI */
export function getQsmRentCountByCategory(): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const item of QSMRENT_EQUIPMENT) {
    counts[item.categorySlug] = (counts[item.categorySlug] ?? 0) + 1
  }
  return counts
}
