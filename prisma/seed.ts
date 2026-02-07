/**
 * @file seed.ts
 * @description Database seeding script for production-like data
 * @module prisma/seed
 */

import { PrismaClient, EquipmentCondition, FeatureFlagScope, NotificationChannel } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Default password "admin123" for dev (matches common docs); change in production
  const adminPasswordHash = await bcrypt.hash('admin123', 10)

  // 1. Create Admin User (upsert so re-seed updates password to current default)
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
  console.log('✅ Created admin user:', admin.email)

  // 1b. Create Test Account (for development / manual testing)
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
    { name: 'settings.edit', description: 'Edit settings' },
    { name: 'settings.view', description: 'View settings' },
  ]

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: {
        ...perm,
        createdBy: admin.id,
      },
    })
  }
  console.log(`✅ Created ${permissions.length} permissions`)

  // 3. Assign all permissions to admin
  for (const perm of permissions) {
    const permission = await prisma.permission.findUnique({
      where: { name: perm.name },
    })
    if (permission) {
      await prisma.userPermission.upsert({
        where: {
          userId_permissionId: {
            userId: admin.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          userId: admin.id,
          permissionId: permission.id,
          createdBy: admin.id,
        },
      })
    }
  }
  console.log('✅ Assigned all permissions to admin')

  // 3b. Assign all permissions to test user
  for (const perm of permissions) {
    const permission = await prisma.permission.findUnique({
      where: { name: perm.name },
    })
    if (permission) {
      await prisma.userPermission.upsert({
        where: {
          userId_permissionId: {
            userId: testUser.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          userId: testUser.id,
          permissionId: permission.id,
          createdBy: admin.id,
        },
      })
    }
  }
  console.log('✅ Assigned all permissions to test user')

  // 4. Create Categories
  const categories = [
    { name: 'Cameras', slug: 'cameras' },
    { name: 'Lenses', slug: 'lenses' },
    { name: 'Lighting', slug: 'lighting' },
    { name: 'Audio', slug: 'audio' },
    { name: 'Grip', slug: 'grip' },
  ]

  const createdCategories = []
  for (const cat of categories) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: {
        ...cat,
        createdBy: admin.id,
      },
    })
    createdCategories.push(category)
  }
  console.log(`✅ Created ${categories.length} categories`)

  // 5. Create Brands
  const brands = [
    { name: 'Sony', slug: 'sony' },
    { name: 'Canon', slug: 'canon' },
    { name: 'ARRI', slug: 'arri' },
    { name: 'RED', slug: 'red' },
    { name: 'Blackmagic', slug: 'blackmagic' },
  ]

  const createdBrands = []
  for (const brand of brands) {
    const created = await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: {},
      create: {
        ...brand,
        createdBy: admin.id,
      },
    })
    createdBrands.push(created)
  }
  console.log(`✅ Created ${brands.length} brands`)

  // 6. Create Equipment (20+ items)
  const equipmentItems = [
    {
      sku: 'CAM-001',
      model: 'FX6',
      categoryId: createdCategories[0].id, // Cameras
      brandId: createdBrands[0].id, // Sony
      condition: EquipmentCondition.EXCELLENT,
      quantityTotal: 3,
      quantityAvailable: 3,
      dailyPrice: 500,
      weeklyPrice: 3000,
      monthlyPrice: 10000,
      featured: true,
      isActive: true,
      warehouseLocation: 'A1-B2',
    },
    {
      sku: 'CAM-002',
      model: 'C300 Mark III',
      categoryId: createdCategories[0].id,
      brandId: createdBrands[1].id, // Canon
      condition: EquipmentCondition.GOOD,
      quantityTotal: 2,
      quantityAvailable: 2,
      dailyPrice: 600,
      weeklyPrice: 3500,
      monthlyPrice: 12000,
      featured: true,
      isActive: true,
      warehouseLocation: 'A1-B3',
    },
    {
      sku: 'LENS-001',
      model: '24-70mm f/2.8',
      categoryId: createdCategories[1].id, // Lenses
      brandId: createdBrands[0].id, // Sony
      condition: EquipmentCondition.EXCELLENT,
      quantityTotal: 5,
      quantityAvailable: 5,
      dailyPrice: 150,
      weeklyPrice: 900,
      monthlyPrice: 3000,
      featured: false,
      isActive: true,
      warehouseLocation: 'C1-D1',
    },
    // Add more equipment items as needed...
  ]

  for (const item of equipmentItems) {
    await prisma.equipment.upsert({
      where: { sku: item.sku },
      update: {},
      create: {
        ...item,
        createdBy: admin.id,
      },
    })
  }
  console.log(`✅ Created ${equipmentItems.length} equipment items`)

  // 7. Create Feature Flags
  const featureFlags = [
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
  ]

  for (const flag of featureFlags) {
    await prisma.featureFlag.upsert({
      where: { name: flag.name },
      update: {},
      create: {
        ...flag,
        createdBy: admin.id,
      },
    })
  }
  console.log(`✅ Created ${featureFlags.length} feature flags`)

  // Sample in-app notifications for admin (for testing notifications page)
  const sampleNotifications = [
    { id: 'seed-notif-1', type: 'booking.confirmed', title: 'Booking Confirmed', message: 'Booking #BK-001 has been confirmed.', channel: NotificationChannel.IN_APP, userId: admin.id },
    { id: 'seed-notif-2', type: 'payment.success', title: 'Payment Successful', message: 'Payment of 1,500 SAR has been processed successfully.', channel: NotificationChannel.IN_APP, userId: admin.id },
    { id: 'seed-notif-3', type: 'contract.signed', title: 'Contract Signed', message: 'Contract for booking #BK-001 has been signed.', channel: NotificationChannel.IN_APP, userId: admin.id },
  ]
  for (const n of sampleNotifications) {
    const { id, ...data } = n
    await prisma.notification.upsert({
      where: { id },
      update: {},
      create: {
        id,
        ...data,
        data: {},
        read: false,
        createdBy: admin.id,
      },
    })
  }
  console.log(`✅ Created ${sampleNotifications.length} sample notifications`)

  console.log('🎉 Database seed completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
