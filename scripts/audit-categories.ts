import { PrismaClient } from '@prisma/client'

async function main() {
    const prisma = new PrismaClient()

    console.log('--- Category Audit ---')
    const categories = await prisma.category.findMany({
        where: { deletedAt: null },
        select: {
            id: true,
            name: true,
            equipment: {
                where: { deletedAt: null },
                select: {
                    id: true,
                    model: true,
                    isActive: true
                }
            }
        }
    })

    for (const cat of categories) {
        const total = cat.equipment.length
        const active = cat.equipment.filter(e => e.isActive).length
        console.log(`${cat.name} (${cat.id}):`)
        console.log(`  Total (not deleted): ${total}`)
        console.log(`  Active: ${active}`)
        if (active > 0 && active < 10) {
            console.log(`  Sample Active Items: ${cat.equipment.filter(e => e.isActive).map(e => e.model).join(', ')}`)
        } else if (active >= 10) {
            console.log(`  Sample Active Items: ${cat.equipment.filter(e => e.isActive).slice(0, 5).map(e => e.model).join(', ')}...`)
        }
    }

    await prisma.$disconnect()
}

main().catch(console.error)
