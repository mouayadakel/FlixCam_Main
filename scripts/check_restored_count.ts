import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const productCount = await prisma.product.count()
    const deletedProductCount = await prisma.product.count({
        where: { NOT: { deletedAt: null } }
    })

    const equipmentCount = await prisma.equipment.count()
    const activeEquipmentCount = await prisma.equipment.count({
        where: { isActive: true, deletedAt: null }
    })
    const deletedEquipmentCount = await prisma.equipment.count({
        where: { NOT: { deletedAt: null } }
    })
    const inactiveEquipmentCount = await prisma.equipment.count({
        where: { isActive: false, deletedAt: null }
    })

    console.log('--- Product Stats ---')
    console.log('Total Products:', productCount)
    console.log('Deleted Products:', deletedProductCount)
    console.log('Non-deleted Products:', productCount - deletedProductCount)

    console.log('\n--- Equipment Stats ---')
    console.log('Total Equipment:', equipmentCount)
    console.log('Active & Non-deleted Equipment:', activeEquipmentCount)
    console.log('Inactive & Non-deleted Equipment:', inactiveEquipmentCount)
    console.log('Deleted Equipment:', deletedEquipmentCount)

    const featureFlags = await prisma.featureFlag.findMany({
        where: { name: 'enable_equipment_catalog' }
    })
    console.log('\n--- Feature Flags ---')
    console.log('enable_equipment_catalog:', featureFlags[0]?.enabled ?? 'Not found')

    // Check some samples
    const sampleEquipment = await prisma.equipment.findMany({
        take: 5,
        select: { id: true, sku: true, isActive: true, deletedAt: true }
    })
    console.log('\n--- Sample Equipment ---')
    console.log(JSON.stringify(sampleEquipment, null, 2))
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
