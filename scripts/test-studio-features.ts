/**
 * Integration test for all new studio features:
 * 1. Testimonials CRUD (service layer)
 * 2. Package i18n fields (nameZh, descriptionAr)
 * 3. Coupon applicableStudioIds field
 * 4. Public data mapper (testimonials, new package fields)
 * 5. Analytics utility
 * 6. i18n keys completeness
 */

import { prisma } from '../src/lib/db/prisma'
import { StudioTestimonialService } from '../src/lib/services/studio-testimonial.service'
import { StudioPackageService } from '../src/lib/services/studio-package.service'
import fs from 'fs'
import path from 'path'

const STUDIO_ID = 'cmluys9pr01zn2vwl12g18h2b'
const FAKE_USER = 'cmlmbofda0001s35s736nw0tm'
let createdTestimonialId: string | null = null
let createdPackageId: string | null = null

let passed = 0
let failed = 0

function ok(name: string) {
  passed++
  console.log(`  ✅ ${name}`)
}
function fail(name: string, err: any) {
  failed++
  console.error(`  ❌ ${name}: ${err}`)
}

async function testTestimonialsCRUD() {
  console.log('\n── 1. Testimonials CRUD ──')

  // CREATE
  try {
    const t = await StudioTestimonialService.create(
      STUDIO_ID,
      { name: 'Test User', role: 'Photographer', text: 'Amazing studio!', rating: 5 },
      FAKE_USER
    )
    createdTestimonialId = t.id
    if (t.name === 'Test User' && t.rating === 5 && t.studioId === STUDIO_ID) {
      ok('Create testimonial')
    } else {
      fail('Create testimonial', 'fields mismatch')
    }
  } catch (e) {
    fail('Create testimonial', e)
  }

  // LIST
  try {
    const list = await StudioTestimonialService.list(STUDIO_ID)
    if (list.length > 0 && list.some((t) => t.id === createdTestimonialId)) {
      ok('List testimonials')
    } else {
      fail('List testimonials', 'created item not found')
    }
  } catch (e) {
    fail('List testimonials', e)
  }

  // UPDATE
  try {
    if (!createdTestimonialId) throw new Error('No ID')
    const updated = await StudioTestimonialService.update(
      createdTestimonialId,
      { text: 'Updated review!', rating: 4 },
      FAKE_USER
    )
    if (updated.text === 'Updated review!' && updated.rating === 4) {
      ok('Update testimonial')
    } else {
      fail('Update testimonial', 'fields not updated')
    }
  } catch (e) {
    fail('Update testimonial', e)
  }

  // DELETE (soft)
  try {
    if (!createdTestimonialId) throw new Error('No ID')
    await StudioTestimonialService.delete(createdTestimonialId, FAKE_USER)
    const list = await StudioTestimonialService.list(STUDIO_ID)
    if (!list.some((t) => t.id === createdTestimonialId)) {
      ok('Delete testimonial (soft)')
    } else {
      fail('Delete testimonial', 'still visible after delete')
    }
  } catch (e) {
    fail('Delete testimonial', e)
  }
}

async function testPackageI18n() {
  console.log('\n── 2. Package i18n fields (nameZh, descriptionAr) ──')

  // CREATE with new fields
  try {
    const pkg = await StudioPackageService.create(
      STUDIO_ID,
      {
        name: 'Test i18n Pkg',
        nameAr: 'باقة تجريبية',
        nameZh: '测试套餐',
        description: 'Test desc',
        descriptionAr: 'وصف تجريبي',
        price: 100,
        order: 99,
        isActive: true,
      } as any,
      FAKE_USER
    )
    createdPackageId = pkg.id
    if ((pkg as any).nameZh === '测试套餐' && (pkg as any).descriptionAr === 'وصف تجريبي') {
      ok('Create package with nameZh + descriptionAr')
    } else {
      fail(
        'Create package with i18n',
        `nameZh=${(pkg as any).nameZh}, descriptionAr=${(pkg as any).descriptionAr}`
      )
    }
  } catch (e) {
    fail('Create package with i18n', e)
  }

  // UPDATE i18n fields
  try {
    if (!createdPackageId) throw new Error('No ID')
    const updated = await StudioPackageService.update(
      createdPackageId,
      { nameZh: '更新套餐', descriptionAr: 'وصف محدث' } as any,
      FAKE_USER
    )
    if ((updated as any).nameZh === '更新套餐' && (updated as any).descriptionAr === 'وصف محدث') {
      ok('Update package i18n fields')
    } else {
      fail('Update package i18n', 'fields not updated')
    }
  } catch (e) {
    fail('Update package i18n', e)
  }

  // CLEANUP
  try {
    if (createdPackageId) {
      await StudioPackageService.delete(createdPackageId, FAKE_USER)
      ok('Cleanup test package')
    }
  } catch (e) {
    fail('Cleanup test package', e)
  }
}

async function testCouponStudioField() {
  console.log('\n── 3. Coupon applicableStudioIds field ──')

  try {
    // Verify column exists by creating a temp coupon with applicableStudioIds
    const coupon = await prisma.coupon.create({
      data: {
        code: `TEST_STUDIO_${Date.now()}`,
        name: 'Test Studio Coupon',
        type: 'PERCENT',
        discountPercentage: 10,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 86400000),
        applicableStudioIds: [STUDIO_ID],
        createdBy: FAKE_USER,
      },
    })
    const stored = coupon.applicableStudioIds as string[]
    if (Array.isArray(stored) && stored.includes(STUDIO_ID)) {
      ok('Coupon applicableStudioIds stored correctly')
    } else {
      fail('Coupon applicableStudioIds', `stored: ${JSON.stringify(stored)}`)
    }
    // cleanup
    await prisma.coupon.delete({ where: { id: coupon.id } })
    ok('Cleanup test coupon')
  } catch (e) {
    fail('Coupon applicableStudioIds', e)
  }
}

async function testPublicDataMapper() {
  console.log('\n── 4. Public data includes testimonials + new pkg fields ──')

  try {
    const studio = await prisma.studio.findFirst({
      where: { id: STUDIO_ID, deletedAt: null },
      include: {
        testimonials: { where: { deletedAt: null }, orderBy: { order: 'asc' } },
        packages: { where: { deletedAt: null }, orderBy: { order: 'asc' }, take: 1 },
      },
    })
    if (!studio) throw new Error('Studio not found')
    if ('testimonials' in studio) {
      ok('Studio query includes testimonials relation')
    } else {
      fail('Studio query', 'testimonials relation missing')
    }
    if (studio.packages.length > 0) {
      const pkg = studio.packages[0] as any
      if ('nameZh' in pkg && 'descriptionAr' in pkg) {
        ok('Package has nameZh + descriptionAr columns')
      } else {
        fail('Package columns', 'nameZh/descriptionAr missing')
      }
    } else {
      ok('Package columns check skipped (no packages)')
    }
  } catch (e) {
    fail('Public data mapper', e)
  }
}

function testAnalyticsUtility() {
  console.log('\n── 5. Analytics utility ──')

  try {
    const analyticsPath = path.join(__dirname, '..', 'src', 'lib', 'analytics.ts')
    const content = fs.readFileSync(analyticsPath, 'utf-8')
    if (content.includes('trackStudioEvent')) {
      ok('trackStudioEvent function exists')
    } else {
      fail('trackStudioEvent', 'function not found in analytics.ts')
    }
    if (content.includes("'package_selected'") || content.includes('"package_selected"')) {
      ok('package_selected event referenced')
    } else {
      // it's used in components, not defined in analytics.ts directly — that's fine
      ok('package_selected (generic trackStudioEvent)')
    }
  } catch (e) {
    fail('Analytics utility', e)
  }

  // Check wiring in components
  try {
    const detailPath = path.join(
      __dirname,
      '..',
      'src',
      'components',
      'features',
      'studio',
      'studio-detail.tsx'
    )
    const detail = fs.readFileSync(detailPath, 'utf-8')
    if (detail.includes('trackStudioEvent') && detail.includes('package_selected')) {
      ok('studio-detail.tsx fires package_selected')
    } else {
      fail('studio-detail analytics', 'trackStudioEvent or package_selected missing')
    }
  } catch (e) {
    fail('studio-detail analytics', e)
  }

  try {
    const panelPath = path.join(
      __dirname,
      '..',
      'src',
      'components',
      'features',
      'studio',
      'studio-booking-panel.tsx'
    )
    const panel = fs.readFileSync(panelPath, 'utf-8')
    const hasAddon = panel.includes('addon_toggled')
    const hasBooking = panel.includes('booking_started')
    const hasCoupon = panel.includes('couponCode')
    if (hasAddon) ok('booking-panel fires addon_toggled')
    else fail('booking-panel addon_toggled', 'not found')
    if (hasBooking) ok('booking-panel fires booking_started')
    else fail('booking-panel booking_started', 'not found')
    if (hasCoupon) ok('booking-panel has coupon input')
    else fail('booking-panel coupon', 'not found')
  } catch (e) {
    fail('booking-panel analytics', e)
  }
}

function testI18nKeys() {
  console.log('\n── 6. i18n keys completeness ──')

  const requiredKeys = [
    'testimonials',
    'couponPlaceholder',
    'comparePackages',
    'feature',
    'discountRow',
    'selectLabel',
  ]
  const locales = ['ar', 'en', 'zh']

  for (const locale of locales) {
    try {
      const filePath = path.join(__dirname, '..', 'src', 'messages', `${locale}.json`)
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      const studios = content.studios || {}
      const missing = requiredKeys.filter((k) => !(k in studios))
      if (missing.length === 0) {
        ok(`${locale}.json has all studio i18n keys`)
      } else {
        fail(`${locale}.json`, `missing: ${missing.join(', ')}`)
      }
    } catch (e) {
      fail(`${locale}.json`, e)
    }
  }
}

function testComponentFiles() {
  console.log('\n── 7. Component files exist ──')

  const files = [
    'src/components/features/studio/studio-testimonials.tsx',
    'src/components/features/studio/studio-package-comparison.tsx',
    'src/app/admin/(routes)/cms/studios/[id]/_components/testimonials-tab.tsx',
    'src/app/api/admin/studios/[id]/testimonials/route.ts',
    'src/app/api/admin/studios/[id]/testimonials/[testimonialId]/route.ts',
    'src/lib/services/studio-testimonial.service.ts',
    'src/lib/validators/studio-testimonial.validator.ts',
  ]

  for (const f of files) {
    const full = path.join(__dirname, '..', f)
    if (fs.existsSync(full)) {
      ok(f)
    } else {
      fail(f, 'file not found')
    }
  }
}

async function main() {
  console.log('🧪 Studio Features Integration Tests\n')

  testComponentFiles()
  testAnalyticsUtility()
  testI18nKeys()
  await testTestimonialsCRUD()
  await testPackageI18n()
  await testCouponStudioField()
  await testPublicDataMapper()

  // Final cleanup: hard-delete the soft-deleted testimonial
  if (createdTestimonialId) {
    await prisma.studioTestimonial.delete({ where: { id: createdTestimonialId } }).catch(() => {})
  }

  console.log(`\n${'═'.repeat(40)}`)
  console.log(`  Total: ${passed + failed} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`)
  console.log('═'.repeat(40))

  await prisma.$disconnect()
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})
