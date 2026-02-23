/**
 * Enable equipment catalog feature flag
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function enableEquipmentCatalog() {
  try {
    console.log('Enabling equipment catalog feature flag...')

    // Update or create the feature flag
    const featureFlag = await prisma.featureFlag.upsert({
      where: { name: 'enable_equipment_catalog' },
      update: {
        enabled: true,
        description: 'Enable equipment catalog page for public access',
        scope: 'UI',
        requiresApproval: false,
      },
      create: {
        name: 'enable_equipment_catalog',
        enabled: true,
        description: 'Enable equipment catalog page for public access',
        scope: 'UI',
        requiresApproval: false,
      },
    })

    console.log('✅ Equipment catalog feature flag enabled:', featureFlag.enabled)

    // Also enable related flags
    const relatedFlags = [
      'enable_studios',
      'enable_home_kit_teaser',
      'enable_equipment_search',
      'enable_equipment_filters',
    ]

    for (const flagName of relatedFlags) {
      await prisma.featureFlag.upsert({
        where: { name: flagName },
        update: { enabled: true },
        create: {
          name: flagName,
          enabled: true,
          description: `Enable ${flagName.replace('enable_', '').replace('_', ' ')} feature`,
          scope: 'UI',
          requiresApproval: false,
        },
      })
      console.log(`✅ ${flagName} feature flag enabled`)
    }

    console.log('🎉 All equipment-related feature flags enabled!')
  } catch (error) {
    console.error('❌ Error enabling feature flags:', error)
  } finally {
    await prisma.$disconnect()
  }
}

enableEquipmentCatalog()
