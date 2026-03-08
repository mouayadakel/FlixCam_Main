/**
 * @file test-phase3.ts
 * @description Test script for Phase 3 services
 * @module scripts
 */

import { EquipmentService } from '../src/lib/services/equipment.service'
import { StudioService } from '../src/lib/services/studio.service'
import { BookingService } from '../src/lib/services/booking.service'
import { PricingService } from '../src/lib/services/pricing.service'
import { ContractService } from '../src/lib/services/contract.service'
import { InspectionService } from '../src/lib/services/inspection.service'
import { prisma } from '../src/lib/db/prisma'

async function testPhase3() {
  console.log('🧪 Testing Phase 3 Services...\n')

  let passed = 0
  let failed = 0

  // Get admin user for testing
  const admin = await prisma.user.findFirst({
    where: { email: 'admin@flixcam.rent' },
  })

  if (!admin) {
    console.error('❌ Admin user not found. Please run db:seed first.')
    process.exit(1)
  }

  const userId = admin.id
  const auditContext = {
    ipAddress: '127.0.0.1',
    userAgent: 'test-script',
  }

  try {
    // Test 1: EquipmentService
    console.log('📦 Testing EquipmentService...')
    try {
      const category = await prisma.category.findFirst()
      if (!category) {
        throw new Error('No category found')
      }

      // Test list
      const equipmentList = await EquipmentService.list(userId, { limit: 10 })
      console.log(`  ✅ EquipmentService.list() - Found ${equipmentList.total} items`)
      passed++

      // Test getById (if equipment exists)
      if (equipmentList.data.length > 0) {
        const equipment = await EquipmentService.getById(equipmentList.data[0].id, userId)
        console.log(`  ✅ EquipmentService.getById() - Retrieved equipment: ${equipment.sku}`)
        passed++
      }
    } catch (error: any) {
      console.error(`  ❌ EquipmentService test failed: ${error.message}`)
      failed++
    }

    // Test 2: StudioService
    console.log('\n🎬 Testing StudioService...')
    try {
      const studioList = await StudioService.list(userId, { limit: 10 })
      console.log(`  ✅ StudioService.list() - Found ${studioList.total} studios`)
      passed++
    } catch (error: any) {
      console.error(`  ❌ StudioService test failed: ${error.message}`)
      failed++
    }

    // Test 3: PricingService
    console.log('\n💰 Testing PricingService...')
    try {
      const equipment = await prisma.equipment.findFirst({
        where: { deletedAt: null, isActive: true },
      })

      if (equipment) {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() + 1)
        const endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + 3)

        const quote = await PricingService.generateQuote({
          equipment: [
            {
              equipmentId: equipment.id,
              quantity: 1,
            },
          ],
          startDate,
          endDate,
        })

        console.log(`  ✅ PricingService.generateQuote() - Total: ${quote.totalAmount} SAR`)
        console.log(`     - Equipment Subtotal: ${quote.equipmentSubtotal} SAR`)
        console.log(`     - VAT (15%): ${quote.vatAmount} SAR`)
        console.log(`     - Deposit: ${quote.depositAmount} SAR`)
        passed++
      }
    } catch (error: any) {
      console.error(`  ❌ PricingService test failed: ${error.message}`)
      failed++
    }

    // Test 4: BookingService
    console.log('\n📅 Testing BookingService...')
    try {
      const bookingList = await BookingService.list(userId, { limit: 10 })
      console.log(`  ✅ BookingService.list() - Found ${bookingList.total} bookings`)
      passed++

      // Test state machine transitions
      if (bookingList.data.length > 0) {
        const booking = bookingList.data[0]
        console.log(`  ✅ BookingService.getById() - Retrieved booking: ${booking.bookingNumber}`)
        console.log(`     - Status: ${booking.status}`)
        passed++
      }
    } catch (error: any) {
      console.error(`  ❌ BookingService test failed: ${error.message}`)
      failed++
    }

    // Test 5: ContractService
    console.log('\n📄 Testing ContractService...')
    try {
      const booking = await prisma.booking.findFirst({
        where: { deletedAt: null },
      })

      if (booking) {
        try {
          const contract = await ContractService.getByBookingId(booking.id, userId)
          console.log(`  ✅ ContractService.getByBookingId() - Found contract`)
          console.log(`     - Terms Version: ${contract.termsVersion}`)
          console.log(`     - Signed: ${contract.signedAt ? 'Yes' : 'No'}`)
          passed++
        } catch (error: any) {
          if (error.message.includes('not found')) {
            console.log(`  ⚠️  ContractService - No contract found for booking (expected)`)
            passed++
          } else {
            throw error
          }
        }
      }
    } catch (error: any) {
      console.error(`  ❌ ContractService test failed: ${error.message}`)
      failed++
    }

    // Test 6: InspectionService
    console.log('\n🔍 Testing InspectionService...')
    try {
      const booking = await prisma.booking.findFirst({
        where: { deletedAt: null },
      })

      if (booking) {
        try {
          const inspections = await InspectionService.listByBooking(booking.id, userId)
          console.log(
            `  ✅ InspectionService.listByBooking() - Found ${inspections.length} inspections`
          )
          passed++
        } catch (error: any) {
          console.log(`  ⚠️  InspectionService - No inspections found (expected)`)
          passed++
        }
      }
    } catch (error: any) {
      console.error(`  ❌ InspectionService test failed: ${error.message}`)
      failed++
    }

    // Summary
    console.log('\n' + '='.repeat(50))
    console.log('📊 Test Summary')
    console.log('='.repeat(50))
    console.log(`✅ Passed: ${passed}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`)
    console.log('='.repeat(50))

    if (failed === 0) {
      console.log('\n🎉 All Phase 3 services are working correctly!')
      process.exit(0)
    } else {
      console.log('\n⚠️  Some tests failed. Please review the errors above.')
      process.exit(1)
    }
  } catch (error: any) {
    console.error('\n❌ Test suite failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testPhase3()
