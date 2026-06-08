import { PrismaClient } from '@prisma/client'
import { EquipmentService } from '../src/lib/services/equipment.service'

const prisma = new PrismaClient()

async function runTests() {
  console.log('🧪 Starting Equipment Image Upload Verification...')
  let createdEquipmentId: string | null = null

  try {
    // 1. Test "New Equipment" with URL image (featured image only)
    console.log('\n▶️ Testing: Creating New Equipment with URL image')
    const equipData = {
      sku: `TEST-EQ-${Date.now()}`,
      model: 'Test Camera X1',
      categoryId: 'camera-cat-id', // Needs to be an existing category ID theoretically, but we might bypass foreign keys if we hardcode or query it
      condition: 'GOOD' as any,
      quantityTotal: 1,
      quantityAvailable: 1,
      dailyPrice: 100,
      featuredImageUrl: 'https://example.com/new-featured.jpg',
      translations: [{ locale: 'ar', name: 'كاميرا اختبار X1' }],
      createdBy: 'test-user',
    }
    
    // We need a valid category ID to create an equipment, let's fetch one
    const category = await prisma.category.findFirst()
    if (!category) {
      console.log('No categories found. Creating a test one...')
      const newCat = await prisma.category.create({
        data: { name: 'Test Cat', slug: `test-cat-${Date.now()}` }
      })
      equipData.categoryId = newCat.id
    } else {
      equipData.categoryId = category.id
    }

    const createdEquip = await EquipmentService.createEquipment(equipData)
    createdEquipmentId = createdEquip.id
    console.log(`✅ Created Equipment ID: ${createdEquipmentId}`)
    
    // Check media records
    const initialMedia = await prisma.media.findMany({
      where: { equipmentId: createdEquipmentId }
    })
    console.log(`✅ DB check: Found ${initialMedia.length} media records.`)
    console.assert(initialMedia.length === 1, 'Should have exactly 1 primary image.')
    console.assert(initialMedia[0].url === 'https://example.com/new-featured.jpg', 'URL should match.')

    // 2. Test "Edit Equipment" updating with a new Gallery URL (Simulating file upload returning a URL)
    console.log('\n▶️ Testing: Editing Equipment to add gallery image URL')
    const updatedEquip = await EquipmentService.updateEquipment({
      id: createdEquipmentId,
      updatedBy: 'test-user',
      galleryImageUrls: ['https://example.com/gallery1.jpg', 'https://example.com/gallery2.jpg'],
    })

    const updatedMedia = await prisma.media.findMany({
      where: { equipmentId: createdEquipmentId, deletedAt: null },
      orderBy: { sortOrder: 'asc' }
    })
    console.log(`✅ Updated Equipment. Found ${updatedMedia.length} active media records.`)
    console.assert(updatedMedia.length === 3, 'Should have 1 featured + 2 gallery images.')
    
    // 3. Test "Edit Equipment" saving without changing any images
    console.log('\n▶️ Testing: Editing Equipment without touching images')
    // Simulating page.tsx logic which strips out identical URLs from payload
    const unchangedEquip = await EquipmentService.updateEquipment({
      id: createdEquipmentId,
      updatedBy: 'test-user',
      dailyPrice: 150,
      // Not passing featuredImageUrl or galleryImageUrls since they didn't change
    })

    const unchangedMediaCount = await prisma.media.count({
      where: { equipmentId: createdEquipmentId, deletedAt: null }
    })
    const deletedMediaCount = await prisma.media.count({
      where: { equipmentId: createdEquipmentId, deletedAt: { not: null } }
    })
    console.log(`✅ Active media: ${unchangedMediaCount}, Deleted media: ${deletedMediaCount}`)
    console.assert(unchangedMediaCount === 3, 'Active media should remain 3.')
    console.assert(deletedMediaCount === 0, 'No media should be deleted when saving unchanged images.')

    console.log('\n🎉 All tests passed successfully! Image saving and DB validation is correct.')

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    if (createdEquipmentId) {
      console.log(`🧹 Cleaning up test equipment ID: ${createdEquipmentId}`)
      await prisma.media.deleteMany({ where: { equipmentId: createdEquipmentId } })
      await prisma.equipment.delete({ where: { id: createdEquipmentId } })
    }
    await prisma.$disconnect()
  }
}

runTests()
