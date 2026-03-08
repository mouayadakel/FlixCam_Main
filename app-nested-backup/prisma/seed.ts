/**
 * @file seed.ts
 * @description Comprehensive database seed with full FlixCam inventory from Excel,
 *              real product data, specifications, prices, and real product images.
 * @module prisma/seed
 */

import {
  PrismaClient,
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

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED_IN_PRODUCTION !== 'true') {
  console.error('❌ Seed is disabled in production. Set ALLOW_SEED_IN_PRODUCTION=true to override.')
  process.exit(1)
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
// MAIN SEED FUNCTION
// ============================================

async function main() {
  console.log('🌱 Starting comprehensive database seed...')
  console.log('📦 Equipment seeding disabled (no equipment items).')

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

  // 6. Equipment seeding disabled (no equipment items)
  const createdCount = 0
  const featuredCount = 0
  console.log('✅ Equipment seeding skipped (cleared)')

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
    where: { sku: { in: [] } },
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
      questionAr: 'وش يميز فليكس عن باقي المتاجر؟',
      questionEn: 'What distinguishes Flix from other stores?',
      questionZh: null,
      answerAr:
        'تنوع كبير في المعدات، سهولة الحجز، توصيل سريع داخل الرياض، دعم فني وخدمة عملاء مميزة.',
      answerEn:
        'Wide variety of equipment, easy booking, fast delivery within Riyadh, and excellent technical support and customer service.',
      answerZh: null,
      order: 9,
      isActive: true,
    },
    {
      questionAr: 'هل ممكن فليكس يساعدني أختار المعدات المناسبة لمشروعي؟',
      questionEn: 'Can Flix help me choose the right equipment for my project?',
      questionZh: null,
      answerAr:
        'نعم، فريق خدمة العملاء والفنيين يساعدك في اختيار المعدات الأنسب حسب نوع التصوير وميزانيتك.',
      answerEn:
        'Yes, our customer service and technical team will help you choose the most suitable equipment based on your shoot type and budget.',
      answerZh: null,
      order: 10,
      isActive: true,
    },
    {
      questionAr: 'كيف يسهّل فليكس تجربة العميل مقارنة بالآخرين؟',
      questionEn: 'How does Flix make the customer experience easier compared to others?',
      questionZh: null,
      answerAr:
        'بواجهة موقع سهلة، خيارات دفع متعددة، سرعة توصيل داخل الرياض، وشفافية في الأسعار والسياسات.',
      answerEn:
        'With an easy-to-use website, multiple payment options, fast delivery within Riyadh, and transparency in pricing and policies.',
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

  // Checkout form sections (Step 1: Receiver, fulfillment, etc.)
  const { seedCheckoutForm } = await import('./seed-checkout-form')
  await seedCheckoutForm()
  console.log('✅ Checkout form sections seeded (or already exist)')

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
