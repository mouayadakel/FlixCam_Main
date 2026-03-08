import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- Starting Equipment Restoration ---')

    // Find all Products that are NOT deleted
    const activeProducts = await prisma.product.findMany({
        where: { deletedAt: null },
        select: { id: true }
    })
    const activeProductIds = activeProducts.map(p => p.id)

    // Find Equipment records that are soft-deleted but either:
    // 1. Have a productId that is in activeProductIds
    // 2. Their own ID is in activeProductIds
    const equipmentToRestore = await prisma.equipment.findMany({
        where: {
            deletedAt: { not: null },
            OR: [
                { productId: { in: activeProductIds } },
                { id: { in: activeProductIds } }
            ]
        },
        select: {
            id: true,
            sku: true,
            quantityTotal: true
        }
    })

    console.log(`Found ${equipmentToRestore.length} equipment records to restore.`)

    if (equipmentToRestore.length === 0) {
        console.log('No records found for restoration.')
        return
    }

    const result = await prisma.equipment.updateMany({
        where: {
            id: { in: equipmentToRestore.map(e => e.id) }
        },
        data: {
            deletedAt: null,
            deletedBy: null,
            isActive: true,
            // Restore quantityAvailable to quantityTotal as per fix plan
            // Note: updateMany doesn't support setting field to another field directly in Prisma
            // We might need to do this in a loop or transaction if they differ
        }
    })

    console.log(`Updated ${result.count} records' status.`)

    // Since we need to sync quantityAvailable = quantityTotal, and they might vary,
    // we perform this in a transaction or loop for precision if needed.
    // However, given the scale, we'll do it in chunks to be safe.

    let restoredCount = 0
    for (const eq of equipmentToRestore) {
        await prisma.equipment.update({
            where: { id: eq.id },
            data: {
                quantityAvailable: eq.quantityTotal
            }
        })
        restoredCount++
        if (restoredCount % 50 === 0) console.log(`Restored ${restoredCount} records...`)
    }

    console.log(`Successfully restored ${restoredCount} equipment records.`)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
