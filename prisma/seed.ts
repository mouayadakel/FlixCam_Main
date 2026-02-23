/**
 * @file seed.ts
 * @description Comprehensive database seed with full FlixCam inventory from Excel,
 *              real product data, specifications, prices, and real product images.
 * @module prisma/seed
 */

import {
  PrismaClient,
  EquipmentCondition,
  FeatureFlagScope,
  NotificationChannel,
  BudgetTier,
  TranslationLocale,
} from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import {
  TERMS_TITLE_AR,
  TERMS_TITLE_EN,
  TERMS_BODY_AR,
  TERMS_BODY_EN,
} from '../scripts/data/terms-policy-body'

const prisma = new PrismaClient()

// ============================================
// EQUIPMENT DATA DEFINITIONS
// ============================================

interface EquipmentSeedData {
  sku: string
  model: string
  categorySlug: string
  brandSlug: string
  condition: EquipmentCondition
  quantityTotal: number
  quantityAvailable: number
  dailyPrice: number
  weeklyPrice?: number
  monthlyPrice?: number
  featured: boolean
  isActive: boolean
  warehouseLocation: string
  barcode: string
  budgetTier?: BudgetTier
  /** Flat: Record<string, string>. Structured: { highlights?, quickSpecs?, groups } */
  specifications?: Record<string, unknown>
  boxContents?: string
  imageUrl: string
}

// ============================================
// REAL PRODUCT IMAGE URLS (Manufacturer CDNs)
// ============================================

const IMAGES = {
  // Cameras
  sonyA7S3:
    'https://d1ncau8tqf99kp.cloudfront.net/converted/149047_original_local_1200x1050_v3_converted.webp',
  sonyA7R5:
    'https://d1ncau8tqf99kp.cloudfront.net/converted/169563_original_local_1200x1050_v3_converted.webp',
  brinno: 'https://bfrcdn.bfrreview.com/img/brinno/brinno-bcc200-body-only.jpg',

  // Camera Accessories
  ikanHandle: 'https://ikancorp.com/wp-content/uploads/2021/04/HB-DRS-1.jpg',
  teradekBolt6: 'https://teradek.com/cdn/shop/files/Bolt6_Family_Hero_1200x.jpg',
  tiltaNucleusM:
    'https://cdn.tilta.com/wp-content/uploads/2017/07/01050312/WLC-T03-K5_01_legacy2.jpg',
  directorCage:
    'https://cdn.shopify.com/s/files/1/0012/6971/2544/products/directors-monitor-cage-v2_1200x.jpg',
  sekonicC800: 'https://www.sekonic.com/portals/0/Images/products/C-800/gallery/c800_01.jpg',
  sonyCfexReader:
    'https://d1ncau8tqf99kp.cloudfront.net/converted/107990_original_local_1200x1050_v3_converted.webp',
  polarProFilter: 'https://cdn.shopify.com/s/files/1/0745/1032/products/PMVND-82-6-9_1200x.jpg',
  tiffenFilter: 'https://tiffen.com/cdn/shop/files/W82BPM14_1200x.jpg',
  schneiderFilter:
    'https://schneideroptics.com/wp-content/uploads/2023/01/hollywood-black-magic-filter.jpg',
  revarCinePola: 'https://revarcine.com/wp-content/uploads/2021/03/rota-pola-138mm.jpg',
  tiltaMatteBox:
    'https://cdn.tilta.com/wp-content/uploads/2022/11/28190000/MB-T16_angle1_legacy2.jpg',
  cameraSaddle: 'https://www.rmcinema.com/wp-content/uploads/2021/05/camera-saddle-main.jpg',

  // Lenses
  arriUltraPrime:
    'https://www.arri.com/resource/image/34170/landscape_ratio1x0_418/1680/706/fce01b656de62026bde471f95ca75be9/32CDE49E8105DE1477287516A04D11DB/lenses-ultra-primes-overview-image.jpg',
  dzofilmPictor: 'https://www.dzofilm.com/Public/Uploads/Products/2022-06-09/62a1ea4f3b2ed.jpg',
  sigma2470: 'https://www.sigma-global.com/common/products/lenses/a021/a021_main.jpg',
  sigma135: 'https://www.sigma-global.com/common/products/lenses/a017/a017_main.jpg',
  sigma50: 'https://www.sigma-global.com/common/products/lenses/a020/a020_main.jpg',
  sigma35: 'https://www.sigma-global.com/common/products/lenses/a040/a040_main.jpg',
  sigma1424: 'https://www.sigma-global.com/common/products/lenses/a018/a018_main.jpg',
  laowa12:
    'https://www.venuslens.net/wp-content/uploads/2021/07/Laowa-12mm-T2.9-Zero-D-Cine-01.jpg',
  sonyGM90:
    'https://d1ncau8tqf99kp.cloudfront.net/converted/102430_original_local_1200x1050_v3_converted.webp',

  // Tripods & Gimbals
  djiRS4Pro: 'https://dji-official-fe.djicdn.com/dps/bef24b413e60bb8f23cf81bec27f5837.png',
  tiltaSlider:
    'https://cdn.tilta.com/wp-content/uploads/2022/07/28200000/TSS-T01_angle1_legacy2.jpg',
  tiltaFloat: 'https://cdn.tilta.com/wp-content/uploads/2022/03/28214240/GSS-T02_main_legacy2.jpg',
  tiltaHydra:
    'https://cdn.tilta.com/wp-content/uploads/2023/01/28192500/HDA-T08-A-V_angle66_legacy2.jpg',
  flycamFlowline: 'https://www.flycam.com/wp-content/uploads/2020/09/flowline-master-main.jpg',
  easyrigV5:
    'https://easyrig.se/wp-content/uploads/2019/03/Easyrig-Vario-5-Strong-with-Stabil-G2-1-768x576.jpeg',
  benroTripod: 'https://www.benro.com/uploads/product/2022-07-11/product_62cbe4a16fe90.jpg',
  eimageSlider: 'https://www.eimageglobal.com/upload/product/2021-03-18/16160906131.jpg',

  // Lighting
  gvm50rs: 'https://gvm-led.com/wp-content/uploads/2021/05/GVM-50RS-1.jpg',
  mc12Kit:
    'https://cdn.shopify.com/s/files/1/1343/1935/products/mc-12-light-production-kit_1200x.jpg',
  aputure300D: 'https://cdn.shopify.com/s/files/1/1343/1935/files/LS_300d_II.png',
  amaranF22c: 'https://cdn.shopify.com/s/files/1/1343/1935/files/Amaran-F22c_1.png',
  asteraTitan: 'https://media.astera-led.com/wp-content/uploads/FP1_TitanTube_V2.png',
  nanlux1200: 'https://nanlux.com/wp-content/uploads/2022/10/Evoke-1200-1.jpg',
  godoxAD600: 'https://www.godox.com/static/upload/image/20220330/1648605103678905.jpg',
  godoxAD400: 'https://www.godox.com/static/upload/image/20230807/1691388324206646.jpg',
  godoxAD1200: 'https://www.godox.com/static/upload/image/20220117/1642419545185648.jpg',
  aputure600D: 'https://cdn.shopify.com/s/files/1/1343/1935/files/LS-600d-Pro.png',
  aputure600C: 'https://cdn.shopify.com/s/files/1/1343/1935/files/LS600cPro.png',
  lightTubes: 'https://cdn.shopify.com/s/files/1/1343/1935/files/amaran-t2c_1.png',

  // Light Accessories
  lightUmbrella: 'https://cdn.shopify.com/s/files/1/1343/1935/files/Light-Dome-II.png',
  beautyDish: 'https://cdn.shopify.com/s/files/1/1343/1935/files/nova-beauty-dish.png',
  spacelight: 'https://cdn.shopify.com/s/files/1/1343/1935/files/space-light.png',
  fresnel2x: 'https://cdn.shopify.com/s/files/1/1343/1935/files/Fresnel-2X.png',
  fresnelF10: 'https://cdn.shopify.com/s/files/1/1343/1935/files/F10-Fresnel.png',
  spotlightMount: 'https://cdn.shopify.com/s/files/1/1343/1935/files/Spotlight-Mount.png',
  fogMachine: 'https://images-na.ssl-images-amazon.com/images/I/61s4MhK7YcL._AC_SL1200_.jpg',
  greenChroma: 'https://images-na.ssl-images-amazon.com/images/I/31Y1x0sQYiL._AC_.jpg',
  ultrabounce: 'https://www.theragshop.com/cdn/shop/products/8x8-ultrabounce_1200x.jpg',
  silverCloth: 'https://www.theragshop.com/cdn/shop/products/4x4-silver-lame_1200x.jpg',
  whiteCloth: 'https://www.theragshop.com/cdn/shop/products/8x8-bleached-muslin_1200x.jpg',
  muslinCloth: 'https://www.theragshop.com/cdn/shop/products/8x8-unbleached-muslin_1200x.jpg',
  checkerCloth: 'https://www.theragshop.com/cdn/shop/products/8x8-checker-board_1200x.jpg',
  magicCloth: 'https://www.theragshop.com/cdn/shop/products/20x20-magic-cloth_1200x.jpg',

  // Grip
  tubeHolder: 'https://images-na.ssl-images-amazon.com/images/I/51YKN8O-2HL._AC_SL1000_.jpg',
  appleBox: 'https://images-na.ssl-images-amazon.com/images/I/61fQmWCDl8L._AC_SL1500_.jpg',

  // Monitors
  vaxisAtomA5: 'https://www.vaxisglobal.com/wp-content/uploads/2023/05/Atom-A5-hero.jpg',
  atomosNeon24: 'https://www.atomos.com/storage/app/media/products/neon/neon-24/NEON-24-Hero.jpg',

  // Batteries
  blueShapeB290: 'https://blueshape.it/wp-content/uploads/2022/04/BV290HD-GRANITE-TWO-B-mount.jpg',
  switCharger: 'https://www.switpower.com/Public/Uploads/Products/2022-03-18/PC-P461B_1.jpg',

  // Sound
  xlrCable: 'https://images-na.ssl-images-amazon.com/images/I/61Mq5+WLj2L._AC_SL1500_.jpg',
  rodeLink:
    'https://cdn.rode.com/website/images/products/rodelink-filmmaker-kit/rodelink-filmmaker-kit-hero.jpg',
  sennheiserEW: 'https://placehold.co/600x600/png?text=EW+100+G4',
  sennMKE600: 'https://placehold.co/600x600/png?text=MKE+600',
  sennMZX8060: 'https://placehold.co/600x600/png?text=MKH+8060',
  rodeMic:
    'https://cdn.rode.com/website/images/products/videomic-pro-plus/videomic-pro-plus-hero.jpg',
  saramonicXLR9: 'https://saramonic.com/wp-content/uploads/2023/02/blink900-b2-1.jpg',
  zoomF6: 'https://zoomcorp.com/media/images/product-images/f6/hero/zoom-f6-angle.png',
  sennLavGold: 'https://placehold.co/600x600/png?text=Lav+Mic',
  lavMic: 'https://images-na.ssl-images-amazon.com/images/I/51G6Z5gLmNL._AC_SL1000_.jpg',

  // Live & Mixing
  bmUltimatte:
    'https://images.blackmagicdesign.com/images/products/ultimatte/landing/hero/hero-lg.jpg',
  bmAtem4K8:
    'https://images.blackmagicdesign.com/images/products/atemtelevisionstudio/landing/hero/hero-1-lg.jpg',
  autoQ: 'https://autocue.com/wp-content/uploads/2023/05/Starter-Series-Package-1200x1200.jpg',

  // Cases
  hardCase: 'https://images-na.ssl-images-amazon.com/images/I/71OchXDL5PL._AC_SL1500_.jpg',
}

// ============================================
// CATEGORY DEFINITIONS
// ============================================

const CATEGORIES = [
  {
    name: 'Cameras',
    slug: 'cameras',
    description: 'Cinema & mirrorless cameras for film production',
  },
  {
    name: 'Camera Accessories',
    slug: 'camera-accessories',
    description: 'Follow focus, wireless video, filters, matte boxes, and camera support',
  },
  { name: 'Lenses', slug: 'lenses', description: 'Cinema primes, zooms, and photo lenses' },
  {
    name: 'Tripods & Gimbals',
    slug: 'tripods-gimbals',
    description: 'Stabilizers, gimbals, sliders, and camera support systems',
  },
  {
    name: 'Lighting',
    slug: 'lighting',
    description: 'LED panels, COB lights, fresnels, and flash units',
  },
  {
    name: 'Light Accessories',
    slug: 'light-accessories',
    description: 'Modifiers, diffusers, gels, cloths, and fog machines',
  },
  {
    name: 'Audio',
    slug: 'audio',
    description: 'Wireless microphones, boom mics, recorders, and cables',
  },
  {
    name: 'Monitors',
    slug: 'monitors',
    description: 'On-camera monitors, production monitors, and recorders',
  },
  {
    name: 'Batteries & Power',
    slug: 'batteries-power',
    description: 'V-mount, B-mount batteries, chargers, and power distribution',
  },
  {
    name: 'Grip & Support',
    slug: 'grip',
    description: 'C-stands, apple boxes, clamps, and rigging',
  },
  {
    name: 'Cases & Bags',
    slug: 'cases-bags',
    description: 'Hard cases, soft bags, and transport solutions',
  },
  {
    name: 'Live & Mixing',
    slug: 'live-mixing',
    description: 'Video switchers, keyers, teleprompters, and live production',
  },
]

// ============================================
// BRAND DEFINITIONS
// ============================================

const BRANDS = [
  {
    name: 'Sony',
    slug: 'sony',
    description: 'Industry-leading mirrorless cameras and cinema solutions',
  },
  { name: 'Canon', slug: 'canon', description: 'Professional cinema cameras and EF/RF lenses' },
  { name: 'ARRI', slug: 'arri', description: 'Premium cinema cameras and lighting' },
  { name: 'RED', slug: 'red', description: 'High-end digital cinema cameras' },
  {
    name: 'Blackmagic Design',
    slug: 'blackmagic',
    description: 'Cinema cameras, switchers, and post-production tools',
  },
  { name: 'DJI', slug: 'dji', description: 'Gimbals, drones, and camera stabilizers' },
  { name: 'Tilta', slug: 'tilta', description: 'Cinema accessories, rigs, follow focus systems' },
  { name: 'Godox', slug: 'godox', description: 'Professional flash and continuous lighting' },
  { name: 'Aputure', slug: 'aputure', description: 'Premium LED lighting for film production' },
  {
    name: 'Sennheiser',
    slug: 'sennheiser',
    description: 'Professional wireless microphones and audio',
  },
  { name: 'Rode', slug: 'rode', description: 'Microphones and audio solutions for filmmakers' },
  { name: 'Saramonic', slug: 'saramonic', description: 'Wireless audio and microphone systems' },
  { name: 'Sigma', slug: 'sigma', description: 'Art series and cinema lenses' },
  { name: 'DZOFilm', slug: 'dzofilm', description: 'Cinema zoom and prime lenses' },
  { name: 'GVM', slug: 'gvm', description: 'LED video lights and studio lighting' },
  { name: 'Amaran', slug: 'amaran', description: 'Flexible and portable LED lights by Aputure' },
  { name: 'NanLux', slug: 'nanlux', description: 'High-powered cinema LED lights' },
  { name: 'Astera', slug: 'astera', description: 'Wireless LED tubes and pixel effects' },
  { name: 'Sekonic', slug: 'sekonic', description: 'Light meters and color meters' },
  { name: 'Teradek', slug: 'teradek', description: 'Wireless video transmission systems' },
  { name: 'Brinno', slug: 'brinno', description: 'Time-lapse and construction cameras' },
  { name: 'Laowa', slug: 'laowa', description: 'Wide-angle and macro cine lenses' },
  { name: 'FlyCam', slug: 'flycam', description: 'Camera support and stabilization systems' },
  { name: 'Easyrig', slug: 'easyrig', description: 'Ergonomic camera support systems' },
  { name: 'Benro', slug: 'benro', description: 'Tripods, monopods, and camera support' },
  { name: 'E-Image', slug: 'e-image', description: 'Sliders, tripods, and camera support' },
  { name: 'Vaxis', slug: 'vaxis', description: 'Wireless video and on-camera monitors' },
  { name: 'Atomos', slug: 'atomos', description: 'Monitor-recorders and production monitors' },
  { name: 'Blue Shape', slug: 'blue-shape', description: 'Professional cinema batteries' },
  { name: 'Swit', slug: 'swit', description: 'Battery chargers and power solutions' },
  { name: 'Zoom', slug: 'zoom', description: 'Field recorders and audio interfaces' },
  { name: 'Tiffen', slug: 'tiffen', description: 'Camera filters and lens accessories' },
  { name: 'Schneider', slug: 'schneider', description: 'Premium cinema and optical filters' },
  { name: 'PolarPro', slug: 'polarpro', description: 'Variable ND and cinema filters' },
  {
    name: 'Wooden Camera',
    slug: 'wooden-camera',
    description: 'Director cages and cinema accessories',
  },
  { name: 'Ikan', slug: 'ikan', description: 'Cinema accessories and LED lighting' },
  { name: 'ZEISS', slug: 'zeiss', description: 'Premium optical lenses for cinema' },
  { name: 'Autocue', slug: 'autocue', description: 'Professional teleprompter systems' },
  { name: 'Generic', slug: 'generic', description: 'Generic cinema accessories and cables' },
]

// ============================================
// ALL EQUIPMENT FROM INVENTORY EXCEL
// ============================================

const ALL_EQUIPMENT: EquipmentSeedData[] = [
  // ===== CAMERAS =====
  {
    sku: 'CAM-A7S3',
    model: 'Sony Alpha A7S III',
    categorySlug: 'cameras',
    brandSlug: 'sony',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 2,
    quantityAvailable: 2,
    dailyPrice: 350,
    weeklyPrice: 2100,
    monthlyPrice: 7000,
    featured: true,
    isActive: true,
    warehouseLocation: 'A1-01',
    barcode: '10000001',
    budgetTier: BudgetTier.PROFESSIONAL,
    specifications: {
      highlights: [
        { icon: 'camera', label: 'Sensor', value: '12.1MP Full-Frame Exmor R BSI CMOS' },
        { icon: 'video', label: 'Video', value: '4K 120p 10-bit 4:2:2' },
        { icon: 'gauge', label: 'ISO', value: '80-102,400 (Exp: 40-409,600)' },
        { icon: 'monitor', label: 'Mount', value: 'Sony E-Mount' },
      ],
      quickSpecs: [
        { icon: 'star', label: 'Sensor', value: '12.1MP Full-Frame' },
        { icon: 'zap', label: 'Video', value: '4K 120p' },
        { icon: 'ruler', label: 'Weight', value: '699g' },
        { icon: 'hard-drive', label: 'Cards', value: 'Dual CFexpress Type A / SD' },
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
              value: '4K 120p 10-bit 4:2:2',
              highlight: true,
            },
            {
              key: 'iso',
              label: 'ISO Range',
              labelAr: 'نطاق ISO',
              value: '80-102,400 (Exp: 40-409,600)',
              type: 'range',
              rangePercent: 85,
            },
            {
              key: 'autofocus',
              label: 'Autofocus',
              labelAr: 'التركيز التلقائي',
              value: '759-Point Fast Hybrid AF',
            },
            {
              key: 'stabilization',
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
              rangePercent: 25,
            },
            { key: 'dimensions', label: 'Dimensions', labelAr: 'الأبعاد', value: '-' },
            {
              key: 'display',
              label: 'Display',
              labelAr: 'الشاشة',
              value: '3.0" Vari-angle Touchscreen LCD',
            },
            { key: 'evf', label: 'EVF', labelAr: 'المنظار الإلكتروني', value: '9.44M-dot OLED' },
            {
              key: 'mount',
              label: 'Lens Mount',
              labelAr: 'قاعدة العدسة',
              value: 'Sony E-Mount',
              highlight: true,
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
            { key: 'battery', label: 'Battery', labelAr: 'البطارية', value: 'NP-FZ100' },
          ],
        },
      ],
    },
    boxContents:
      'Camera body, 2x Camera battery (NP-FZ100), 2x CFexpress 160GB memory card, 1x Battery charger, Camera tripod plate',
    imageUrl: IMAGES.sonyA7S3,
  },
  {
    sku: 'CAM-A7R5',
    model: 'Sony Alpha A7R V',
    categorySlug: 'cameras',
    brandSlug: 'sony',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 400,
    weeklyPrice: 2400,
    monthlyPrice: 8000,
    featured: true,
    isActive: true,
    warehouseLocation: 'A1-02',
    barcode: '10000002',
    budgetTier: BudgetTier.PREMIUM,
    specifications: {
      sensor: '61MP Full-Frame Exmor R BSI CMOS',
      video: '8K 25p / 4K 60p',
      iso: '100-32,000 (Exp: 50-102,400)',
      autofocus: 'AI-based Real-time Recognition AF',
      stabilization: '5-Axis IBIS (8 stops)',
      mount: 'Sony E-Mount',
      weight: '723g (body only)',
      display: '3.2" Vari-angle Touchscreen LCD',
      evf: '9.44M-dot OLED',
      recording: 'Dual CFexpress Type A / SD UHS-II',
    },
    imageUrl: IMAGES.sonyA7R5,
  },
  {
    sku: 'CAM-BRINNO',
    model: 'Brinno Construction Trio Pack',
    categorySlug: 'cameras',
    brandSlug: 'brinno',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 2,
    quantityAvailable: 2,
    dailyPrice: 150,
    weeklyPrice: 900,
    monthlyPrice: 3000,
    featured: false,
    isActive: true,
    warehouseLocation: 'A1-03',
    barcode: '10000003',
    specifications: {
      type: 'Time-lapse Construction Camera',
      resolution: '1080p HDR',
      battery: 'Up to 163 days',
      weatherproof: 'IPX5',
      fieldOfView: '140°',
    },
    boxContents:
      'Camera, Camera housing (weather-resistant), Cage grip, USB cable, Manual, Battery grip, Safety cable',
    imageUrl: IMAGES.brinno,
  },

  // ===== CAMERA ACCESSORIES =====
  {
    sku: 'ACC-IKAN-HANDLE',
    model: 'Ikan Ronin Circular Handle',
    categorySlug: 'camera-accessories',
    brandSlug: 'ikan',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 2,
    quantityAvailable: 2,
    dailyPrice: 50,
    weeklyPrice: 300,
    featured: false,
    isActive: true,
    warehouseLocation: 'B1-01',
    barcode: '20000001',
    specifications: { compatibility: 'DJI Ronin series', material: 'Aluminum' },
    imageUrl: IMAGES.ikanHandle,
  },
  {
    sku: 'ACC-TERADEK-B6',
    model: 'Teradek Bolt 6 Wireless Transmitter',
    categorySlug: 'camera-accessories',
    brandSlug: 'teradek',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 500,
    weeklyPrice: 3000,
    monthlyPrice: 10000,
    featured: true,
    isActive: true,
    warehouseLocation: 'B1-02',
    barcode: '20000002',
    budgetTier: BudgetTier.PREMIUM,
    specifications: {
      range: 'Up to 750ft / 228m line of sight',
      latency: '<1ms (0-delay mode)',
      resolution: 'Up to 4K HDR',
      protocol: 'Bolt 6 5GHz',
      inputs: 'HDMI, SDI',
      power: '7-17V DC',
    },
    imageUrl: IMAGES.teradekBolt6,
  },
  {
    sku: 'ACC-NUCLEUS-M',
    model: 'Tilta Nucleus-M Wireless Follow Focus',
    categorySlug: 'camera-accessories',
    brandSlug: 'tilta',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 2,
    quantityAvailable: 2,
    dailyPrice: 250,
    weeklyPrice: 1500,
    monthlyPrice: 5000,
    featured: true,
    isActive: true,
    warehouseLocation: 'B1-03',
    barcode: '20000003',
    budgetTier: BudgetTier.PROFESSIONAL,
    specifications: {
      type: 'Wireless FIZ (Focus/Iris/Zoom) System',
      motors: '2x included',
      range: '100m wireless range',
      torque: '1.2N·m motor torque',
      power: 'Rechargeable Li-ion',
    },
    boxContents:
      '2x Tilta Nucleus-M FIZ Motor, 19mm Rod Adapter, 19mm to 15mm Bushing, 2x DSLR Lens Follow Focus Adapter, D-Tap to 7-Pin Motor Power Cable, Motor-to-Motor Connection Cable (21.65"), 2x Follow Focus Marking Disk, Lanyard for Hand Unit, Battery Charger, AC Power Cable',
    imageUrl: IMAGES.tiltaNucleusM,
  },
  {
    sku: 'ACC-DIR-CAGE',
    model: 'Wooden Camera Director Cage',
    categorySlug: 'camera-accessories',
    brandSlug: 'wooden-camera',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 100,
    weeklyPrice: 600,
    featured: false,
    isActive: true,
    warehouseLocation: 'B1-04',
    barcode: '20000004',
    specifications: { compatibility: 'Universal 5"-7" monitors', material: 'Aluminum' },
    boxContents: 'Director Cage, Sun Shader',
    imageUrl: IMAGES.directorCage,
  },
  {
    sku: 'ACC-SEKONIC-C800',
    model: 'Sekonic C-800 SpectroMaster',
    categorySlug: 'camera-accessories',
    brandSlug: 'sekonic',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 150,
    weeklyPrice: 900,
    featured: false,
    isActive: true,
    warehouseLocation: 'B1-05',
    barcode: '20000005',
    specifications: {
      type: 'Spectrometer / Color Meter',
      cct: '1,600K - 40,000K',
      cri: 'CRI, TLCI, TM-30, SSI measurement',
      display: 'Touchscreen LCD',
    },
    boxContents: 'Carrying case, USB cable, C-800 color meter unit',
    imageUrl: IMAGES.sekonicC800,
  },
  {
    sku: 'ACC-CFX-READER',
    model: 'Sony CFexpress Type A Card Reader',
    categorySlug: 'camera-accessories',
    brandSlug: 'sony',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 30,
    weeklyPrice: 180,
    featured: false,
    isActive: true,
    warehouseLocation: 'B1-06',
    barcode: '20000006',
    specifications: { interface: 'USB 3.1 Gen 2 (10Gbps)', format: 'CFexpress Type A / SD UHS-II' },
    boxContents: 'Reader unit, USB-C cable',
    imageUrl: IMAGES.sonyCfexReader,
  },
  {
    sku: 'FILT-PMVND-69',
    model: 'PolarPro Peter McKinnon VND 82mm 6-9 Stops',
    categorySlug: 'camera-accessories',
    brandSlug: 'polarpro',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 2,
    quantityAvailable: 2,
    dailyPrice: 60,
    weeklyPrice: 350,
    featured: false,
    isActive: true,
    warehouseLocation: 'B2-01',
    barcode: '20000007',
    specifications: {
      diameter: '82mm',
      stops: '6-9 stops',
      glass: 'Fused quartz',
      coating: 'Multi-layer anti-reflective',
    },
    imageUrl: IMAGES.polarProFilter,
  },
  {
    sku: 'FILT-PMVND-25',
    model: 'PolarPro Peter McKinnon VND 82mm 2-5 Stops',
    categorySlug: 'camera-accessories',
    brandSlug: 'polarpro',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 50,
    weeklyPrice: 300,
    featured: false,
    isActive: true,
    warehouseLocation: 'B2-02',
    barcode: '20000008',
    specifications: {
      diameter: '82mm',
      stops: '2-5 stops',
      glass: 'Fused quartz',
      coating: 'Multi-layer anti-reflective',
    },
    imageUrl: IMAGES.polarProFilter,
  },
  {
    sku: 'FILT-IR-82',
    model: 'IR Cut Filter 82mm',
    categorySlug: 'camera-accessories',
    brandSlug: 'polarpro',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 40,
    weeklyPrice: 240,
    featured: false,
    isActive: true,
    warehouseLocation: 'B2-03',
    barcode: '20000009',
    specifications: { diameter: '82mm', type: 'Infrared Cut' },
    imageUrl: IMAGES.polarProFilter,
  },
  {
    sku: 'FILT-SOFT-82',
    model: 'Soft Filter 82mm',
    categorySlug: 'camera-accessories',
    brandSlug: 'polarpro',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 40,
    weeklyPrice: 240,
    featured: false,
    isActive: true,
    warehouseLocation: 'B2-04',
    barcode: '20000010',
    specifications: { diameter: '82mm', type: 'Soft diffusion' },
    imageUrl: IMAGES.polarProFilter,
  },
  {
    sku: 'FILT-PEARL-82',
    model: 'Pearlescent 1/4 Filter 82mm',
    categorySlug: 'camera-accessories',
    brandSlug: 'polarpro',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 40,
    weeklyPrice: 240,
    featured: false,
    isActive: true,
    warehouseLocation: 'B2-05',
    barcode: '20000011',
    specifications: { diameter: '82mm', type: 'Pearlescent 1/4 diffusion' },
    imageUrl: IMAGES.polarProFilter,
  },
  {
    sku: 'FILT-PRBLK-72',
    model: 'Pro Black Almite Filter 72mm',
    categorySlug: 'camera-accessories',
    brandSlug: 'polarpro',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 40,
    weeklyPrice: 240,
    featured: false,
    isActive: true,
    warehouseLocation: 'B2-06',
    barcode: '20000012',
    specifications: { diameter: '72mm', type: 'Black Mist / Pro Black' },
    imageUrl: IMAGES.polarProFilter,
  },
  {
    sku: 'ACC-CAM-SADDLE',
    model: 'R&M Camera Saddle',
    categorySlug: 'camera-accessories',
    brandSlug: 'generic',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 30,
    weeklyPrice: 180,
    featured: false,
    isActive: true,
    warehouseLocation: 'B2-07',
    barcode: '20000013',
    specifications: { material: 'Heavy-duty rubber', capacity: 'Up to 15kg' },
    imageUrl: IMAGES.cameraSaddle,
  },
  {
    sku: 'ACC-HIHAT',
    model: 'Hi-Hat Wood Extension',
    categorySlug: 'camera-accessories',
    brandSlug: 'generic',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 30,
    weeklyPrice: 180,
    featured: false,
    isActive: true,
    warehouseLocation: 'B2-08',
    barcode: '20000014',
    specifications: { material: 'Wood', mounting: '100mm Bowl' },
    imageUrl: IMAGES.cameraSaddle,
  },
  {
    sku: 'FILT-ND06-TIF',
    model: 'Tiffen ND 0.6 Filter 4x5.65"',
    categorySlug: 'camera-accessories',
    brandSlug: 'tiffen',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 30,
    weeklyPrice: 180,
    featured: false,
    isActive: true,
    warehouseLocation: 'B3-01',
    barcode: '20000016',
    specifications: { size: '4x5.65"', density: '0.6 (2 stops)', glass: 'Water white' },
    imageUrl: IMAGES.tiffenFilter,
  },
  {
    sku: 'FILT-ND12-TIF',
    model: 'Tiffen ND 1.2 Filter 4x5.65"',
    categorySlug: 'camera-accessories',
    brandSlug: 'tiffen',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 30,
    weeklyPrice: 180,
    featured: false,
    isActive: true,
    warehouseLocation: 'B3-02',
    barcode: '20000017',
    specifications: { size: '4x5.65"', density: '1.2 (4 stops)', glass: 'Water white' },
    imageUrl: IMAGES.tiffenFilter,
  },
  {
    sku: 'FILT-ND09-TIF',
    model: 'Tiffen ND 0.9 Filter 4x5.65"',
    categorySlug: 'camera-accessories',
    brandSlug: 'tiffen',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 30,
    weeklyPrice: 180,
    featured: false,
    isActive: true,
    warehouseLocation: 'B3-03',
    barcode: '20000018',
    specifications: { size: '4x5.65"', density: '0.9 (3 stops)', glass: 'Water white' },
    imageUrl: IMAGES.tiffenFilter,
  },
  {
    sku: 'FILT-BPM14-TIF',
    model: 'Tiffen Black Pro-Mist 1/4 Filter 4x5.65"',
    categorySlug: 'camera-accessories',
    brandSlug: 'tiffen',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 40,
    weeklyPrice: 240,
    featured: false,
    isActive: true,
    warehouseLocation: 'B3-04',
    barcode: '20000019',
    specifications: {
      size: '4x5.65"',
      type: 'Black Pro-Mist 1/4',
      effect: 'Highlight halation, reduced contrast',
    },
    imageUrl: IMAGES.tiffenFilter,
  },
  {
    sku: 'FILT-BPM18-TIF',
    model: 'Tiffen Black Pro-Mist 1/8 Filter 4x5.65"',
    categorySlug: 'camera-accessories',
    brandSlug: 'tiffen',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 40,
    weeklyPrice: 240,
    featured: false,
    isActive: true,
    warehouseLocation: 'B3-05',
    barcode: '20000020',
    specifications: {
      size: '4x5.65"',
      type: 'Black Pro-Mist 1/8',
      effect: 'Subtle halation, minimal contrast reduction',
    },
    imageUrl: IMAGES.tiffenFilter,
  },
  {
    sku: 'FILT-HBM-SCH',
    model: 'Schneider Hollywood Black Magic Filter 4x5.65"',
    categorySlug: 'camera-accessories',
    brandSlug: 'schneider',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 50,
    weeklyPrice: 300,
    featured: false,
    isActive: true,
    warehouseLocation: 'B3-06',
    barcode: '20000021',
    specifications: {
      size: '4x5.65"',
      type: 'Hollywood Black Magic',
      effect: 'Glow, halation, skin smoothing',
    },
    imageUrl: IMAGES.schneiderFilter,
  },
  {
    sku: 'FILT-ROTA-POLA',
    model: 'Revar Cine Rota-Pola Circular Polarizer',
    categorySlug: 'camera-accessories',
    brandSlug: 'generic',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 50,
    weeklyPrice: 300,
    featured: false,
    isActive: true,
    warehouseLocation: 'B3-07',
    barcode: '20000022',
    specifications: { type: 'Circular Polarizer (rotating)', format: '138mm drop-in' },
    imageUrl: IMAGES.revarCinePola,
  },
  {
    sku: 'ACC-MATTEBOX',
    model: 'Tilta Mini Matte Box',
    categorySlug: 'camera-accessories',
    brandSlug: 'tilta',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 80,
    weeklyPrice: 480,
    featured: false,
    isActive: true,
    warehouseLocation: 'B3-08',
    barcode: '20000023',
    specifications: {
      filterSlots: '4x5.65" (2 slots)',
      compatibility: '15mm LWS rods',
      flags: 'Top and side flags included',
    },
    imageUrl: IMAGES.tiltaMatteBox,
  },

  // ===== LENSES =====
  {
    sku: 'LENS-ARRI-UP',
    model: 'ARRI/ZEISS Ultra Prime Kit (16/24/32/50/58/135mm)',
    categorySlug: 'lenses',
    brandSlug: 'zeiss',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 2500,
    weeklyPrice: 15000,
    monthlyPrice: 50000,
    featured: true,
    isActive: true,
    warehouseLocation: 'C1-01',
    barcode: '30000001',
    budgetTier: BudgetTier.PREMIUM,
    specifications: {
      focalLengths: '16mm, 24mm, 32mm, 50mm, 58mm, 135mm',
      aperture: 'T1.9 (all focal lengths)',
      mount: 'PL Mount',
      frontDiameter: '95mm (uniform)',
      coverage: 'Super 35 / Full Frame',
      focus: 'Manual cinema focus with smooth rotation',
    },
    boxContents:
      '6x Ultra Prime lenses (16, 24, 32, 50, 58, 135mm), 6x Front/rear caps, Custom hard case',
    imageUrl: IMAGES.arriUltraPrime,
  },
  {
    sku: 'LENS-DZOFILM-PICTOR',
    model: 'DZOFilm Pictor Zoom Set (20-55mm + 50-125mm)',
    categorySlug: 'lenses',
    brandSlug: 'dzofilm',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 800,
    weeklyPrice: 4800,
    monthlyPrice: 16000,
    featured: true,
    isActive: true,
    warehouseLocation: 'C1-02',
    barcode: '30000002',
    budgetTier: BudgetTier.PROFESSIONAL,
    specifications: {
      set: '20-55mm T2.8 + 50-125mm T2.8',
      mount: 'PL Mount (interchangeable to EF)',
      coverage: 'Super 35',
      frontDiameter: '95mm',
      aperture: 'T2.8 constant',
    },
    boxContents: '20-55mm T2.8, 50-125mm T2.8',
    imageUrl: IMAGES.dzofilmPictor,
  },
  {
    sku: 'LENS-SIGMA-2470',
    model: 'Sigma 24-70mm f/2.8 DG DN Art (Sony E)',
    categorySlug: 'lenses',
    brandSlug: 'sigma',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 2,
    quantityAvailable: 2,
    dailyPrice: 150,
    weeklyPrice: 900,
    monthlyPrice: 3000,
    featured: true,
    isActive: true,
    warehouseLocation: 'C1-03',
    barcode: '30000003',
    budgetTier: BudgetTier.ESSENTIAL,
    specifications: {
      focalLength: '24-70mm',
      aperture: 'f/2.8',
      mount: 'Sony E-Mount',
      format: 'Full Frame',
      filterThread: '82mm',
      weight: '830g',
      elements: '19 elements / 15 groups',
    },
    imageUrl: IMAGES.sigma2470,
  },
  {
    sku: 'LENS-LAOWA-12',
    model: 'Laowa Zero-D 12mm T2.9 (Sony E)',
    categorySlug: 'lenses',
    brandSlug: 'laowa',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 100,
    weeklyPrice: 600,
    monthlyPrice: 2000,
    featured: false,
    isActive: true,
    warehouseLocation: 'C1-04',
    barcode: '30000004',
    specifications: {
      focalLength: '12mm',
      aperture: 'T2.9',
      mount: 'Sony E-Mount',
      distortion: 'Near zero distortion',
      format: 'Full Frame',
      filterThread: '77mm',
    },
    imageUrl: IMAGES.laowa12,
  },
  {
    sku: 'LENS-SONY-90M',
    model: 'Sony FE 90mm f/2.8 Macro G OSS',
    categorySlug: 'lenses',
    brandSlug: 'sony',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 120,
    weeklyPrice: 720,
    monthlyPrice: 2400,
    featured: false,
    isActive: true,
    warehouseLocation: 'C1-05',
    barcode: '30000005',
    specifications: {
      focalLength: '90mm',
      aperture: 'f/2.8',
      mount: 'Sony E-Mount',
      macro: '1:1 life-size magnification',
      oss: 'Optical SteadyShot',
      filterThread: '62mm',
      weight: '602g',
    },
    imageUrl: IMAGES.sonyGM90,
  },
  {
    sku: 'LENS-SIGMA-135',
    model: 'Sigma 135mm f/1.8 DG DN Art (Sony E)',
    categorySlug: 'lenses',
    brandSlug: 'sigma',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 120,
    weeklyPrice: 720,
    monthlyPrice: 2400,
    featured: false,
    isActive: true,
    warehouseLocation: 'C1-06',
    barcode: '30000006',
    specifications: {
      focalLength: '135mm',
      aperture: 'f/1.8',
      mount: 'Sony E-Mount',
      format: 'Full Frame',
      filterThread: '82mm',
      weight: '1130g',
    },
    imageUrl: IMAGES.sigma135,
  },
  {
    sku: 'LENS-SIGMA-50',
    model: 'Sigma 50mm f/1.4 DG DN Art (Sony E)',
    categorySlug: 'lenses',
    brandSlug: 'sigma',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 100,
    weeklyPrice: 600,
    monthlyPrice: 2000,
    featured: false,
    isActive: true,
    warehouseLocation: 'C1-07',
    barcode: '30000007',
    specifications: {
      focalLength: '50mm',
      aperture: 'f/1.4',
      mount: 'Sony E-Mount',
      format: 'Full Frame',
      filterThread: '72mm',
      weight: '670g',
    },
    imageUrl: IMAGES.sigma50,
  },
  {
    sku: 'LENS-SIGMA-35',
    model: 'Sigma 35mm f/1.4 DG DN Art (Sony E)',
    categorySlug: 'lenses',
    brandSlug: 'sigma',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 2,
    quantityAvailable: 2,
    dailyPrice: 100,
    weeklyPrice: 600,
    monthlyPrice: 2000,
    featured: false,
    isActive: true,
    warehouseLocation: 'C1-08',
    barcode: '30000008',
    specifications: {
      focalLength: '35mm',
      aperture: 'f/1.4',
      mount: 'Sony E-Mount',
      format: 'Full Frame',
      filterThread: '67mm',
      weight: '645g',
    },
    imageUrl: IMAGES.sigma35,
  },
  {
    sku: 'LENS-SIGMA-1424',
    model: 'Sigma 14-24mm f/2.8 DG DN Art (Sony E)',
    categorySlug: 'lenses',
    brandSlug: 'sigma',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 180,
    weeklyPrice: 1080,
    monthlyPrice: 3600,
    featured: false,
    isActive: true,
    warehouseLocation: 'C1-09',
    barcode: '30000009',
    specifications: {
      focalLength: '14-24mm',
      aperture: 'f/2.8',
      mount: 'Sony E-Mount',
      format: 'Full Frame',
      rearFilter: 'Rear gel filter holder',
      weight: '795g',
    },
    imageUrl: IMAGES.sigma1424,
  },

  // ===== TRIPODS & GIMBALS =====
  {
    sku: 'STAB-RS4-PRO',
    model: 'DJI RS4 Pro Combo',
    categorySlug: 'tripods-gimbals',
    brandSlug: 'dji',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 250,
    weeklyPrice: 1500,
    monthlyPrice: 5000,
    featured: true,
    isActive: true,
    warehouseLocation: 'D1-01',
    barcode: '40000001',
    budgetTier: BudgetTier.PROFESSIONAL,
    specifications: {
      payload: '4.5kg (10 lbs)',
      battery: '12h (BG30 grip)',
      features: '2nd-Gen Native Vertical, LiDAR Focus (76,800 points)',
      connectivity: 'Bluetooth 5.0, Wi-Fi 6',
    },
    boxContents:
      'DJI RS4 PRO Gimbal, BG30 Battery Grip, Quick-Release Plate (Arca-Swiss/Manfrotto), Extended Grip/Tripod (Metal), Briefcase Handle, Lens-Fastening Support, Multi-Camera Control Cable (USB-C), USB-C Charging Cable, Ronin Image Transmitter, Focus Pro Motor, Focus Gear Strip, Phone Holder, Carrying Case',
    imageUrl: IMAGES.djiRS4Pro,
  },
  {
    sku: 'STAB-TILTA-SLIDER',
    model: 'Tilta Slider Dolly',
    categorySlug: 'tripods-gimbals',
    brandSlug: 'tilta',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 200,
    weeklyPrice: 1200,
    featured: false,
    isActive: true,
    warehouseLocation: 'D1-02',
    barcode: '40000002',
    boxContents:
      '1x Bowl, 8x 40mm Rod, 4x Adapter, 6x Rail connector, 2x Slider Supporter, 4x Aluminum legs, 1x Rail extension Support',
    imageUrl: IMAGES.tiltaSlider,
  },
  {
    sku: 'STAB-TILTA-FLOAT',
    model: 'Tilta Float Handheld Gimbal Support',
    categorySlug: 'tripods-gimbals',
    brandSlug: 'tilta',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 350,
    weeklyPrice: 2100,
    monthlyPrice: 7000,
    featured: true,
    isActive: true,
    warehouseLocation: 'D1-03',
    barcode: '40000003',
    budgetTier: BudgetTier.PREMIUM,
    specifications: {
      type: 'Gimbal Support Vest + Spring Arm',
      payload: 'Up to 8.8 lbs (4kg)',
      compatibility: 'DJI RS series, Zhiyun, Moza',
    },
    boxContents:
      'Support Vest, Stabilizer Arm, Mounting Post, Monitor Bracket, Power Supply Baseplate, 2-Pin to 2-Pin LEMO Cable, D-Tap to 2-Pin LEMO Cable, Wireless Thumb Controller, Wireless Control Module Receiver, V-Mount Battery Plate, Phone Mount Bracket, Tool Kit, Carry Case',
    imageUrl: IMAGES.tiltaFloat,
  },
  {
    sku: 'STAB-HYDRA-ARM',
    model: 'Tilta Hydra Alien Car Mount System',
    categorySlug: 'tripods-gimbals',
    brandSlug: 'tilta',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 400,
    weeklyPrice: 2400,
    monthlyPrice: 8000,
    featured: true,
    isActive: true,
    warehouseLocation: 'D1-04',
    barcode: '40000004',
    budgetTier: BudgetTier.PREMIUM,
    specifications: {
      type: 'Suction cup car mount + shock absorbing arm',
      payload: 'Up to 15kg',
      suctions: '1 large + 2 small',
    },
    boxContents:
      'Hydra Alien Dovetail Plate Kit (L1-L4), Dovetail Connector Plate, Large Suction Cup, 2x Small Suction Cups, Shock-Absorbing Arm with Hydraulic Damping, Shock-Absorbing Head, 90° Adapter, Power Supply Baseplate, 2x V-Mount Battery Plates, 8x Counterweight (7.8oz), 10x Cable Clamp Suction Cups, Safety Belt, Tool Kit',
    imageUrl: IMAGES.tiltaHydra,
  },
  {
    sku: 'STAB-FLYCAM',
    model: 'FlyCam Flowline Master (5-12kg)',
    categorySlug: 'tripods-gimbals',
    brandSlug: 'flycam',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 150,
    weeklyPrice: 900,
    featured: false,
    isActive: true,
    warehouseLocation: 'D1-05',
    barcode: '40000005',
    specifications: { payload: '5-12kg', type: 'Easyrig-style body support' },
    boxContents: 'FlyCam Flowline body support (5-12kg range)',
    imageUrl: IMAGES.flycamFlowline,
  },
  {
    sku: 'STAB-EASYRIG',
    model: 'Easyrig Vario 5 ACE',
    categorySlug: 'tripods-gimbals',
    brandSlug: 'easyrig',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 300,
    weeklyPrice: 1800,
    monthlyPrice: 6000,
    featured: true,
    isActive: true,
    warehouseLocation: 'D1-06',
    barcode: '40000006',
    budgetTier: BudgetTier.PREMIUM,
    specifications: {
      payload: '5-17kg (11-38 lbs)',
      type: 'Camera support vest',
      adjustment: 'Variable tension spring',
    },
    imageUrl: IMAGES.easyrigV5,
  },
  {
    sku: 'STAB-BENRO',
    model: 'Benro Professional Video Tripod',
    categorySlug: 'tripods-gimbals',
    brandSlug: 'benro',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 80,
    weeklyPrice: 480,
    featured: false,
    isActive: true,
    warehouseLocation: 'D1-07',
    barcode: '40000007',
    budgetTier: BudgetTier.ESSENTIAL,
    specifications: {
      type: 'Video tripod with fluid head',
      payload: 'Up to 12kg',
      height: 'Up to 170cm',
    },
    imageUrl: IMAGES.benroTripod,
  },
  {
    sku: 'STAB-EIMAGE-120',
    model: 'E-Image ES120 Motorized Slider',
    categorySlug: 'tripods-gimbals',
    brandSlug: 'e-image',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 100,
    weeklyPrice: 600,
    featured: false,
    isActive: true,
    warehouseLocation: 'D1-08',
    barcode: '40000008',
    specifications: {
      length: '120cm',
      type: 'Motorized slider',
      payload: 'Up to 10kg',
      control: 'App + remote',
    },
    imageUrl: IMAGES.eimageSlider,
  },

  // ===== LIGHTING =====
  {
    sku: 'LGT-GVM-50RS',
    model: 'GVM 50RS RGB LED Video Light',
    categorySlug: 'lighting',
    brandSlug: 'gvm',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 2,
    quantityAvailable: 2,
    dailyPrice: 100,
    weeklyPrice: 600,
    featured: false,
    isActive: true,
    warehouseLocation: 'E1-01',
    barcode: '60000001',
    budgetTier: BudgetTier.ESSENTIAL,
    specifications: { power: '50W', cct: '3200K-5600K', cri: 'CRI 97+', output: '5600 lux @ 0.5m' },
    boxContents: 'Light head, Power cable, AC/DC adapter, Diffuser',
    imageUrl: IMAGES.gvm50rs,
  },
  {
    sku: 'LGT-MC12',
    model: 'Aputure MC 12-Light Production Kit',
    categorySlug: 'lighting',
    brandSlug: 'aputure',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 200,
    weeklyPrice: 1200,
    monthlyPrice: 4000,
    featured: true,
    isActive: true,
    warehouseLocation: 'E1-02',
    barcode: '60000002',
    budgetTier: BudgetTier.PROFESSIONAL,
    specifications: {
      lights: '12x Aputure MC RGB lights',
      output: '~500 lux per unit',
      cri: 'CRI 96+',
      control: 'Sidus Link App, Bluetooth',
    },
    boxContents: '12x MC lights, Charging cables, 2x Softeners, 4x Velcro strips, D-Tap charger',
    imageUrl: IMAGES.mc12Kit,
  },
  {
    sku: 'LGT-APT-300D',
    model: 'Aputure LS C300d II',
    categorySlug: 'lighting',
    brandSlug: 'aputure',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 3,
    quantityAvailable: 3,
    dailyPrice: 250,
    weeklyPrice: 1500,
    monthlyPrice: 5000,
    featured: true,
    isActive: true,
    warehouseLocation: 'E1-03',
    barcode: '60000003',
    budgetTier: BudgetTier.PROFESSIONAL,
    specifications: {
      highlights: [
        { icon: 'zap', label: 'Power', value: '300W COB LED' },
        { icon: 'sun', label: 'CCT', value: '5500K Daylight' },
        { icon: 'gauge', label: 'Output', value: '45,000+ lux @ 1m' },
        { icon: 'star', label: 'CRI', value: 'CRI 96+ / TLCI 96+' },
      ],
      quickSpecs: [
        { icon: 'zap', label: 'Power', value: '300W' },
        { icon: 'sun', label: 'CCT', value: '5500K' },
        { icon: 'gauge', label: 'CRI', value: '96+' },
        { icon: 'wifi', label: 'Control', value: 'DMX, Sidus Link' },
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
              value: '1x COB LED Monolight',
              highlight: true,
            },
            {
              key: 'colorTemp',
              label: 'Color Temperature',
              labelAr: 'درجة اللون',
              value: '5500K Daylight',
              type: 'colorTemp',
              highlight: true,
            },
            {
              key: 'cri',
              label: 'CRI / TLCI',
              labelAr: 'دقة الألوان',
              value: 'CRI 96+ / TLCI 96+',
              highlight: true,
            },
            { key: 'beamAngle', label: 'Beam Angle', labelAr: 'زاوية الإضاءة', value: '105°' },
            {
              key: 'dimming',
              label: 'Dimming',
              labelAr: 'التعتيم',
              value: '0–100% (App / DMX / 2.4GHz remote)',
              type: 'range',
              rangePercent: 100,
            },
            {
              key: 'accessoryMount',
              label: 'Front Accessory Mount',
              labelAr: 'قاعدة الإكسسوار',
              value: 'Bowens S',
            },
            {
              key: 'powerSource',
              label: 'Power Source',
              labelAr: 'مصدر الطاقة',
              value: 'AC (cable included) / V-Mount battery (not included)',
            },
          ],
        },
        {
          label: 'Photometrics',
          labelAr: 'القياس الضوئي',
          icon: 'sun',
          priority: 2,
          specs: [
            {
              key: 'output',
              label: 'Output / Lux',
              labelAr: 'الإضاءة / لوكس',
              value: '45,000+ lux @ 1 m (with Hyper Reflector)',
            },
            { key: 'lumens', label: 'Lumens', labelAr: 'لومن', value: '—' },
            {
              key: 'colorModes',
              label: 'Color Modes',
              labelAr: 'أوضاع اللون',
              value: 'Daylight (5600K)',
            },
            {
              key: 'photometrics',
              label: 'Photometrics',
              labelAr: 'القياس عند المسافات',
              value: '~16,200 lux @ 1 m (3200K) / ~20,500 lux @ 1 m (5600K) with reflector',
            },
          ],
        },
        {
          label: 'Connectivity',
          labelAr: 'الاتصال',
          icon: 'wifi',
          priority: 3,
          specs: [
            {
              key: 'wireless',
              label: 'Wireless Remote',
              labelAr: 'التحكم اللاسلكي',
              value: 'Bluetooth (Sidus Link), 2.4 GHz remote (included)',
            },
            {
              key: 'app',
              label: 'App Control',
              labelAr: 'التحكم بالتطبيق',
              value: 'Yes',
              type: 'boolean',
            },
            { key: 'dmx', label: 'DMX Channels', labelAr: 'قنوات DMX', value: '6' },
            {
              key: 'wirelessRange',
              label: 'Wireless Range',
              labelAr: 'مدى اللاسلكي',
              value: 'Up to 100 m',
            },
            {
              key: 'wirelessFreq',
              label: 'Wireless Frequency',
              labelAr: 'تردد اللاسلكي',
              value: '2.4 GHz',
            },
          ],
        },
        {
          label: 'Power & I/O',
          labelAr: 'الطاقة والتوصيلات',
          icon: 'zap',
          priority: 4,
          specs: [
            {
              key: 'power',
              label: 'Power Consumption',
              labelAr: 'استهلاك الطاقة',
              value: '300 W',
              highlight: true,
            },
            {
              key: 'acInput',
              label: 'AC Input',
              labelAr: 'مدخل التيار',
              value: '100–240 VAC, 50/60 Hz',
            },
            {
              key: 'batteryPlate',
              label: 'Battery Plate',
              labelAr: 'قاعدة البطارية',
              value: 'V-Mount (optional)',
            },
            {
              key: 'battery',
              label: 'Battery',
              labelAr: 'البطارية',
              value: 'V-Mount 14.4 VDC (not included)',
            },
            {
              key: 'io',
              label: 'Inputs/Outputs',
              labelAr: 'المداخل/المخارج',
              value: 'XLR 5-pin power, powerCON, DMX In/Out',
            },
            {
              key: 'includedCables',
              label: 'Included Cables',
              labelAr: 'الكابلات المرفقة',
              value: 'Power cable, head cable, XLR 5-pin cable (3 m)',
            },
          ],
        },
        {
          label: 'Mounting',
          labelAr: 'التثبيت',
          icon: 'ruler',
          priority: 5,
          specs: [
            {
              key: 'yoke',
              label: 'Yoke Type',
              labelAr: 'نوع الحامل',
              value: 'Manually-operated yoke (180° tilt)',
            },
            {
              key: 'fixtureMount',
              label: 'Fixture Mounting',
              labelAr: 'تثبيت الفيكسشر',
              value: '1x 5/8" receiver (via yoke)',
            },
          ],
        },
        {
          label: 'Physical & General',
          labelAr: 'المواصفات الفيزيائية والعامة',
          icon: 'ruler',
          priority: 6,
          specs: [
            {
              key: 'dimensions',
              label: 'Dimensions',
              labelAr: 'الأبعاد',
              value: 'Fixture: ~34.5 x 29.8 x 21.6 cm / Ballast: ~27.9 x 12.7 x 9.7 cm',
            },
            {
              key: 'weight',
              label: 'Weight',
              labelAr: 'الوزن',
              value: '~11.4 kg',
              type: 'range',
              rangePercent: 40,
              highlight: true,
            },
            { key: 'cooling', label: 'Cooling', labelAr: 'التبريد', value: 'Fan' },
            { key: 'display', label: 'Display', labelAr: 'الشاشة', value: 'LCD' },
            {
              key: 'materials',
              label: 'Materials',
              labelAr: 'المواد',
              value: 'Aluminum (housing)',
            },
            {
              key: 'certifications',
              label: 'Certifications',
              labelAr: 'الشهادات',
              value: 'RoHS, CE, FCC, cTUVus, PSE, KC',
            },
            { key: 'ip', label: 'Protection Rating', labelAr: 'درجة الحماية', value: '—' },
          ],
        },
      ],
    },
    boxContents:
      'Light head, Power cable, Head cable, Power ballast, Light cone (Hyper Reflector), Cone protector, 2.4GHz remote, Ballast grip, AC power adapter',
    imageUrl: IMAGES.aputure300D,
  },
  {
    sku: 'LGT-AMARAN-F22C',
    model: 'Amaran F22c Flexible LED Panel',
    categorySlug: 'lighting',
    brandSlug: 'amaran',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 2,
    quantityAvailable: 2,
    dailyPrice: 200,
    weeklyPrice: 1200,
    featured: false,
    isActive: true,
    warehouseLocation: 'E1-04',
    barcode: '60000004',
    specifications: {
      power: '200W',
      cct: '2500K-7500K Bi-Color + Full RGB',
      size: '2x2 ft flexible panel',
      cri: 'CRI 95+',
      control: 'Sidus Link, DMX',
    },
    boxContents:
      'LED panel, Power adapter, Power cable, Power ballast, Tilting Stand Mount, Thick diffuser, Thin diffuser, Extension cable, Grid light, Support Bracket, Softbox frame, Carrying Case',
    imageUrl: IMAGES.amaranF22c,
  },
  {
    sku: 'LGT-TUBE-SM',
    model: 'Amaran T2c LED Tube Light (4-Pack)',
    categorySlug: 'lighting',
    brandSlug: 'amaran',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 100,
    weeklyPrice: 600,
    featured: false,
    isActive: true,
    warehouseLocation: 'E1-06',
    barcode: '60000006',
    specifications: {
      type: 'RGBWW LED tube',
      length: '2ft per tube',
      cri: 'CRI 95+',
      battery: 'Built-in rechargeable',
    },
    boxContents: '4x LED tubes, Carrying bag',
    imageUrl: IMAGES.lightTubes,
  },
  {
    sku: 'LGT-ASTERA-8P',
    model: 'Astera Titan Tubes (8-Pack)',
    categorySlug: 'lighting',
    brandSlug: 'astera',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 800,
    weeklyPrice: 4800,
    monthlyPrice: 16000,
    featured: true,
    isActive: true,
    warehouseLocation: 'E1-07',
    barcode: '60000007',
    budgetTier: BudgetTier.PREMIUM,
    specifications: {
      type: 'Wireless RGBMA LED tube',
      length: '3.4ft (105cm)',
      pixels: '16 individually addressable pixels per tube',
      battery: 'Up to 20 hours',
      wireless: 'CRMX / AsteraApp / DMX',
      cri: 'CRI 96+',
    },
    boxContents:
      '8x Astera Titan Tubes, Charging case, Tube Holders, Tube Clamps, Tube safety rings, Safety clamps',
    imageUrl: IMAGES.asteraTitan,
  },
  {
    sku: 'LGT-NANLUX-1200',
    model: 'NanLux Evoke 1200D',
    categorySlug: 'lighting',
    brandSlug: 'nanlux',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 600,
    weeklyPrice: 3600,
    monthlyPrice: 12000,
    featured: true,
    isActive: true,
    warehouseLocation: 'E1-08',
    barcode: '60000008',
    budgetTier: BudgetTier.PREMIUM,
    specifications: {
      power: '1200W COB LED',
      cct: '5600K Daylight',
      output: '200,000+ lux @ 1m (w/ reflector)',
      cri: 'CRI 96+ / TLCI 97+',
      control: 'DMX512, sACN, ArtNet, Bluetooth',
    },
    boxContents:
      'Light head, Light power box, Head-to-box power cable, Box AC power cable, Light Cone, NanLux Fresnel attachment',
    imageUrl: IMAGES.nanlux1200,
  },
  {
    sku: 'LGT-GOD-AD600',
    model: 'Godox AD600 Pro',
    categorySlug: 'lighting',
    brandSlug: 'godox',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 3,
    quantityAvailable: 3,
    dailyPrice: 150,
    weeklyPrice: 900,
    monthlyPrice: 3000,
    featured: false,
    isActive: true,
    warehouseLocation: 'E2-01',
    barcode: '60000009',
    budgetTier: BudgetTier.PROFESSIONAL,
    specifications: {
      power: '600Ws',
      cct: '5600K ±200K',
      flashDuration: '1/220 to 1/10,600s',
      recycleTime: '0.01-0.9s',
      battery: '360 full-power flashes',
    },
    boxContents:
      'Light head with protector, Flash bulb, Battery (WB87), Charger, Power cable, Sony trigger, Canon trigger, Trigger battery',
    imageUrl: IMAGES.godoxAD600,
  },
  {
    sku: 'LGT-GOD-AD400',
    model: 'Godox AD400 Pro',
    categorySlug: 'lighting',
    brandSlug: 'godox',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 4,
    quantityAvailable: 4,
    dailyPrice: 120,
    weeklyPrice: 720,
    monthlyPrice: 2400,
    featured: false,
    isActive: true,
    warehouseLocation: 'E2-02',
    barcode: '60000010',
    budgetTier: BudgetTier.ESSENTIAL,
    specifications: {
      power: '400Ws',
      cct: '5600K ±100K',
      flashDuration: '1/250 to 1/10,600s',
      recycleTime: '0.01-1s',
      battery: '390 full-power flashes',
    },
    boxContents:
      'Light head with protector, Flash bulb, Battery, Charger, Power cable, Sony trigger, Canon trigger, Trigger battery',
    imageUrl: IMAGES.godoxAD400,
  },
  {
    sku: 'LGT-APT-600D',
    model: 'Aputure Light Storm 600d Pro',
    categorySlug: 'lighting',
    brandSlug: 'aputure',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 2,
    quantityAvailable: 2,
    dailyPrice: 400,
    weeklyPrice: 2400,
    monthlyPrice: 8000,
    featured: true,
    isActive: true,
    warehouseLocation: 'E2-03',
    barcode: '60000011',
    budgetTier: BudgetTier.PROFESSIONAL,
    specifications: {
      power: '600W COB LED',
      cct: '5600K Daylight',
      output: '82,000+ lux @ 1m (w/ Hyper Reflector)',
      cri: 'CRI 96+ / TLCI 96+',
      control: 'DMX, Bluetooth (Sidus Link)',
      weatherResistance: 'IP54',
    },
    boxContents:
      '600d Pro Lamp Head, LS 600d Control Box, Hyper Reflector, 5-Pin Head Cable (3m), Power cable, Connector cable, Remote control',
    imageUrl: IMAGES.aputure600D,
  },
  {
    sku: 'LGT-APT-600C',
    model: 'Aputure Light Storm 600c Pro',
    categorySlug: 'lighting',
    brandSlug: 'aputure',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 500,
    weeklyPrice: 3000,
    monthlyPrice: 10000,
    featured: true,
    isActive: true,
    warehouseLocation: 'E2-04',
    barcode: '60000012',
    budgetTier: BudgetTier.PREMIUM,
    specifications: {
      power: '600W COB LED',
      cct: '2300K-10000K RGBWW (Full Color)',
      cri: 'CRI 95+ / TLCI 96+',
      colorModes: 'CCT, HSI, Gel, Source, X/Y Coordinates',
      control: 'DMX, Bluetooth (Sidus Link)',
    },
    boxContents:
      '600c Pro Lamp Head, Control Box, Hyper Reflector, 5-Pin Head Cable (3m), Power cable, Connector cable',
    imageUrl: IMAGES.aputure600C,
  },
  {
    sku: 'LGT-GOD-AD1200',
    model: 'Godox AD1200 Pro',
    categorySlug: 'lighting',
    brandSlug: 'godox',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 350,
    weeklyPrice: 2100,
    monthlyPrice: 7000,
    featured: true,
    isActive: true,
    warehouseLocation: 'E2-05',
    barcode: '60000013',
    budgetTier: BudgetTier.PREMIUM,
    specifications: {
      power: '1200Ws',
      cct: '5600K',
      flashDuration: '1/100 to 1/6,700s',
      recycleTime: '0.01-1.8s',
      battery: '500 full-power flashes (dual battery)',
    },
    boxContents:
      'Flash Head, Power Pack, Battery for AD1200Pro, Battery Charger, Power Connection Cord, Reflector, Glass Protection Cover, Carrying Bag',
    imageUrl: IMAGES.godoxAD1200,
  },

  // ===== LIGHT ACCESSORIES =====
  {
    sku: 'LACC-UMBRELLA',
    model: 'Light Umbrella (Set of 10)',
    categorySlug: 'light-accessories',
    brandSlug: 'generic',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 10,
    quantityAvailable: 10,
    dailyPrice: 15,
    weeklyPrice: 90,
    featured: false,
    isActive: true,
    warehouseLocation: 'F1-01',
    barcode: '70000001',
    imageUrl: IMAGES.lightUmbrella,
  },
  {
    sku: 'LACC-BEAUTYDISH',
    model: 'Beauty Dish Modifier',
    categorySlug: 'light-accessories',
    brandSlug: 'generic',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 50,
    weeklyPrice: 300,
    featured: false,
    isActive: true,
    warehouseLocation: 'F1-02',
    barcode: '70000002',
    imageUrl: IMAGES.beautyDish,
  },
  {
    sku: 'LACC-SILVER-4FT',
    model: 'Silver Reflector Cloth 4x4 ft',
    categorySlug: 'light-accessories',
    brandSlug: 'generic',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 30,
    weeklyPrice: 180,
    featured: false,
    isActive: true,
    warehouseLocation: 'F1-03',
    barcode: '70000003',
    imageUrl: IMAGES.silverCloth,
  },
  {
    sku: 'LACC-ULTRABOUNCE',
    model: 'TRP Ultrabounce 8x8 ft',
    categorySlug: 'light-accessories',
    brandSlug: 'generic',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 50,
    weeklyPrice: 300,
    featured: false,
    isActive: true,
    warehouseLocation: 'F1-04',
    barcode: '70000004',
    imageUrl: IMAGES.ultrabounce,
  },
  {
    sku: 'LACC-CONE',
    model: 'Light Cone / Snoot',
    categorySlug: 'light-accessories',
    brandSlug: 'generic',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 20,
    weeklyPrice: 120,
    featured: false,
    isActive: true,
    warehouseLocation: 'F1-05',
    barcode: '70000005',
    imageUrl: IMAGES.lightUmbrella,
  },
  {
    sku: 'LACC-APT-SPACE',
    model: 'Aputure Space Light Modifier',
    categorySlug: 'light-accessories',
    brandSlug: 'aputure',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 60,
    weeklyPrice: 360,
    featured: false,
    isActive: true,
    warehouseLocation: 'F1-06',
    barcode: '70000006',
    specifications: {
      compatibility: 'Aputure Bowens mount',
      type: 'Overhead space light diffuser',
    },
    imageUrl: IMAGES.spacelight,
  },
  {
    sku: 'LACC-FOG-1200',
    model: 'LED Fog Machine 1200W',
    categorySlug: 'light-accessories',
    brandSlug: 'generic',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 100,
    weeklyPrice: 600,
    featured: false,
    isActive: true,
    warehouseLocation: 'F1-07',
    barcode: '70000007',
    specifications: { power: '1200W', output: 'LED-lit fog output', control: 'Remote + DMX' },
    boxContents: 'Remote control, Power cable',
    imageUrl: IMAGES.fogMachine,
  },
  {
    sku: 'LACC-MAGIC-20',
    model: 'Magic Cloth 20x20 ft',
    categorySlug: 'light-accessories',
    brandSlug: 'generic',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 80,
    weeklyPrice: 480,
    featured: false,
    isActive: true,
    warehouseLocation: 'F1-08',
    barcode: '70000008',
    imageUrl: IMAGES.magicCloth,
  },
  {
    sku: 'LACC-GREEN-CHROMA',
    model: 'Green Chroma Key Backdrop (x2)',
    categorySlug: 'light-accessories',
    brandSlug: 'generic',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 60,
    weeklyPrice: 360,
    featured: false,
    isActive: true,
    warehouseLocation: 'F1-09',
    barcode: '70000009',
    imageUrl: IMAGES.greenChroma,
  },
  {
    sku: 'LACC-WHITE-8X8',
    model: 'White Diffusion Cloth 8x8 ft',
    categorySlug: 'light-accessories',
    brandSlug: 'generic',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 30,
    weeklyPrice: 180,
    featured: false,
    isActive: true,
    warehouseLocation: 'F1-10',
    barcode: '70000010',
    imageUrl: IMAGES.whiteCloth,
  },
  {
    sku: 'LACC-MUSLIN-8X8',
    model: 'Unbleached Muslin 8x8 ft',
    categorySlug: 'light-accessories',
    brandSlug: 'generic',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 30,
    weeklyPrice: 180,
    featured: false,
    isActive: true,
    warehouseLocation: 'F1-11',
    barcode: '70000011',
    imageUrl: IMAGES.muslinCloth,
  },
  {
    sku: 'LACC-CHECKER-8X8',
    model: 'Checker Silver & Gold Reflector 8x8 ft',
    categorySlug: 'light-accessories',
    brandSlug: 'generic',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 40,
    weeklyPrice: 240,
    featured: false,
    isActive: true,
    warehouseLocation: 'F1-12',
    barcode: '70000012',
    imageUrl: IMAGES.checkerCloth,
  },
  {
    sku: 'LACC-SPOTLIGHT',
    model: 'Aputure Spotlight Mount',
    categorySlug: 'light-accessories',
    brandSlug: 'aputure',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 40,
    weeklyPrice: 240,
    featured: false,
    isActive: true,
    warehouseLocation: 'F2-01',
    barcode: '70000013',
    specifications: {
      compatibility: 'Aputure 300d/600d series',
      projection: 'Gobo + lens projection',
    },
    imageUrl: IMAGES.spotlightMount,
  },
  {
    sku: 'LACC-APT-FRESNEL',
    model: 'Aputure Fresnel 2x Lens Modifier (Pair)',
    categorySlug: 'light-accessories',
    brandSlug: 'aputure',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 2,
    quantityAvailable: 2,
    dailyPrice: 60,
    weeklyPrice: 360,
    featured: false,
    isActive: true,
    warehouseLocation: 'F2-02',
    barcode: '70000014',
    specifications: { compatibility: 'Aputure Bowens mount (300d/600d)', beamAngle: '12°-40°' },
    imageUrl: IMAGES.fresnel2x,
  },
  {
    sku: 'LACC-APT-F10',
    model: 'Aputure F10 Fresnel Attachment',
    categorySlug: 'light-accessories',
    brandSlug: 'aputure',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 80,
    weeklyPrice: 480,
    featured: false,
    isActive: true,
    warehouseLocation: 'F2-03',
    barcode: '70000016',
    specifications: {
      compatibility: 'Aputure LS 600d/c Pro',
      lensSize: '10-inch Fresnel',
      beamAngle: '15°-45°',
    },
    imageUrl: IMAGES.fresnelF10,
  },

  // ===== GRIP & SUPPORT =====
  {
    sku: 'GRIP-TUBE-HOLD',
    model: 'Tube Holder / Clamp',
    categorySlug: 'grip',
    brandSlug: 'generic',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 2,
    quantityAvailable: 2,
    dailyPrice: 15,
    weeklyPrice: 90,
    featured: false,
    isActive: true,
    warehouseLocation: 'G1-01',
    barcode: '80000001',
    boxContents: 'Tube holder with mounting hardware',
    imageUrl: IMAGES.tubeHolder,
  },
  {
    sku: 'GRIP-APPLEBOX',
    model: 'Apple Box Full (Set of 4)',
    categorySlug: 'grip',
    brandSlug: 'generic',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 4,
    quantityAvailable: 4,
    dailyPrice: 15,
    weeklyPrice: 90,
    featured: false,
    isActive: true,
    warehouseLocation: 'G1-02',
    barcode: '80000002',
    specifications: { material: 'Baltic birch plywood', size: '20"x12"x8" (full)' },
    imageUrl: IMAGES.appleBox,
  },
  {
    sku: 'GRIP-APPLEBOX-IN',
    model: 'Apple Box Nested Set (Full/Half/Quarter)',
    categorySlug: 'grip',
    brandSlug: 'generic',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 10,
    weeklyPrice: 60,
    featured: false,
    isActive: true,
    warehouseLocation: 'G1-03',
    barcode: '80000003',
    specifications: { set: 'Half, Quarter, and Pancake apple boxes (nested inside Full)' },
    boxContents: 'Half apple box, Quarter apple box, 1 pancake',
    imageUrl: IMAGES.appleBox,
  },

  // ===== MONITORS =====
  {
    sku: 'MON-VAXIS-A5',
    model: 'Vaxis Atom A5 Wireless Monitor',
    categorySlug: 'monitors',
    brandSlug: 'vaxis',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 150,
    weeklyPrice: 900,
    monthlyPrice: 3000,
    featured: false,
    isActive: true,
    warehouseLocation: 'H1-01',
    barcode: '90000001',
    budgetTier: BudgetTier.PROFESSIONAL,
    specifications: {
      display: '5.5" 1920x1080 IPS',
      brightness: '1000 nit',
      wireless: 'Built-in wireless video receiver',
      latency: '<1ms',
      range: 'Up to 150m',
      inputs: 'HDMI',
    },
    boxContents: 'Monitor, 2x Antenna',
    imageUrl: IMAGES.vaxisAtomA5,
  },
  {
    sku: 'MON-ATOMOS-24',
    model: 'Atomos NEON 24" 4K HDR Monitor/Recorder',
    categorySlug: 'monitors',
    brandSlug: 'atomos',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 500,
    weeklyPrice: 3000,
    monthlyPrice: 10000,
    featured: true,
    isActive: true,
    warehouseLocation: 'H1-02',
    barcode: '90000002',
    budgetTier: BudgetTier.PREMIUM,
    specifications: {
      display: '24" 4K HDR IPS',
      resolution: '3840x2160',
      brightness: '1500 nit',
      colorGamut: 'DCI-P3, Rec.2020, Rec.709',
      recording: 'ProRes RAW, ProRes, DNx',
      inputs: '12G-SDI (4x), HDMI 2.0',
    },
    boxContents:
      'Atomos NEON 24" Monitor/Recorder, Master Control Unit, Master Caddy II, AC Power Supply, AtomX SDI Expansion Module, 2x Support Feet (with mounting screws)',
    imageUrl: IMAGES.atomosNeon24,
  },

  // ===== BATTERIES & POWER =====
  {
    sku: 'PWR-BLUESHAPE-290',
    model: 'Blue Shape BV290HD GRANITE TWO (B-Mount 290Wh)',
    categorySlug: 'batteries-power',
    brandSlug: 'blue-shape',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 4,
    quantityAvailable: 4,
    dailyPrice: 80,
    weeklyPrice: 480,
    featured: false,
    isActive: true,
    warehouseLocation: 'I1-01',
    barcode: '100000001',
    specifications: {
      capacity: '290Wh',
      mount: 'B-Mount',
      voltage: '26.4V nominal',
      outputs: '3x D-Tap, 1x USB-A',
      display: 'LED capacity indicator',
    },
    imageUrl: IMAGES.blueShapeB290,
  },
  {
    sku: 'PWR-SWIT-CHARGER',
    model: 'Swit PC-P461B B-Mount 4-Channel Charger',
    categorySlug: 'batteries-power',
    brandSlug: 'swit',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 50,
    weeklyPrice: 300,
    featured: false,
    isActive: true,
    warehouseLocation: 'I1-02',
    barcode: '100000002',
    specifications: {
      channels: '4x B-Mount simultaneous charging',
      power: 'AC 100-240V',
      display: 'Per-channel LED status',
    },
    boxContents: 'Charger station, AC power cable',
    imageUrl: IMAGES.switCharger,
  },

  // ===== AUDIO =====
  {
    sku: 'SND-XLR-XLR',
    model: 'XLR to XLR Cable (Set of 4)',
    categorySlug: 'audio',
    brandSlug: 'generic',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 4,
    quantityAvailable: 4,
    dailyPrice: 10,
    weeklyPrice: 60,
    featured: false,
    isActive: true,
    warehouseLocation: 'J1-01',
    barcode: '110000001',
    specifications: {
      length: '3m / 10ft each',
      connectors: 'XLR Male to XLR Female',
      shielding: 'Braided copper',
    },
    imageUrl: IMAGES.xlrCable,
  },
  {
    sku: 'SND-XLR-AUX',
    model: 'XLR to 3.5mm AUX Cable (Set of 8)',
    categorySlug: 'audio',
    brandSlug: 'generic',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 8,
    quantityAvailable: 8,
    dailyPrice: 10,
    weeklyPrice: 60,
    featured: false,
    isActive: true,
    warehouseLocation: 'J1-02',
    barcode: '110000002',
    specifications: { length: '2m / 6ft each', connectors: 'XLR Male to 3.5mm TRS' },
    imageUrl: IMAGES.xlrCable,
  },
  {
    sku: 'SND-AUX-AUX',
    model: 'AUX to AUX Cable (Set of 4)',
    categorySlug: 'audio',
    brandSlug: 'generic',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 4,
    quantityAvailable: 4,
    dailyPrice: 10,
    weeklyPrice: 60,
    featured: false,
    isActive: true,
    warehouseLocation: 'J1-03',
    barcode: '110000003',
    specifications: { length: '2m / 6ft each', connectors: '3.5mm TRS to 3.5mm TRS' },
    imageUrl: IMAGES.xlrCable,
  },
  {
    sku: 'SND-RODE-LINK',
    model: 'Rode Link Filmmaker Kit (2-Channel)',
    categorySlug: 'audio',
    brandSlug: 'rode',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 2,
    quantityAvailable: 2,
    dailyPrice: 80,
    weeklyPrice: 480,
    featured: false,
    isActive: true,
    warehouseLocation: 'J1-04',
    barcode: '110000004',
    budgetTier: BudgetTier.ESSENTIAL,
    specifications: {
      channels: '2 transmitters + 2 receivers',
      range: 'Up to 100m',
      frequency: '2.4GHz digital',
      batteryLife: 'Up to 3 hours (AAA)',
    },
    boxContents: '2x Transmitter (TX), 2x Receiver (RX), 2x Lavalier microphone, Cables, Clips',
    imageUrl: IMAGES.rodeLink,
  },
  {
    sku: 'SND-SENN-EW4G',
    model: 'Sennheiser EW 100 ENG G4 Wireless Kit (4-Channel)',
    categorySlug: 'audio',
    brandSlug: 'sennheiser',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 4,
    quantityAvailable: 4,
    dailyPrice: 150,
    weeklyPrice: 900,
    monthlyPrice: 3000,
    featured: true,
    isActive: true,
    warehouseLocation: 'J1-05',
    barcode: '110000005',
    budgetTier: BudgetTier.PROFESSIONAL,
    specifications: {
      channels: '4 transmitters + 4 camera receivers',
      range: 'Up to 100m',
      frequency: 'UHF (516-865 MHz depending on region)',
      batteryLife: 'Up to 8 hours (AA)',
      switchable: '20 compatible channels',
    },
    boxContents:
      '4x Bodypack transmitter (SK 100 G4), 4x Camera receiver (EK 100 G4), 4x Lavalier microphone (ME 2-II)',
    imageUrl: IMAGES.sennheiserEW,
  },
  {
    sku: 'SND-SENN-MKE600',
    model: 'Sennheiser MKE 600 Shotgun Microphone',
    categorySlug: 'audio',
    brandSlug: 'sennheiser',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 100,
    weeklyPrice: 600,
    featured: false,
    isActive: true,
    warehouseLocation: 'J1-06',
    barcode: '110000006',
    budgetTier: BudgetTier.PROFESSIONAL,
    specifications: {
      type: 'Shotgun (supercardioid/lobe)',
      frequency: '40Hz - 20kHz',
      sensitivity: '21 mV/Pa',
      spl: '132 dB maximum',
      power: 'Phantom 48V or AA battery',
      connector: 'XLR-3',
    },
    imageUrl: IMAGES.sennMKE600,
  },
  {
    sku: 'SND-SENN-MZX8060',
    model: 'Sennheiser MKH 8060 Short Shotgun Microphone',
    categorySlug: 'audio',
    brandSlug: 'sennheiser',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 120,
    weeklyPrice: 720,
    featured: false,
    isActive: true,
    warehouseLocation: 'J1-07',
    barcode: '110000007',
    budgetTier: BudgetTier.PREMIUM,
    specifications: {
      type: 'Short shotgun (supercardioid/lobe)',
      frequency: '50Hz - 50kHz',
      sensitivity: '30 mV/Pa',
      spl: '132 dB maximum',
      power: 'Phantom 48V',
      connector: 'XLR-3',
    },
    imageUrl: IMAGES.sennMZX8060,
  },
  {
    sku: 'SND-RODE-MIC',
    model: 'RODE VideoMic Pro+',
    categorySlug: 'audio',
    brandSlug: 'rode',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 50,
    weeklyPrice: 300,
    featured: false,
    isActive: true,
    warehouseLocation: 'J1-08',
    barcode: '110000008',
    budgetTier: BudgetTier.ESSENTIAL,
    specifications: {
      type: 'On-camera shotgun',
      connector: '3.5mm TRS',
      battery: 'LiPo rechargeable',
      hpf: '2-stage high-pass filter',
    },
    imageUrl: IMAGES.rodeMic,
  },
  {
    sku: 'SND-SARAMONIC-XLR9',
    model: 'Saramonic Blink 900 B2 Wireless System',
    categorySlug: 'audio',
    brandSlug: 'saramonic',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 80,
    weeklyPrice: 480,
    featured: false,
    isActive: true,
    warehouseLocation: 'J1-09',
    barcode: '110000009',
    specifications: {
      channels: '1 TX + 1 RX',
      frequency: '2.4GHz',
      range: 'Up to 100m',
      latency: '<10ms',
    },
    boxContents: 'Transmitter, Receiver',
    imageUrl: IMAGES.saramonicXLR9,
  },
  {
    sku: 'SND-ZOOM-F6',
    model: 'Zoom F6 32-Bit Float Field Recorder',
    categorySlug: 'audio',
    brandSlug: 'zoom',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 150,
    weeklyPrice: 900,
    monthlyPrice: 3000,
    featured: true,
    isActive: true,
    warehouseLocation: 'J1-10',
    barcode: '110000010',
    budgetTier: BudgetTier.PROFESSIONAL,
    specifications: {
      inputs: '6x XLR/TRS combo + 2x 3.5mm',
      recording: '32-bit float',
      preamps: 'Ultra-low noise (<-127 dBu EIN)',
      timecode: 'SMPTE timecode in/out',
      media: 'SD/SDHC/SDXC',
      power: '4x AA or USB-C',
    },
    imageUrl: IMAGES.zoomF6,
  },
  {
    sku: 'SND-SENN-LAV-GOLD',
    model: 'Sennheiser MKE Essential Omni Lavalier (Gold)',
    categorySlug: 'audio',
    brandSlug: 'sennheiser',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 2,
    quantityAvailable: 2,
    dailyPrice: 40,
    weeklyPrice: 240,
    featured: false,
    isActive: true,
    warehouseLocation: 'J2-01',
    barcode: '11000011',
    specifications: {
      type: 'Omnidirectional lavalier',
      color: 'Gold (skin-tone)',
      connector: '3.5mm locking',
    },
    imageUrl: IMAGES.sennLavGold,
  },
  {
    sku: 'SND-LAV-MIC',
    model: 'Lavalier Microphone (Set of 5)',
    categorySlug: 'audio',
    brandSlug: 'generic',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 5,
    quantityAvailable: 5,
    dailyPrice: 20,
    weeklyPrice: 120,
    featured: false,
    isActive: true,
    warehouseLocation: 'J2-02',
    barcode: '110000012',
    specifications: {
      type: 'Omnidirectional lavalier',
      connector: '3.5mm TRS',
      cableLength: '1.5m',
    },
    imageUrl: IMAGES.lavMic,
  },

  // ===== LIVE & MIXING =====
  {
    sku: 'LIVE-BM-ULT12',
    model: 'Blackmagic Ultimatte 12 4K',
    categorySlug: 'live-mixing',
    brandSlug: 'blackmagic',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 500,
    weeklyPrice: 3000,
    monthlyPrice: 10000,
    featured: true,
    isActive: true,
    warehouseLocation: 'K1-01',
    barcode: '120000001',
    budgetTier: BudgetTier.PREMIUM,
    specifications: {
      type: 'Real-time compositing/keyer',
      resolution: 'Up to 4K DCI',
      inputs: '12G-SDI, HDMI 2.0',
      keying: 'Hardware-accelerated chroma key',
    },
    imageUrl: IMAGES.bmUltimatte,
  },
  {
    sku: 'LIVE-BM-ATEM4K8',
    model: 'Blackmagic ATEM Television Studio 4K8',
    categorySlug: 'live-mixing',
    brandSlug: 'blackmagic',
    condition: EquipmentCondition.EXCELLENT,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 400,
    weeklyPrice: 2400,
    monthlyPrice: 8000,
    featured: true,
    isActive: true,
    warehouseLocation: 'K1-02',
    barcode: '120000002',
    budgetTier: BudgetTier.PROFESSIONAL,
    specifications: {
      type: 'Live production switcher',
      inputs: '8x 12G-SDI',
      resolution: 'Up to 4K 60p',
      effects: '4 keyers, 2 DVE, 2 media players',
      audio: '60 channel Fairlight audio mixer',
      streaming: 'Direct streaming via USB-C or Ethernet',
    },
    boxContents: 'ATEM TV Studio 4K8 unit, Power cable',
    imageUrl: IMAGES.bmAtem4K8,
  },
  {
    sku: 'LIVE-AUTOQ',
    model: 'Autocue Starter Series Teleprompter',
    categorySlug: 'live-mixing',
    brandSlug: 'autocue',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 200,
    weeklyPrice: 1200,
    featured: false,
    isActive: true,
    warehouseLocation: 'K1-03',
    barcode: '120000003',
    specifications: {
      display: '15" high-brightness LCD',
      glass: 'Beam-splitter glass with hood',
      software: 'QStart teleprompter software',
      compatibility: 'iPad / Laptop control',
    },
    boxContents: 'AutoQ teleprompter unit, Laptop, Tripod, Baseplate',
    imageUrl: IMAGES.autoQ,
  },

  // ===== CASES & BAGS =====
  {
    sku: 'CASE-HARD-01',
    model: 'Hard Case Large #1',
    categorySlug: 'cases-bags',
    brandSlug: 'generic',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 30,
    weeklyPrice: 180,
    featured: false,
    isActive: true,
    warehouseLocation: 'L1-01',
    barcode: '50000001',
    specifications: { type: 'Waterproof hard case', wheels: 'Yes', interior: 'Custom foam' },
    imageUrl: IMAGES.hardCase,
  },
  {
    sku: 'CASE-HARD-02',
    model: 'Hard Case Large #2',
    categorySlug: 'cases-bags',
    brandSlug: 'generic',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 30,
    weeklyPrice: 180,
    featured: false,
    isActive: true,
    warehouseLocation: 'L1-02',
    barcode: '50000002',
    specifications: { type: 'Waterproof hard case', wheels: 'Yes', interior: 'Custom foam' },
    imageUrl: IMAGES.hardCase,
  },
  {
    sku: 'CASE-HARD-03',
    model: 'Hard Case Large #3',
    categorySlug: 'cases-bags',
    brandSlug: 'generic',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 30,
    weeklyPrice: 180,
    featured: false,
    isActive: true,
    warehouseLocation: 'L1-03',
    barcode: '50000003',
    specifications: { type: 'Waterproof hard case', wheels: 'Yes', interior: 'Custom foam' },
    imageUrl: IMAGES.hardCase,
  },
  {
    sku: 'CASE-HARD-SM',
    model: 'Hard Case Small',
    categorySlug: 'cases-bags',
    brandSlug: 'generic',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 20,
    weeklyPrice: 120,
    featured: false,
    isActive: true,
    warehouseLocation: 'L1-04',
    barcode: '50000004',
    specifications: { type: 'Compact hard case', wheels: 'No', interior: 'Padded dividers' },
    imageUrl: IMAGES.hardCase,
  },
  {
    sku: 'CASE-SOFT-01',
    model: 'Professional Soft Case Bag #1',
    categorySlug: 'cases-bags',
    brandSlug: 'generic',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 20,
    weeklyPrice: 120,
    featured: false,
    isActive: true,
    warehouseLocation: 'L1-05',
    barcode: '50000005',
    specifications: { type: 'Padded soft case bag', shoulder: 'Yes' },
    imageUrl: IMAGES.hardCase,
  },
  {
    sku: 'CASE-SOFT-02',
    model: 'Professional Soft Case Bag #2',
    categorySlug: 'cases-bags',
    brandSlug: 'generic',
    condition: EquipmentCondition.GOOD,
    quantityTotal: 1,
    quantityAvailable: 1,
    dailyPrice: 20,
    weeklyPrice: 120,
    featured: false,
    isActive: true,
    warehouseLocation: 'L1-06',
    barcode: '50000006',
    specifications: { type: 'Padded soft case bag', shoulder: 'Yes' },
    imageUrl: IMAGES.hardCase,
  },
]

// ============================================
// MAIN SEED FUNCTION
// ============================================

async function main() {
  console.log('🌱 Starting comprehensive database seed...')
  console.log(`📦 Total equipment items to seed: ${ALL_EQUIPMENT.length}`)

  // Default password "admin123" for dev
  const adminPasswordHash = await bcrypt.hash('admin123', 10)

  // 1. Create Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@flixcam.rent' },
    update: { passwordHash: adminPasswordHash },
    create: {
      email: 'admin@flixcam.rent',
      passwordHash: adminPasswordHash,
      name: 'Admin User',
      phone: '+966501234567',
      role: 'ADMIN',
      status: 'active',
      createdBy: 'system',
    },
  })
  console.log('✅ Created admin user:', admin.email, '(password: admin123)')

  // 1b. Create Test Account
  const testPasswordHash = await bcrypt.hash('test123', 10)
  const testUser = await prisma.user.upsert({
    where: { email: 'test@flixcam.rent' },
    update: {},
    create: {
      email: 'test@flixcam.rent',
      passwordHash: testPasswordHash,
      name: 'Test User',
      phone: '+966500000001',
      role: 'ADMIN',
      status: 'active',
      createdBy: 'system',
    },
  })
  console.log('✅ Created test user:', testUser.email, '(password: test123)')

  // 2. Create Permissions
  const permissions = [
    { name: 'booking.create', description: 'Create bookings' },
    { name: 'booking.edit', description: 'Edit bookings' },
    { name: 'booking.delete', description: 'Delete bookings' },
    { name: 'booking.view', description: 'View bookings' },
    { name: 'equipment.create', description: 'Create equipment' },
    { name: 'equipment.edit', description: 'Edit equipment' },
    { name: 'equipment.delete', description: 'Delete equipment' },
    { name: 'equipment.view', description: 'View equipment' },
    { name: 'payment.process', description: 'Process payments' },
    { name: 'payment.refund', description: 'Refund payments' },
    { name: 'payment.approve', description: 'Approve payments' },
    { name: 'user.create', description: 'Create users' },
    { name: 'user.edit', description: 'Edit users' },
    { name: 'user.delete', description: 'Delete users' },
    { name: 'user.view', description: 'View users' },
    { name: 'audit.view', description: 'View audit logs' },
    { name: 'audit.export', description: 'Export audit logs' },
    { name: 'settings.read', description: 'Read settings (FAQ, policies, banners)' },
    { name: 'settings.update', description: 'Update settings (FAQ, policies, banners)' },
    { name: 'settings.edit', description: 'Edit settings' },
    { name: 'settings.view', description: 'View settings' },
  ]

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: { ...perm, createdBy: admin.id },
    })
  }
  console.log(`✅ Created ${permissions.length} permissions`)

  // 3. Assign all permissions to admin + test user
  for (const user of [admin, testUser]) {
    for (const perm of permissions) {
      const permission = await prisma.permission.findUnique({ where: { name: perm.name } })
      if (permission) {
        await prisma.userPermission.upsert({
          where: { userId_permissionId: { userId: user.id, permissionId: permission.id } },
          update: {},
          create: { userId: user.id, permissionId: permission.id, createdBy: admin.id },
        })
      }
    }
  }
  console.log('✅ Assigned all permissions to admin & test user')

  // 4. Create ALL Categories (12 categories matching Excel sheets)
  const createdCategories: Record<string, { id: string; name: string; slug: string }> = {}
  for (const cat of CATEGORIES) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description },
      create: { ...cat, createdBy: admin.id },
    })
    createdCategories[cat.slug] = category
  }
  console.log(`✅ Created ${CATEGORIES.length} categories`)

  // 4b. Create subcategories under Lighting so the equipment page category bar shows a second row
  const LIGHTING_SUBCATEGORIES = [
    { name: 'LED Panels', slug: 'led-panels', description: 'LED panels and mat lights' },
    { name: 'COB Lights', slug: 'cob-lights', description: 'COB and fresnel-style lights' },
    {
      name: 'Softboxes & Modifiers',
      slug: 'lighting-modifiers',
      description: 'Softboxes, diffusers, and modifiers for lighting',
    },
  ]
  const lightingParent = createdCategories['lighting']
  if (lightingParent) {
    for (const sub of LIGHTING_SUBCATEGORIES) {
      await prisma.category.upsert({
        where: { slug: sub.slug },
        update: {
          name: sub.name,
          description: sub.description ?? null,
          parentId: lightingParent.id,
          updatedBy: admin.id,
        },
        create: {
          name: sub.name,
          slug: sub.slug,
          description: sub.description ?? null,
          parentId: lightingParent.id,
          createdBy: admin.id,
        },
      })
    }
    console.log(`✅ Created ${LIGHTING_SUBCATEGORIES.length} Lighting subcategories`)
  }

  // 5. Create ALL Brands (39 brands covering all manufacturers in inventory)
  const createdBrands: Record<string, { id: string; name: string; slug: string }> = {}
  for (const brand of BRANDS) {
    const created = await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: { name: brand.name, description: brand.description },
      create: { ...brand, createdBy: admin.id },
    })
    createdBrands[brand.slug] = created
  }
  console.log(`✅ Created ${BRANDS.length} brands`)

  // 6. Create ALL Equipment (from Flix Stock inventory Excel)
  let createdCount = 0
  let featuredCount = 0
  const createdEquipmentIds: { id: string; sku: string; categorySlug: string }[] = []

  for (const item of ALL_EQUIPMENT) {
    const category = createdCategories[item.categorySlug]
    const brand = createdBrands[item.brandSlug]

    if (!category) {
      console.warn(`⚠️ Category not found for ${item.sku}: ${item.categorySlug}`)
      continue
    }

    const equipment = await prisma.equipment.upsert({
      where: { sku: item.sku },
      update: {
        model: item.model,
        categoryId: category.id,
        brandId: brand?.id || null,
        condition: item.condition,
        quantityTotal: item.quantityTotal,
        quantityAvailable: item.quantityAvailable,
        dailyPrice: item.dailyPrice,
        weeklyPrice: item.weeklyPrice || null,
        monthlyPrice: item.monthlyPrice || null,
        featured: item.featured,
        isActive: item.isActive,
        warehouseLocation: item.warehouseLocation,
        barcode: item.barcode,
        budgetTier: item.budgetTier || null,
        specifications: item.specifications != null ? (item.specifications as object) : undefined,
        updatedBy: admin.id,
      },
      create: {
        sku: item.sku,
        model: item.model,
        categoryId: category.id,
        brandId: brand?.id || null,
        condition: item.condition,
        quantityTotal: item.quantityTotal,
        quantityAvailable: item.quantityAvailable,
        dailyPrice: item.dailyPrice,
        weeklyPrice: item.weeklyPrice || null,
        monthlyPrice: item.monthlyPrice || null,
        featured: item.featured,
        isActive: item.isActive,
        warehouseLocation: item.warehouseLocation,
        barcode: item.barcode,
        budgetTier: item.budgetTier || null,
        specifications: item.specifications != null ? (item.specifications as object) : undefined,
        createdBy: admin.id,
      },
    })

    createdEquipmentIds.push({ id: equipment.id, sku: item.sku, categorySlug: item.categorySlug })
    createdCount++
    if (item.featured) featuredCount++

    // Create Media record for product image
    if (item.imageUrl) {
      // Delete existing media for this equipment to avoid duplicates
      await prisma.media.deleteMany({ where: { equipmentId: equipment.id } })
      await prisma.media.create({
        data: {
          url: item.imageUrl,
          type: 'image',
          filename: `${item.sku.toLowerCase()}.jpg`,
          mimeType: 'image/jpeg',
          equipmentId: equipment.id,
          createdBy: admin.id,
        },
      })
    }

    // Create Translation records for key items (English name + description)
    const translationFields = [
      { field: 'name', language: 'en', value: item.model },
      { field: 'name', language: 'ar', value: item.model }, // Use English name as fallback for Arabic
    ]

    if (item.boxContents) {
      translationFields.push({ field: 'box_contents', language: 'en', value: item.boxContents })
    }

    for (const t of translationFields) {
      await prisma.translation.upsert({
        where: {
          entityType_entityId_field_language: {
            entityType: 'equipment',
            entityId: equipment.id,
            field: t.field,
            language: t.language,
          },
        },
        update: { value: t.value },
        create: {
          entityType: 'equipment',
          entityId: equipment.id,
          field: t.field,
          language: t.language,
          value: t.value,
          createdBy: admin.id,
        },
      })
    }
  }
  console.log(
    `✅ Created ${createdCount} equipment items (${featuredCount} featured) with media & translations`
  )

  // 6b. Sync Equipment → Product (so AI dashboard has data; Product.id = Equipment.id for link consistency)
  const defaultBrandId = createdBrands['generic']?.id ?? Object.values(createdBrands)[0]?.id
  if (!defaultBrandId) {
    console.warn('⚠️ No brand found; skipping Product sync for AI dashboard')
  } else {
    const equipmentWithMedia = await prisma.equipment.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        sku: true,
        model: true,
        categoryId: true,
        brandId: true,
        dailyPrice: true,
        weeklyPrice: true,
        monthlyPrice: true,
        media: { take: 1, orderBy: { createdAt: 'asc' }, select: { url: true } },
      },
    })
    const PLACEHOLDER_IMAGE = 'https://placehold.co/400x300?text=Equipment'
    let productCount = 0
    for (const eq of equipmentWithMedia) {
      const featuredImage = eq.media[0]?.url ?? PLACEHOLDER_IMAGE
      const brandId = eq.brandId ?? defaultBrandId
      // Quality score: need longDesc >= 100 chars (15 pts) and 4+ images (30 pts). Seed 4 images so score can reach 100.
      const galleryImages = [featuredImage, featuredImage, featuredImage] as string[]
      await prisma.product.upsert({
        where: { id: eq.id },
        update: {
          sku: eq.sku,
          brandId,
          categoryId: eq.categoryId,
          featuredImage,
          galleryImages: galleryImages as object,
          priceDaily: eq.dailyPrice,
          priceWeekly: eq.weeklyPrice ?? undefined,
          priceMonthly: eq.monthlyPrice ?? undefined,
          updatedBy: admin.id,
        },
        create: {
          id: eq.id,
          sku: eq.sku,
          brandId,
          categoryId: eq.categoryId,
          featuredImage,
          galleryImages: galleryImages as object,
          priceDaily: eq.dailyPrice,
          priceWeekly: eq.weeklyPrice ?? undefined,
          priceMonthly: eq.monthlyPrice ?? undefined,
          createdBy: admin.id,
        },
      })
      const name = eq.model ?? eq.sku
      const shortDesc = `Rental equipment: ${name}.`
      // longDesc must be >= 100 chars for quality scorer to award 15 points (else all products score 63)
      const longDesc = `Professional rental equipment: ${name} (SKU: ${eq.sku}). Available for daily, weekly and monthly hire. Suitable for film, broadcast and events. Contact us for availability and pricing.`
      const seoTitle = `${name} | FlixCam Rental`
      const seoDesc = `Rent ${name}. SKU: ${eq.sku}.`
      const seoKeywords = `${eq.sku}, ${name}, rental, equipment`
      for (const locale of [
        TranslationLocale.en,
        TranslationLocale.ar,
        TranslationLocale.zh,
      ] as const) {
        await prisma.productTranslation.upsert({
          where: {
            productId_locale: { productId: eq.id, locale },
          },
          update: {
            name,
            shortDescription: shortDesc,
            longDescription: longDesc,
            seoTitle,
            seoDescription: seoDesc,
            seoKeywords,
            updatedBy: admin.id,
          },
          create: {
            productId: eq.id,
            locale,
            name,
            shortDescription: shortDesc,
            longDescription: longDesc,
            seoTitle,
            seoDescription: seoDesc,
            seoKeywords,
            createdBy: admin.id,
          },
        })
      }
      productCount++
    }
    console.log(`✅ Synced ${productCount} Products from Equipment (AI dashboard will show items)`)
  }

  // 7. Shoot Types (Smart Kit Builder)
  const shootTypeDefs = [
    {
      name: 'Wedding',
      slug: 'wedding',
      description: 'Full-day coverage: ceremony, reception, details.',
      icon: 'Heart',
      sortOrder: 0,
      categorySlugs: ['cameras', 'lenses', 'lighting', 'audio', 'grip'],
    },
    {
      name: 'Commercial / Advertising',
      slug: 'commercial',
      description: 'High-end spots and product shots.',
      icon: 'Tv',
      sortOrder: 1,
      categorySlugs: ['cameras', 'lenses', 'lighting', 'audio', 'grip'],
    },
    {
      name: 'Product Photography',
      slug: 'product',
      description: 'Stills and motion for e-commerce and catalogs.',
      icon: 'Package',
      sortOrder: 2,
      categorySlugs: ['cameras', 'lenses', 'lighting'],
    },
    {
      name: 'Event Coverage',
      slug: 'event',
      description: 'Conferences, galas, and live events.',
      icon: 'Calendar',
      sortOrder: 3,
      categorySlugs: ['cameras', 'lenses', 'lighting', 'audio'],
    },
    {
      name: 'Interview / Talking Head',
      slug: 'interview',
      description: 'Single or multi-cam interviews.',
      icon: 'Mic',
      sortOrder: 4,
      categorySlugs: ['cameras', 'lenses', 'lighting', 'audio'],
    },
    {
      name: 'Documentary',
      slug: 'documentary',
      description: 'Run-and-gun and sit-down interviews.',
      icon: 'Film',
      sortOrder: 5,
      categorySlugs: ['cameras', 'lenses', 'lighting', 'audio', 'grip'],
    },
    {
      name: 'Music Video',
      slug: 'music-video',
      description: 'Performance and narrative music videos.',
      icon: 'Music',
      sortOrder: 6,
      categorySlugs: ['cameras', 'lenses', 'lighting', 'audio', 'grip'],
    },
    {
      name: 'Short Film / Narrative',
      slug: 'short-film',
      description: 'Scripted narrative and short films.',
      icon: 'Clapperboard',
      sortOrder: 7,
      categorySlugs: ['cameras', 'lenses', 'lighting', 'audio', 'grip'],
    },
    {
      name: 'Social Media / Content',
      slug: 'social-media',
      description: 'Reels, vlogs, and social content.',
      icon: 'Share2',
      sortOrder: 8,
      categorySlugs: ['cameras', 'lenses', 'lighting', 'audio'],
    },
    {
      name: 'Real Estate',
      slug: 'real-estate',
      description: 'Property tours and stills.',
      icon: 'Home',
      sortOrder: 9,
      categorySlugs: ['cameras', 'lenses', 'lighting'],
    },
    {
      name: 'Corporate / Training',
      slug: 'corporate',
      description: 'Training videos and internal comms.',
      icon: 'Briefcase',
      sortOrder: 10,
      categorySlugs: ['cameras', 'lenses', 'lighting', 'audio'],
    },
    {
      name: 'Live Streaming',
      slug: 'live-streaming',
      description: 'Multi-cam live streams and webcasts.',
      icon: 'Radio',
      sortOrder: 11,
      categorySlugs: ['cameras', 'lenses', 'lighting', 'audio'],
    },
  ]

  const questionnaireSample = [
    {
      id: 'environment',
      question: 'Indoor or Outdoor?',
      questionAr: 'داخلي أم خارجي؟',
      type: 'single_choice',
      options: [
        { id: 'indoor', label: 'Indoor', labelAr: 'داخلي', icon: 'building' },
        { id: 'outdoor', label: 'Outdoor', labelAr: 'خارجي', icon: 'sun' },
        { id: 'both', label: 'Both', labelAr: 'كلاهما', icon: 'layers' },
      ],
    },
    {
      id: 'crew_size',
      question: 'Crew size?',
      questionAr: 'حجم الفريق؟',
      type: 'single_choice',
      options: [
        { id: 'solo', label: 'Solo', labelAr: 'فردي' },
        { id: 'small', label: '2-3 people', labelAr: '2-3 أشخاص' },
        { id: 'large', label: '4+ people', labelAr: '+4 أشخاص' },
      ],
    },
  ]

  const createdShootTypes: { id: string; slug: string }[] = []
  for (const def of shootTypeDefs) {
    const st = await prisma.shootType.upsert({
      where: { slug: def.slug },
      update: {
        name: def.name,
        description: def.description,
        icon: def.icon,
        sortOrder: def.sortOrder,
        isActive: true,
        questionnaire: questionnaireSample as object,
        updatedBy: admin.id,
      },
      create: {
        name: def.name,
        slug: def.slug,
        description: def.description,
        icon: def.icon,
        sortOrder: def.sortOrder,
        isActive: true,
        questionnaire: questionnaireSample as object,
        createdBy: admin.id,
      },
    })
    createdShootTypes.push({ id: st.id, slug: st.slug })

    // Create category flows
    for (let i = 0; i < def.categorySlugs.length; i++) {
      const cat = createdCategories[def.categorySlugs[i]]
      if (!cat) continue
      await prisma.shootTypeCategoryFlow.upsert({
        where: { shootTypeId_categoryId: { shootTypeId: st.id, categoryId: cat.id } },
        update: { sortOrder: i, isRequired: i < 2, stepTitle: `Choose ${cat.name}` },
        create: {
          shootTypeId: st.id,
          categoryId: cat.id,
          sortOrder: i,
          isRequired: i < 2,
          minRecommended: i === 0 ? 1 : null,
          stepTitle: `Choose ${cat.name}`,
        },
      })
    }
  }
  console.log(`✅ Created ${shootTypeDefs.length} shoot types with category flows`)

  // 8. Shoot Type Recommendations (map popular equipment to shoot types)
  const recommendationMap: Record<string, { skus: string[]; tier: BudgetTier }[]> = {
    all: [
      { skus: ['CAM-A7S3', 'LENS-SIGMA-2470', 'SND-RODE-MIC'], tier: BudgetTier.ESSENTIAL },
      {
        skus: [
          'CAM-A7S3',
          'LENS-SIGMA-2470',
          'ACC-NUCLEUS-M',
          'LGT-APT-300D',
          'SND-SENN-EW4G',
          'STAB-RS4-PRO',
        ],
        tier: BudgetTier.PROFESSIONAL,
      },
      {
        skus: [
          'CAM-A7R5',
          'LENS-ARRI-UP',
          'ACC-TERADEK-B6',
          'LGT-APT-600C',
          'LGT-ASTERA-8P',
          'SND-ZOOM-F6',
          'STAB-EASYRIG',
          'MON-ATOMOS-24',
        ],
        tier: BudgetTier.PREMIUM,
      },
    ],
  }

  const allEquipmentDb = await prisma.equipment.findMany({
    where: { sku: { in: ALL_EQUIPMENT.map((e) => e.sku) } },
    select: { id: true, sku: true },
  })
  const equipBySku = Object.fromEntries(allEquipmentDb.map((e) => [e.sku, e]))

  for (const st of createdShootTypes) {
    const recs = recommendationMap['all'] || []
    for (const rec of recs) {
      for (let idx = 0; idx < rec.skus.length; idx++) {
        const eq = equipBySku[rec.skus[idx]]
        if (!eq) continue
        await prisma.shootTypeRecommendation.upsert({
          where: {
            shootTypeId_equipmentId_budgetTier: {
              shootTypeId: st.id,
              equipmentId: eq.id,
              budgetTier: rec.tier,
            },
          },
          update: {
            reason: `Recommended for ${st.slug} shoots`,
            sortOrder: idx,
            defaultQuantity: 1,
          },
          create: {
            shootTypeId: st.id,
            equipmentId: eq.id,
            budgetTier: rec.tier,
            reason: `Recommended for ${st.slug} shoots`,
            sortOrder: idx,
            defaultQuantity: 1,
            isAutoSelect: idx === 0,
          },
        })
      }
    }
  }
  console.log('✅ Created shoot type recommendations for all tiers')

  // 9. Feature Flags
  const featureFlags = [
    // Integrations & Payments
    {
      name: 'enable_booking_checkout',
      description: 'Enable booking checkout flow',
      enabled: true,
      scope: FeatureFlagScope.MODULE,
      requiresApproval: false,
    },
    {
      name: 'enable_payments',
      description: 'Enable payment processing',
      enabled: true,
      scope: FeatureFlagScope.INTEGRATION,
      requiresApproval: false,
    },
    {
      name: 'enable_whatsapp',
      description: 'Enable WhatsApp notifications',
      enabled: false,
      scope: FeatureFlagScope.INTEGRATION,
      requiresApproval: false,
    },
    // System
    {
      name: 'enable_ai_recommendations',
      description: 'Enable AI equipment recommendations',
      enabled: false,
      scope: FeatureFlagScope.MODULE,
      requiresApproval: true,
    },
    {
      name: 'maintenance_mode',
      description: 'Maintenance mode - read-only access',
      enabled: false,
      scope: FeatureFlagScope.EMERGENCY,
      requiresApproval: true,
    },
    // Build Your Kit
    {
      name: 'smart-kit-builder',
      description: 'Smart Kit Builder – shoot type, budget tier, dynamic category flow',
      enabled: true,
      scope: FeatureFlagScope.UI,
      requiresApproval: false,
    },
    {
      name: 'kit-ai-assistant',
      description: 'Floating AI chat widget on Build Your Kit',
      enabled: true,
      scope: FeatureFlagScope.INTEGRATION,
      requiresApproval: false,
    },
    {
      name: 'kit-prebuilt-comparison',
      description: 'Pre-built kit comparison at summary step',
      enabled: true,
      scope: FeatureFlagScope.UI,
      requiresApproval: false,
    },
    // Public Website
    {
      name: 'enable_build_kit',
      description: 'Show or hide the Build Your Kit page and navigation links',
      enabled: true,
      scope: FeatureFlagScope.MODULE,
      requiresApproval: false,
    },
    {
      name: 'enable_equipment_catalog',
      description: 'Show /equipment page and nav links',
      enabled: true,
      scope: FeatureFlagScope.MODULE,
      requiresApproval: false,
    },
    {
      name: 'enable_studios',
      description: 'Show /studios page and nav links',
      enabled: true,
      scope: FeatureFlagScope.MODULE,
      requiresApproval: false,
    },
    {
      name: 'enable_packages',
      description: 'Show /packages page and nav links',
      enabled: true,
      scope: FeatureFlagScope.MODULE,
      requiresApproval: false,
    },
    {
      name: 'enable_how_it_works',
      description: 'Show /how-it-works page and nav links',
      enabled: true,
      scope: FeatureFlagScope.MODULE,
      requiresApproval: false,
    },
    {
      name: 'enable_support',
      description: 'Show /support page and nav links',
      enabled: true,
      scope: FeatureFlagScope.MODULE,
      requiresApproval: false,
    },
    {
      name: 'enable_whatsapp_cta',
      description: 'Show floating WhatsApp button on public site',
      enabled: true,
      scope: FeatureFlagScope.UI,
      requiresApproval: false,
    },
    {
      name: 'enable_home_kit_teaser',
      description: 'Show "Build Your Kit" teaser banner on the homepage',
      enabled: false,
      scope: FeatureFlagScope.UI,
      requiresApproval: false,
    },
    // Control Panel (Admin Sidebar)
    {
      name: 'enable_admin_ai',
      description: 'Show AI Features in admin sidebar',
      enabled: true,
      scope: FeatureFlagScope.MODULE,
      requiresApproval: false,
    },
    {
      name: 'enable_admin_kit_builder',
      description: 'Show Kit Builder in admin sidebar',
      enabled: true,
      scope: FeatureFlagScope.MODULE,
      requiresApproval: false,
    },
    {
      name: 'enable_admin_shoot_types',
      description: 'Show Shoot Types in admin sidebar',
      enabled: true,
      scope: FeatureFlagScope.MODULE,
      requiresApproval: false,
    },
    {
      name: 'enable_admin_dynamic_pricing',
      description: 'Show Dynamic Pricing in admin sidebar',
      enabled: true,
      scope: FeatureFlagScope.MODULE,
      requiresApproval: false,
    },
    {
      name: 'enable_admin_ai_recommendations',
      description: 'Show AI Recommendations in admin sidebar',
      enabled: true,
      scope: FeatureFlagScope.MODULE,
      requiresApproval: false,
    },
    {
      name: 'enable_admin_vendors',
      description: 'Show Vendors section in admin sidebar',
      enabled: true,
      scope: FeatureFlagScope.MODULE,
      requiresApproval: false,
    },
    {
      name: 'enable_admin_marketing',
      description: 'Show Marketing in admin sidebar',
      enabled: true,
      scope: FeatureFlagScope.MODULE,
      requiresApproval: false,
    },
    {
      name: 'enable_admin_coupons',
      description: 'Show Coupons in admin sidebar',
      enabled: true,
      scope: FeatureFlagScope.MODULE,
      requiresApproval: false,
    },
    {
      name: 'enable_admin_live_ops',
      description: 'Show Live Operations in admin sidebar',
      enabled: true,
      scope: FeatureFlagScope.MODULE,
      requiresApproval: false,
    },
    {
      name: 'enable_admin_analytics',
      description: 'Show Analytics in admin sidebar',
      enabled: true,
      scope: FeatureFlagScope.MODULE,
      requiresApproval: false,
    },
  ]

  for (const flag of featureFlags) {
    await prisma.featureFlag.upsert({
      where: { name: flag.name },
      update: {},
      create: { ...flag, createdBy: admin.id },
    })
  }
  console.log(`✅ Created ${featureFlags.length} feature flags`)

  // 10. Sample Notifications
  const sampleNotifications = [
    {
      id: 'seed-notif-1',
      type: 'booking.confirmed',
      title: 'Booking Confirmed',
      message: 'Booking #BK-001 has been confirmed.',
      channel: NotificationChannel.IN_APP,
      userId: admin.id,
    },
    {
      id: 'seed-notif-2',
      type: 'payment.success',
      title: 'Payment Successful',
      message: 'Payment of 1,500 SAR has been processed successfully.',
      channel: NotificationChannel.IN_APP,
      userId: admin.id,
    },
    {
      id: 'seed-notif-3',
      type: 'contract.signed',
      title: 'Contract Signed',
      message: 'Contract for booking #BK-001 has been signed.',
      channel: NotificationChannel.IN_APP,
      userId: admin.id,
    },
  ]
  for (const n of sampleNotifications) {
    const { id, ...data } = n
    await prisma.notification.upsert({
      where: { id },
      update: {},
      create: { id, ...data, data: {}, read: false, createdBy: admin.id },
    })
  }
  console.log(`✅ Created ${sampleNotifications.length} sample notifications`)

  // 11. Hero Banner (home page carousel) – use reliable Unsplash cinema images
  const HERO_SLIDE_IMAGES = [
    'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1920&h=800&fit=crop&q=80', // Film production set
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1920&h=800&fit=crop&q=80', // Camera and audio equipment
    'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1920&h=800&fit=crop&q=80', // Cinema/studio setup
    'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=1920&h=800&fit=crop&q=80', // Lighting rig on set
    'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1920&h=800&fit=crop&q=80', // Recording studio
    'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=1920&h=800&fit=crop&q=80', // Drone / aerial filming
  ]
  const heroBanner = await prisma.heroBanner.upsert({
    where: { pageSlug: 'home' },
    update: {},
    create: {
      name: 'Homepage Hero',
      pageSlug: 'home',
      isActive: true,
      autoPlay: true,
      autoPlayInterval: 6000,
      transitionType: 'fade',
      createdBy: admin.id,
      updatedAt: new Date(),
    },
  })

  const heroSlidesData = [
    {
      order: 0,
      imageUrl: HERO_SLIDE_IMAGES[0],
      titleAr: 'تأجير معدات سينمائية واستوديوهات',
      titleEn: 'Cinematic Equipment & Studio Rental',
      titleZh: '影视设备与工作室租赁',
      subtitleAr: 'احجز المعدات والاستوديوهات المناسبة لمشروعك في الرياض',
      subtitleEn: 'Book the right equipment and studios for your project in Riyadh',
      subtitleZh: '在利雅得为您的项目预订合适的设备和工作室',
      ctaTextAr: 'احجز الآن',
      ctaTextEn: 'Book Now',
      ctaTextZh: '立即预订',
      ctaUrl: '/equipment',
      ctaStyle: 'primary',
      cta2TextAr: 'استكشف الاستوديوهات',
      cta2TextEn: 'Explore Studios',
      cta2TextZh: '探索工作室',
      cta2Url: '/studios',
      cta2Style: 'outline',
    },
    {
      order: 1,
      imageUrl: HERO_SLIDE_IMAGES[1],
      titleAr: 'معدات احترافية للإنتاج السينمائي',
      titleEn: 'Professional Gear for Film Production',
      titleZh: '专业影视制作设备',
      subtitleAr: 'كاميرات، عدسات، إضاءة ومعدات دعم من أفضل العلامات',
      subtitleEn: 'Cameras, lenses, lighting and support from top brands',
      subtitleZh: '顶级品牌的相机、镜头、灯光与支撑设备',
      ctaTextAr: 'عرض المعدات',
      ctaTextEn: 'Browse Equipment',
      ctaTextZh: '浏览设备',
      ctaUrl: '/equipment',
      ctaStyle: 'primary',
    },
    {
      order: 2,
      imageUrl: HERO_SLIDE_IMAGES[2],
      titleAr: 'ابن مجموعتك المثالية',
      titleEn: 'Build Your Perfect Kit',
      titleZh: '打造您的完美套件',
      subtitleAr: 'اختر نوع التصوير والميزانية واحصل على توصيات ذكية',
      subtitleEn: 'Pick your shoot type and budget, get smart recommendations',
      subtitleZh: '选择拍摄类型和预算，获得智能推荐',
      ctaTextAr: 'ابدأ الآن',
      ctaTextEn: 'Build Your Kit',
      ctaTextZh: '开始搭配',
      ctaUrl: '/build-your-kit',
      ctaStyle: 'primary',
    },
    {
      order: 3,
      imageUrl: HERO_SLIDE_IMAGES[3],
      titleAr: 'إضاءة احترافية لكل مشهد',
      titleEn: 'Professional Lighting for Every Scene',
      titleZh: '每个场景的专业灯光',
      subtitleAr: 'معدات إضاءة متقدمة من أشهر العلامات التجارية العالمية',
      subtitleEn: "Advanced lighting gear from the world's most renowned brands",
      subtitleZh: '来自全球知名品牌的先进灯光设备',
      ctaTextAr: 'تصفح الإضاءة',
      ctaTextEn: 'Browse Lighting',
      ctaTextZh: '浏览灯光',
      ctaUrl: '/equipment?category=lighting',
      ctaStyle: 'primary',
    },
    {
      order: 4,
      imageUrl: HERO_SLIDE_IMAGES[4],
      titleAr: 'استوديوهات جاهزة للتصوير',
      titleEn: 'Production-Ready Studios',
      titleZh: '即用型专业工作室',
      subtitleAr: 'استوديوهات مجهزة بالكامل للتصوير والتسجيل والبث المباشر',
      subtitleEn: 'Fully equipped studios for filming, recording and live streaming',
      subtitleZh: '配备齐全的工作室，适用于拍摄、录制和直播',
      ctaTextAr: 'احجز استوديو',
      ctaTextEn: 'Book a Studio',
      ctaTextZh: '预订工作室',
      ctaUrl: '/studios',
      ctaStyle: 'primary',
      cta2TextAr: 'شاهد الباقات',
      cta2TextEn: 'View Packages',
      cta2TextZh: '查看套餐',
      cta2Url: '/packages',
      cta2Style: 'outline',
    },
    {
      order: 5,
      imageUrl: HERO_SLIDE_IMAGES[5],
      titleAr: 'تصوير جوي بطائرات درون',
      titleEn: 'Aerial Filming with Drones',
      titleZh: '无人机航拍服务',
      subtitleAr: 'طائرات درون سينمائية لتصوير المشاهد الجوية بدقة عالية',
      subtitleEn: 'Cinema-grade drones for stunning high-resolution aerial shots',
      subtitleZh: '电影级无人机，拍摄令人惊叹的高清航拍画面',
      ctaTextAr: 'استكشف الدرونز',
      ctaTextEn: 'Explore Drones',
      ctaTextZh: '探索无人机',
      ctaUrl: '/equipment?category=drones',
      ctaStyle: 'primary',
    },
  ]

  const existingSlides = await prisma.heroSlide.findMany({
    where: { bannerId: heroBanner.id, deletedAt: null },
  })
  if (existingSlides.length === 0) {
    for (const slide of heroSlidesData) {
      await prisma.heroSlide.create({
        data: {
          bannerId: heroBanner.id,
          ...slide,
          overlayOpacity: 0.3,
          textPosition: 'start',
          isActive: true,
          createdBy: admin.id,
          updatedAt: new Date(),
        },
      })
    }
    console.log(`✅ Created hero banner "home" with ${heroSlidesData.length} slides`)
  } else {
    // Update existing slides and create new ones
    const byOrder = new Map(existingSlides.map((s) => [s.order, s]))
    for (const data of heroSlidesData) {
      const slide = byOrder.get(data.order)
      if (slide) {
        await prisma.heroSlide.update({
          where: { id: slide.id },
          data: { imageUrl: data.imageUrl, updatedAt: new Date() },
        })
      } else {
        await prisma.heroSlide.create({
          data: {
            bannerId: heroBanner.id,
            ...data,
            overlayOpacity: 0.3,
            textPosition: 'start',
            isActive: true,
            createdBy: admin.id,
            updatedAt: new Date(),
          },
        })
      }
    }
    console.log(`✅ Hero banner "home" slides updated/created (${heroSlidesData.length} total)`)
  }

  // 12. Studios – comprehensive seed (5 studios with full CMS data)
  const STUDIO_IMAGES = [
    'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1200&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1200&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=1200&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1200&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1200&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1591814468924-caf88d1232e1?w=1200&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1598899134739-acd2bbe26be2?w=1200&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&h=800&fit=crop&q=80',
  ]

  const studiosSeed = [
    {
      name: 'استوديو فلوكس سينما الرئيسي',
      slug: 'flix-cinema-main',
      description:
        'استوديو تصوير سينمائي احترافي بمساحة 200 م²، مجهز بأحدث معدات الإضاءة والصوت. مثالي للإعلانات التجارية، الأفلام القصيرة، والمحتوى الرقمي. سقف بارتفاع 6 أمتار مع إمكانية التعليق.',
      capacity: 25,
      hourlyRate: 850,
      areaSqm: 200,
      studioType: 'سينمائي',
      bestUse: 'إعلانات، أفلام قصيرة، محتوى رقمي',
      address: 'طريق الملك فهد، حي العليا، الرياض 12211',
      googleMapsUrl: 'https://maps.google.com/?q=Riyadh+Al+Olaya',
      arrivalTimeFromCenter: '15 دقيقة',
      parkingNotes: 'موقف مجاني داخل المبنى',
      whatsIncluded: JSON.stringify([
        'إضاءة LED احترافية',
        'نظام صوت 5.1',
        'شاشة خضراء 6×4 م',
        'تكييف مركزي',
        'غرفة تحكم',
      ]),
      notIncluded: JSON.stringify(['معدات الكاميرا', 'طاقم التصوير']),
      hasElectricity: true,
      hasAC: true,
      hasChangingRooms: true,
      rulesText: 'يرجى الحفاظ على نظافة الاستوديو. ممنوع التدخين.',
      smokingPolicy: 'ممنوع التدخين داخل الاستوديو.',
      foodPolicy: 'يسمح بالطعام والشراب في منطقة الاستراحة فقط.',
      equipmentCarePolicy: 'المستأجر مسؤول عن أي ضرر للمعدات المقدمة.',
      cancellationPolicyShort: 'إلغاء مجاني قبل 48 ساعة. بعد ذلك تُحجز 50% من المبلغ.',
      cancellationPolicyLink: '/policies',
      reviewsText: 'تم تقييمنا من قبل أكثر من 150 عميل. معدل رضا 4.8/5.',
      whatsappNumber: '966501234567',
      metaTitle: 'استوديو فلوكس سينما الرئيسي | استئجار استوديو تصوير الرياض',
      metaDescription: 'استوديو تصوير سينمائي 200 م² في الرياض. إضاءة، صوت، شاشة خضراء. احجز الآن.',
      images: [0, 1, 2, 3, 4, 5],
      packages: [
        { name: 'نصف يوم (4 ساعات)', nameAr: 'نصف يوم (4 ساعات)', price: 3000, hours: 4, order: 0 },
        {
          name: 'يوم كامل (8 ساعات)',
          nameAr: 'يوم كامل (8 ساعات)',
          price: 5500,
          hours: 8,
          order: 1,
        },
        { name: 'باقة أسبوعية', nameAr: 'باقة أسبوعية', price: 28000, hours: 40, order: 2 },
      ],
      addons: [
        { name: 'فني إضاءة', description: 'فني متخصص للإضاءة', price: 200 },
        { name: 'معدات كاميرا إضافية', description: 'كاميرا + عدسات', price: 500 },
        { name: 'شاشة LED خلفية', description: 'شاشة LED 3×2 م', price: 350 },
      ],
      faqs: [
        { qAr: 'ما هي أوقات العمل؟', aAr: 'من 8 صباحاً حتى 10 مساءً، سبعة أيام في الأسبوع.' },
        {
          qAr: 'هل يتوفر موقف سيارات؟',
          aAr: 'نعم، موقف مجاني داخل المبنى يتسع لأكثر من 20 سيارة.',
        },
      ],
    },
    {
      name: 'استوديو البث المباشر',
      slug: 'live-stream-studio',
      description:
        'استوديو مخصص للبث المباشر والتسجيل الصوتي. مساحة 80 م² مع عزل صوتي كامل. مجهز بكاميرات 4K، خلاط بث، وشاشات مراقبة.',
      capacity: 10,
      hourlyRate: 650,
      areaSqm: 80,
      studioType: 'بث وتسجيل',
      bestUse: 'بودكاست، بث مباشر، تسجيل صوتي',
      address: 'شارع العروبة، حي النخيل، الرياض 11564',
      googleMapsUrl: 'https://maps.google.com/?q=Riyadh+Al+Nakheel',
      arrivalTimeFromCenter: '20 دقيقة',
      parkingNotes: 'موقف مدفوع في الطابق السفلي',
      whatsIncluded: JSON.stringify([
        'كاميرات 4K',
        'خلاط بث ATEM',
        'مايكروفونات احترافية',
        'إضاءة حلقة',
      ]),
      notIncluded: JSON.stringify(['مقدم برنامج', 'محرر']),
      hasElectricity: true,
      hasAC: true,
      hasChangingRooms: false,
      rulesText: 'الهدوء مطلوب في الممرات المجاورة.',
      smokingPolicy: 'ممنوع التدخين في كل المبنى.',
      foodPolicy: 'مشروبات فقط داخل الاستوديو.',
      reviewsText: 'أكثر من 80 حلقة بودكاست سُجلت هنا.',
      whatsappNumber: '966501234568',
      metaTitle: 'استوديو البث المباشر | بودكاست وبث حي الرياض',
      metaDescription: 'استوديو بودكاست وبث مباشر في الرياض. كاميرات 4K، صوت احترافي. احجز الآن.',
      images: [1, 2, 4, 5, 6],
      packages: [
        { name: 'ساعتان', nameAr: 'ساعتان', price: 1200, hours: 2, order: 0 },
        { name: 'نصف يوم', nameAr: 'نصف يوم', price: 2200, hours: 4, order: 1 },
        { name: 'يوم كامل', nameAr: 'يوم كامل', price: 4000, hours: 8, order: 2 },
      ],
      addons: [
        { name: 'محرر فيديو', description: 'محرر متخصص للبث', price: 300 },
        { name: 'جرافيكس حية', description: 'شخص لإدارة الجرافيكس', price: 250 },
      ],
      faqs: [
        { qAr: 'هل يدعم البث لـ YouTube و Facebook؟', aAr: 'نعم، يمكن البث لأي منصة مباشرة.' },
        { qAr: 'كم عدد الكاميرات المتاحة؟', aAr: '3 كاميرات 4K مع إمكانية إضافة المزيد.' },
      ],
    },
    {
      name: 'استوديو التصوير الفوتوغرافي',
      slug: 'photo-studio-riyadh',
      description:
        'استوديو تصوير فوتوغرافي 120 م² مع إضاءة طبيعية وصناعية. خلفيات متعددة، منطقة تجهيز، ومعدات إضاءة احترافية من برونكولور وبروفوتو.',
      capacity: 15,
      hourlyRate: 450,
      areaSqm: 120,
      studioType: 'فوتوغرافي',
      bestUse: 'تصوير منتجات، بورتريه، أزياء',
      address: 'طريق الأمير محمد بن عبدالعزيز، حي السليمانية، الرياض 12221',
      googleMapsUrl: 'https://maps.google.com/?q=Riyadh+Sulimaniyah',
      arrivalTimeFromCenter: '12 دقيقة',
      parkingNotes: 'موقف مجاني',
      whatsIncluded: JSON.stringify([
        'إضاءة Broncolor',
        'خلفيات بيضاء ورمادية وسوداء',
        'منطقة تجهيز',
        'مرآة كاملة',
      ]),
      notIncluded: JSON.stringify(['مصور', 'مكياج']),
      hasElectricity: true,
      hasAC: true,
      hasChangingRooms: true,
      rulesText: 'يرجى إرجاع المعدات إلى مكانها بعد الاستخدام.',
      smokingPolicy: 'ممنوع التدخين.',
      foodPolicy: 'ممنوع الأكل والشرب داخل منطقة التصوير.',
      reviewsText: 'استوديو نظيف ومجهز بشكل ممتاز. أكثر من 200 جلسة تصوير.',
      whatsappNumber: '966501234569',
      metaTitle: 'استوديو التصوير الفوتوغرافي | تصوير منتجات وبورتريه الرياض',
      metaDescription: 'استوديو تصوير فوتوغرافي 120 م² في الرياض. إضاءة احترافية، خلفيات متعددة.',
      images: [3, 4, 6, 7, 8],
      packages: [
        { name: 'ساعة واحدة', nameAr: 'ساعة واحدة', price: 450, hours: 1, order: 0 },
        { name: '3 ساعات', nameAr: '3 ساعات', price: 1200, hours: 3, order: 1 },
        { name: 'نصف يوم', nameAr: 'نصف يوم', price: 2000, hours: 4, order: 2 },
        { name: 'يوم كامل', nameAr: 'يوم كامل', price: 3500, hours: 8, order: 3 },
      ],
      addons: [
        { name: 'معدات إضاءة إضافية', description: 'وحدة إضاءة إضافية', price: 100 },
        { name: 'خلفية مخصصة', description: 'تركيب خلفية حسب الطلب', price: 150 },
        { name: 'مساعد تصوير', description: 'مساعد لمدة الجلسة', price: 200 },
      ],
      faqs: [
        { qAr: 'هل تتوفر خلفيات ملونة؟', aAr: 'نعم، أبيض، رمادي، أسود، وألوان حسب الطلب.' },
        { qAr: 'ما نوع الإضاءة؟', aAr: 'إضاءة Broncolor و Profoto احترافية.' },
      ],
    },
    {
      name: 'استوديو الشاشة الخضراء',
      slug: 'green-screen-studio',
      description:
        'استوديو 150 م² مخصص للشاشة الخضراء والتأثيرات البصرية. جدار أخضر 8×4 م، إضاءة موحدة، ومعدات مخصصة للكروما.',
      capacity: 12,
      hourlyRate: 750,
      areaSqm: 150,
      studioType: 'شاشة خضراء / VFX',
      bestUse: 'إعلانات، أفلام، محتوى رقمي',
      address: 'حي الصناعية، طريق الخرج، الرياض 14471',
      googleMapsUrl: 'https://maps.google.com/?q=Riyadh+Industrial',
      arrivalTimeFromCenter: '25 دقيقة',
      parkingNotes: 'موقف واسع مجاني',
      whatsIncluded: JSON.stringify([
        'شاشة خضراء 8×4 م',
        'إضاءة كروما موحدة',
        'منصة مرتفعة',
        'تكييف',
      ]),
      notIncluded: JSON.stringify(['محرر VFX', 'معدات تصوير']),
      hasElectricity: true,
      hasAC: true,
      hasChangingRooms: true,
      rulesText: 'ممنوع ارتداء ملابس خضراء. تجنب الظلال على الشاشة.',
      smokingPolicy: 'ممنوع التدخين.',
      foodPolicy: 'منطقة استراحة منفصلة.',
      reviewsText: 'أفضل استوديو كروما في الرياض. جودة عالية.',
      whatsappNumber: '966501234570',
      metaTitle: 'استوديو الشاشة الخضراء | تصوير كروما وتأثيرات بصرية الرياض',
      metaDescription: 'استوديو شاشة خضراء 150 م² للتأثيرات البصرية. احجز للتصوير والإعلانات.',
      images: [2, 5, 7, 8, 9],
      packages: [
        { name: 'ساعتان', nameAr: 'ساعتان', price: 1400, hours: 2, order: 0 },
        { name: 'نصف يوم', nameAr: 'نصف يوم', price: 2800, hours: 4, order: 1 },
        { name: 'يوم كامل', nameAr: 'يوم كامل', price: 5000, hours: 8, order: 2 },
      ],
      addons: [
        { name: 'محرر VFX', description: 'محرر تأثيرات بصرية', price: 400 },
        { name: 'إضاءة إضافية', description: 'وحدة إضاءة كروما إضافية', price: 150 },
      ],
      faqs: [
        { qAr: 'ما حجم الشاشة الخضراء؟', aAr: '8 أمتار عرض × 4 أمتار ارتفاع.' },
        { qAr: 'هل تقدمون خدمات المونتاج؟', aAr: 'نعم، يمكن إضافة محرر VFX كإضافة.' },
      ],
    },
    {
      name: 'استوديو الإنتاج الصغير',
      slug: 'compact-production-studio',
      description:
        'استوديو صغير 60 م² مثالي للمقابلات، التوك شو، والمحتوى السريع. سريع الإعداد، مجهز بالكامل، وبسعر مناسب.',
      capacity: 8,
      hourlyRate: 350,
      areaSqm: 60,
      studioType: 'إنتاج صغير',
      bestUse: 'مقابلات، توك شو، محتوى سريع',
      address: 'شارع الثمامة، حي العريجاء، الرياض 14215',
      googleMapsUrl: 'https://maps.google.com/?q=Riyadh+Al+Thumamah',
      arrivalTimeFromCenter: '18 دقيقة',
      parkingNotes: 'موقف أمام المبنى',
      whatsIncluded: JSON.stringify([
        'إضاءة حلقة',
        '2 كاميرات',
        'مايكروفون لافالير',
        'خلفية قماشية',
      ]),
      notIncluded: JSON.stringify(['معدات إضافية']),
      hasElectricity: true,
      hasAC: true,
      hasChangingRooms: false,
      rulesText: 'احترم مواعيد الحجز. الإعداد والإخلاء ضمن وقت الحجز.',
      smokingPolicy: 'ممنوع التدخين.',
      foodPolicy: 'مشروبات فقط.',
      reviewsText: 'استوديو عملي وسريع. مثالي للمحتوى اليومي.',
      whatsappNumber: '966501234571',
      metaTitle: 'استوديو الإنتاج الصغير | مقابلات وتوك شو الرياض',
      metaDescription: 'استوديو 60 م² للمقابلات والمحتوى السريع. احجز بسعر مناسب.',
      images: [0, 1, 3, 4, 6],
      packages: [
        { name: 'ساعة', nameAr: 'ساعة', price: 350, hours: 1, order: 0 },
        { name: 'ساعتان', nameAr: 'ساعتان', price: 650, hours: 2, order: 1 },
        { name: 'نصف يوم', nameAr: 'نصف يوم', price: 1200, hours: 4, order: 2 },
      ],
      addons: [
        { name: 'كشاف إضافي', description: 'وحدة إضاءة إضافية', price: 50 },
        { name: 'مايكروفون لاسلكي', description: 'مايك لافالير لاسلكي', price: 75 },
        { name: 'شاشة عرض', description: 'شاشة 55 بوصة للعروض', price: 100 },
      ],
      faqs: [
        { qAr: 'ما الحد الأدنى للحجز؟', aAr: 'ساعة واحدة.' },
        { qAr: 'هل يمكن الحجز في نفس اليوم؟', aAr: 'نعم، حسب التوفر. يُفضل الحجز مسبقاً.' },
      ],
    },
  ]

  let studiosCreated = 0
  for (const s of studiosSeed) {
    const existing = await prisma.studio.findFirst({ where: { slug: s.slug, deletedAt: null } })
    if (existing) continue

    const { images, packages, addons, faqs, ...studioData } = s
    const studio = await prisma.studio.create({
      data: {
        ...studioData,
        setupBuffer: 30,
        cleaningBuffer: 30,
        slotDurationMinutes: 60,
        minHours: 1,
        vatIncluded: true,
        availabilityConfidence: 'requires_review',
        createdBy: admin.id,
      },
    })

    for (let i = 0; i < images.length; i++) {
      const idx = images[i] as number
      const url = STUDIO_IMAGES[idx % STUDIO_IMAGES.length]
      await prisma.media.create({
        data: {
          url,
          type: 'image',
          filename: `studio-${studio.slug}-${i + 1}.jpg`,
          mimeType: 'image/jpeg',
          studioId: studio.id,
          sortOrder: i,
          createdBy: admin.id,
        },
      })
    }

    for (const pkg of packages) {
      await prisma.studioPackage.create({
        data: {
          studioId: studio.id,
          name: pkg.name,
          nameAr: pkg.nameAr,
          price: pkg.price,
          hours: pkg.hours,
          order: pkg.order,
          isActive: true,
          createdBy: admin.id,
        },
      })
    }

    for (const addon of addons) {
      await prisma.studioAddOn.create({
        data: {
          studioId: studio.id,
          name: addon.name,
          description: addon.description,
          price: addon.price,
          isActive: true,
          createdBy: admin.id,
        },
      })
    }

    for (let i = 0; i < faqs.length; i++) {
      const faq = faqs[i]
      await prisma.studioFaq.create({
        data: {
          studioId: studio.id,
          questionAr: faq.qAr,
          answerAr: faq.aAr,
          questionEn: faq.qAr,
          answerEn: faq.aAr,
          order: i,
          isActive: true,
          createdBy: admin.id,
        },
      })
    }

    studiosCreated++
  }
  if (studiosCreated > 0) {
    console.log(`✅ Created ${studiosCreated} studios with packages, add-ons, FAQs, and images`)
  }

  // FAQ items (homepage الأسئلة الشائعة) – seed full list (replace any existing)
  await prisma.faqItem.deleteMany({})
  const faqItems = [
    {
      questionAr: 'كيف يمكنني استئجار المعدات؟',
      questionEn: 'كيف يمكنني استئجار المعدات؟',
      questionZh: null,
      answerAr:
        'يمكنك استئجار المعدات عن طريق اختيار المنطقة (الرياض)، ثم البحث واختيار المعدات المطلوبة وتحديد مدة الإيجار، ثم تأكيد الحجز ودفع قيمة الفاتورة كاملة.',
      answerEn:
        'يمكنك استئجار المعدات عن طريق اختيار المنطقة (الرياض)، ثم البحث واختيار المعدات المطلوبة وتحديد مدة الإيجار، ثم تأكيد الحجز ودفع قيمة الفاتورة كاملة.',
      answerZh: null,
      order: 0,
      isActive: true,
    },
    {
      questionAr: 'ما طرق الدفع المتاحة؟',
      questionEn: 'ما طرق الدفع المتاحة؟',
      questionZh: null,
      answerAr:
        'الدفع يتم مقدماً بالكامل، ويمكن الدفع عبر: تابي، تمارا، فيزا، ماستر كارد، PayPal، مدى، Apple Pay. أي طلب غير مدفوع يُلغى بعد ساعتين.',
      answerEn:
        'الدفع يتم مقدماً بالكامل، ويمكن الدفع عبر: تابي، تمارا، فيزا، ماستر كارد، PayPal، مدى، Apple Pay. أي طلب غير مدفوع يُلغى بعد ساعتين.',
      answerZh: null,
      order: 1,
      isActive: true,
    },
    {
      questionAr: 'هل أحتاج إلى دفع مبلغ تأمين (وديعة) أو تقديم تأمين على المعدات؟',
      questionEn: 'هل أحتاج إلى دفع مبلغ تأمين (وديعة) أو تقديم تأمين على المعدات؟',
      questionZh: null,
      answerAr:
        'نعم، قد يُطلب منك دفع تأمين نقدي أو توقيع سند لأمر حسب قيمة المعدات المستأجرة لضمان سلامتها.',
      answerEn:
        'نعم، قد يُطلب منك دفع تأمين نقدي أو توقيع سند لأمر حسب قيمة المعدات المستأجرة لضمان سلامتها.',
      answerZh: null,
      order: 2,
      isActive: true,
    },
    {
      questionAr: 'ما هي سياسة الإلغاء واسترداد المبلغ؟',
      questionEn: 'ما هي سياسة الإلغاء واسترداد المبلغ؟',
      questionZh: null,
      answerAr:
        'إذا تم الإلغاء قبل 48 ساعة من موعد الحجز، يُضاف المبلغ إلى المحفظة الإلكترونية (غير نقدي). إذا قبل 48 ساعة فلا يتم استرداد المبلغ.',
      answerEn:
        'إذا تم الإلغاء قبل 48 ساعة من موعد الحجز، يُضاف المبلغ إلى المحفظة الإلكترونية (غير نقدي). إذا قبل 48 ساعة فلا يتم استرداد المبلغ.',
      answerZh: null,
      order: 3,
      isActive: true,
    },
    {
      questionAr: 'هل يتوفر دعم فني إذا واجهت مشاكل في استخدام المعدات؟',
      questionEn: 'هل يتوفر دعم فني إذا واجهت مشاكل في استخدام المعدات؟',
      questionZh: null,
      answerAr:
        'نعم، إذا استلمت معدات معطلة أو بها ضرر، تواصل مع خدمة العملاء وأرسل فيديو يوضح الحالة لاستبدال المعدات أو استرداد المبلغ.',
      answerEn:
        'نعم، إذا استلمت معدات معطلة أو بها ضرر، تواصل مع خدمة العملاء وأرسل فيديو يوضح الحالة لاستبدال المعدات أو استرداد المبلغ.',
      answerZh: null,
      order: 4,
      isActive: true,
    },
    {
      questionAr: 'كيف يتم تسليم المعدات واستلامها؟',
      questionEn: 'كيف يتم تسليم المعدات واستلامها؟',
      questionZh: null,
      answerAr: 'يتم توصيل المعدات إلى موقعك في الرياض أو استلامها من نقطة محددة حسب الاتفاق.',
      answerEn: 'يتم توصيل المعدات إلى موقعك في الرياض أو استلامها من نقطة محددة حسب الاتفاق.',
      answerZh: null,
      order: 5,
      isActive: true,
    },
    {
      questionAr: 'ماذا لو تعطلت المعدات أو انكسر شيء أثناء فترة الإيجار؟',
      questionEn: 'ماذا لو تعطلت المعدات أو انكسر شيء أثناء فترة الإيجار؟',
      questionZh: null,
      answerAr:
        'المستأجر مسؤول عن أي ضرر أو كسر أثناء الإيجار. يتم احتساب تكلفة الإصلاح أو الاستبدال. إذا فقدت المعدات يجب دفع قيمتها بالكامل.',
      answerEn:
        'المستأجر مسؤول عن أي ضرر أو كسر أثناء الإيجار. يتم احتساب تكلفة الإصلاح أو الاستبدال. إذا فقدت المعدات يجب دفع قيمتها بالكامل.',
      answerZh: null,
      order: 6,
      isActive: true,
    },
    {
      questionAr: 'ما هي إجراءات الأمان والمسؤوليات التي تقع عليّ تجاه المعدات المستأجرة؟',
      questionEn: 'ما هي إجراءات الأمان والمسؤوليات التي تقع عليّ تجاه المعدات المستأجرة؟',
      questionZh: null,
      answerAr:
        'يجب استخدام المعدات بشكل صحيح والحفاظ على نظافتها. المسؤولية تقع على المستأجر، وقد تُفرض رسوم تنظيف إضافية (100–500 ريال).',
      answerEn:
        'يجب استخدام المعدات بشكل صحيح والحفاظ على نظافتها. المسؤولية تقع على المستأجر، وقد تُفرض رسوم تنظيف إضافية (100–500 ريال).',
      answerZh: null,
      order: 7,
      isActive: true,
    },
    {
      questionAr:
        'هل يمكنني استخدام المعدات للمناسبات الخاصة مثل حفلات الزفاف أو الفعاليات العامة؟',
      questionEn:
        'هل يمكنني استخدام المعدات للمناسبات الخاصة مثل حفلات الزفاف أو الفعاليات العامة؟',
      questionZh: null,
      answerAr: 'نعم، يمكن استئجار المعدات لأي مناسبة في الرياض مع الالتزام بشروط الاستخدام.',
      answerEn: 'نعم، يمكن استئجار المعدات لأي مناسبة في الرياض مع الالتزام بشروط الاستخدام.',
      answerZh: null,
      order: 8,
      isActive: true,
    },
    {
      questionAr: 'وش يميز فاينل عن باقي المتاجر؟',
      questionEn: 'وش يميز فاينل عن باقي المتاجر؟',
      questionZh: null,
      answerAr:
        'تنوع كبير في المعدات، سهولة الحجز، توصيل سريع داخل الرياض، دعم فني وخدمة عملاء مميزة.',
      answerEn:
        'تنوع كبير في المعدات، سهولة الحجز، توصيل سريع داخل الرياض، دعم فني وخدمة عملاء مميزة.',
      answerZh: null,
      order: 9,
      isActive: true,
    },
    {
      questionAr: 'هل ممكن فاينل يساعدني أختار المعدات المناسبة لمشروعي؟',
      questionEn: 'هل ممكن فاينل يساعدني أختار المعدات المناسبة لمشروعي؟',
      questionZh: null,
      answerAr:
        'نعم، فريق خدمة العملاء والفنيين يساعدك في اختيار المعدات الأنسب حسب نوع التصوير وميزانيتك.',
      answerEn:
        'نعم، فريق خدمة العملاء والفنيين يساعدك في اختيار المعدات الأنسب حسب نوع التصوير وميزانيتك.',
      answerZh: null,
      order: 10,
      isActive: true,
    },
    {
      questionAr: 'كيف يسهّل فاينل تجربة العميل مقارنة بالآخرين؟',
      questionEn: 'كيف يسهّل فاينل تجربة العميل مقارنة بالآخرين؟',
      questionZh: null,
      answerAr:
        'بواجهة موقع سهلة، خيارات دفع متعددة، سرعة توصيل داخل الرياض، وشفافية في الأسعار والسياسات.',
      answerEn:
        'بواجهة موقع سهلة، خيارات دفع متعددة، سرعة توصيل داخل الرياض، وشفافية في الأسعار والسياسات.',
      answerZh: null,
      order: 11,
      isActive: true,
    },
    {
      questionAr: 'ما هي مدة الإيجار الأدنى؟',
      questionEn: 'ما هي مدة الإيجار الأدنى؟',
      questionZh: null,
      answerAr: 'أقل مدة للإيجار هي 24 ساعة.',
      answerEn: 'أقل مدة للإيجار هي 24 ساعة.',
      answerZh: null,
      order: 12,
      isActive: true,
    },
    {
      questionAr: 'كيف يتم الاستلام والتسليم؟',
      questionEn: 'كيف يتم الاستلام والتسليم؟',
      questionZh: null,
      answerAr: 'استلام مباشر من الفرع في الرياض أو توصيل عبر مندوب للعنوان المحدد داخل الرياض.',
      answerEn: 'استلام مباشر من الفرع في الرياض أو توصيل عبر مندوب للعنوان المحدد داخل الرياض.',
      answerZh: null,
      order: 13,
      isActive: true,
    },
    {
      questionAr: 'هل المعدات تشمل ضمان؟',
      questionEn: 'هل المعدات تشمل ضمان؟',
      questionZh: null,
      answerAr:
        'جميع المعدات تُفحص وتُصان قبل التأجير. العميل مسؤول عن سلامتها أثناء الاستخدام، وفحص الحالة يتم بعد الاسترجاع.',
      answerEn:
        'جميع المعدات تُفحص وتُصان قبل التأجير. العميل مسؤول عن سلامتها أثناء الاستخدام، وفحص الحالة يتم بعد الاسترجاع.',
      answerZh: null,
      order: 14,
      isActive: true,
    },
    {
      questionAr: 'هل يمكن إلغاء الحجز بعد تأكيده؟',
      questionEn: 'هل يمكن إلغاء الحجز بعد تأكيده؟',
      questionZh: null,
      answerAr: 'نعم، يمكن الإلغاء وفق سياسة الإلغاء الخاصة، ويفضل التواصل مع خدمة العملاء مباشرة.',
      answerEn: 'نعم، يمكن الإلغاء وفق سياسة الإلغاء الخاصة، ويفضل التواصل مع خدمة العملاء مباشرة.',
      answerZh: null,
      order: 15,
      isActive: true,
    },
    {
      questionAr: 'ماذا لو تعطل الجهاز أثناء فترة الإيجار؟',
      questionEn: 'ماذا لو تعطل الجهاز أثناء فترة الإيجار؟',
      questionZh: null,
      answerAr: 'يرجى التواصل فورًا مع خدمة العملاء وسيتم إيجاد الحل المناسب حسب الحالة.',
      answerEn: 'يرجى التواصل فورًا مع خدمة العملاء وسيتم إيجاد الحل المناسب حسب الحالة.',
      answerZh: null,
      order: 16,
      isActive: true,
    },
    {
      questionAr: 'هل أحتاج إلى هوية أو ضمان للاستئجار؟',
      questionEn: 'هل أحتاج إلى هوية أو ضمان للاستئجار؟',
      questionZh: null,
      answerAr:
        'نعم، يشترط تقديم صورة الهوية الوطنية أو الإقامة، وقد يُطلب ضمان (سند تأميني) لبعض المعدات.',
      answerEn:
        'نعم، يشترط تقديم صورة الهوية الوطنية أو الإقامة، وقد يُطلب ضمان (سند تأميني) لبعض المعدات.',
      answerZh: null,
      order: 17,
      isActive: true,
    },
    {
      questionAr: 'هل يمكن تمديد مدة الإيجار بعد بدايتها؟',
      questionEn: 'هل يمكن تمديد مدة الإيجار بعد بدايتها؟',
      questionZh: null,
      answerAr: 'نعم، يمكن التمديد بشرط التواصل قبل انتهاء الفترة الحالية وتأكيد توفر المعدات.',
      answerEn: 'نعم، يمكن التمديد بشرط التواصل قبل انتهاء الفترة الحالية وتأكيد توفر المعدات.',
      answerZh: null,
      order: 18,
      isActive: true,
    },
  ]
  for (const item of faqItems) {
    await prisma.faqItem.create({
      data: {
        ...item,
        createdBy: admin.id,
        updatedBy: admin.id,
      },
    })
  }
  console.log(`✅ FAQ items seeded (${faqItems.length} items)`)

  // Policy items (rental policies page) – add default 6 if not already present
  const defaultPolicyItems = [
    {
      titleAr: 'التأمين',
      titleEn: 'Insurance',
      titleZh: null as string | null,
      bodyAr:
        'المعدات مغطاة بتأمين التأجير القياسي خلال فترة التأجير. قد يتوفر تنازل عن الأضرار أو تغطية أعلى عند الدفع. تنطبق استثناءات؛ راجع الشروط للتفاصيل.',
      bodyEn:
        'Equipment is covered by our standard rental insurance during the rental period. Optional damage waiver or higher coverage may be available at checkout. Exclusions apply; see terms for details.',
      bodyZh: null as string | null,
      order: 0,
      isActive: true,
    },
    {
      titleAr: 'الوديعة',
      titleEn: 'Deposit',
      titleZh: null as string | null,
      bodyAr:
        'وديعة قابلة للاسترداد (عادة 30٪ من قيمة المعدات، حد أدنى 1000 ريال، حد أقصى 50000 ريال) مطلوبة. تُطلق بعد إرجاع المعدات وفحصها. قد تُخصم مبالغ عن الأضرار أو التأخير.',
      bodyEn:
        'A refundable deposit (typically 30% of equipment value, min 1,000 SAR, max 50,000 SAR) is required. It is released after equipment is returned and inspected. Deductions may apply for damage or late return.',
      bodyZh: null as string | null,
      order: 1,
      isActive: true,
    },
    {
      titleAr: 'متطلبات الهوية',
      titleEn: 'ID Requirements',
      titleZh: null as string | null,
      bodyAr:
        'قد يُطلب بطاقة هوية حكومية سارية (الهوية الوطنية أو جواز السفر)، وللشركات السجل التجاري. قد نتحقق من الهوية قبل تسليم المعدات.',
      bodyEn:
        'Valid government-issued ID (national ID or passport) and, for companies, commercial registration may be required. We may verify identity before releasing equipment.',
      bodyZh: null as string | null,
      order: 2,
      isActive: true,
    },
    {
      titleAr: 'رسوم التأخير',
      titleEn: 'Late Fees',
      titleZh: null as string | null,
      bodyAr:
        'الإرجاع المتأخر يُحتسب بمقدار 1.5× معدل اليوم عن كل يوم أو جزء من يوم بعد تاريخ الإرجاع المتفق عليه، ما لم يتم الموافقة على تمديد مسبقاً.',
      bodyEn:
        'Late returns are charged at 1.5× the daily rate for each day or part day after the agreed return date, unless an extension was approved in advance.',
      bodyZh: null as string | null,
      order: 3,
      isActive: true,
    },
    {
      titleAr: 'الأضرار والضياع',
      titleEn: 'Damage & Loss',
      titleZh: null as string | null,
      bodyAr:
        'أنت مسؤول عن المعدات من الاستلام حتى الإرجاع. يجب الإبلاغ عن أي ضرر أو ضياع فوراً. قد تُخصم تكاليف الإصلاح أو الاستبدال من الوديعة أو تُفوتر.',
      bodyEn:
        'You are responsible for equipment from pickup until return. Damage or loss must be reported immediately. Repair or replacement costs may be deducted from the deposit or invoiced.',
      bodyZh: null as string | null,
      order: 4,
      isActive: true,
    },
    {
      titleAr: 'الإلغاء',
      titleEn: 'Cancellation',
      titleZh: null as string | null,
      bodyAr:
        'الإلغاء قبل أكثر من 48 ساعة من الاستلام: استرداد كامل مخصوماً رسوم المعالجة. خلال 48 ساعة: قد تُحجز الوديعة. الغياب يفقد الوديعة. راجع الشروط لسياسة الإلغاء الكاملة.',
      bodyEn:
        'Cancellations more than 48 hours before pickup: full refund minus a processing fee. Within 48 hours: deposit may be retained. No-shows forfeit the deposit. See terms for full cancellation policy.',
      bodyZh: null as string | null,
      order: 5,
      isActive: true,
    },
  ]
  defaultPolicyItems.push({
    titleAr: TERMS_TITLE_AR,
    titleEn: TERMS_TITLE_EN,
    titleZh: null as string | null,
    bodyAr: TERMS_BODY_AR,
    bodyEn: TERMS_BODY_EN,
    bodyZh: null as string | null,
    order: 6,
    isActive: true,
  })
  let policyAdded = 0
  for (const item of defaultPolicyItems) {
    const existing = await prisma.policyItem.findFirst({
      where: { titleEn: item.titleEn, deletedAt: null },
    })
    if (!existing) {
      await prisma.policyItem.create({
        data: {
          ...item,
          createdBy: admin.id,
          updatedBy: admin.id,
        },
      })
      policyAdded++
    }
  }
  if (policyAdded > 0) {
    console.log(`✅ Policy items added (${policyAdded} of ${defaultPolicyItems.length} defaults)`)
  }

  // Summary
  console.log('\n🎉 Comprehensive database seed completed!')
  console.log(`📊 Summary:`)
  console.log(`   - ${CATEGORIES.length} categories`)
  console.log(`   - ${BRANDS.length} brands`)
  console.log(`   - ${createdCount} equipment items (${featuredCount} featured)`)
  console.log(`   - ${createdCount} media records (real product images)`)
  console.log(`   - ${studiosCreated} studios (with packages, add-ons, FAQs, images)`)
  console.log(`   - ${createdShootTypes.length} shoot types`)
  console.log(`   - ${featureFlags.length} feature flags`)
  console.log(`   - ${permissions.length} permissions`)
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
