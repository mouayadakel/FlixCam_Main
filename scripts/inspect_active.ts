import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const activeEquipment = await prisma.equipment.findMany({
        where: { isActive: true, deletedAt: null },
        include: {
            category: { select: { name: true, slug: true } },
            brand: { select: { name: true, slug: true } },
        }
    })

    console.log('--- Active Equipment ---')
    console.log(JSON.stringify(activeEquipment, null, 2))
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
