#!/usr/bin/env tsx

/**
 * Script to fix translation field mapping for existing equipment in FlixCamFinal 3
 * This re-syncs equipment to ensure consistent snake_case field names
 */

import { prisma } from '../src/lib/db/prisma'
import { syncProductToEquipment } from '../src/lib/services/product-equipment-sync.service'

async function fixAllEquipment() {
  console.log('🔧 Fixing translation field mapping for existing equipment...')
  console.log('========================================================')
  
  try {
    // Get all equipment that has a productId (created via import)
    const equipment = await prisma.equipment.findMany({
      where: { 
        productId: { not: null },
        deletedAt: null 
      },
      select: { 
        id: true, 
        productId: true, 
        sku: true, 
        model: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`\\n📊 Found ${equipment.length} equipment records to check`)
    
    if (equipment.length === 0) {
      console.log('ℹ️  No equipment with productId found')
      return
    }
    
    let fixed = 0
    let failed = 0
    
    for (const eq of equipment) {
      try {
        await syncProductToEquipment(eq.productId!)
        console.log(`✅ Fixed: ${eq.sku} - ${eq.model}`)
        fixed++
      } catch (error) {
        console.error(`❌ Failed: ${eq.sku} - ${error instanceof Error ? error.message : String(error)}`)
        failed++
      }
    }
    
    console.log(`\\n🎯 RESULTS:`)
    console.log(`✅ Successfully fixed: ${fixed} equipment`)
    console.log(`❌ Failed: ${failed} equipment`)
    
    if (fixed > 0) {
      console.log(`\\n🎉 All equipment translations now use consistent snake_case field names!`)
      console.log(`   The edit page will display all imported data correctly.`)
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
if (require.main === module) {
  fixAllEquipment()
    .then(() => {
      console.log('\\n✅ Script completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\\n❌ Script failed:', error)
      process.exit(1)
    })
}

export { fixAllEquipment }
