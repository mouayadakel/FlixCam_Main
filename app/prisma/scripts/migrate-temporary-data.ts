/**
 * @file migrate-temporary-data.ts
 * @description Script to migrate temporary data from Booking.notes, Equipment.customFields, and FeatureFlag to proper models
 * @module prisma/scripts
 * @author Engineering Team
 * @created 2026-01-28
 */

import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

interface QuoteData {
  id: string
  quoteNumber: string
  customerId: string
  status: string
  startDate: string
  endDate: string
  validUntil: string
  equipment: Array<{
    equipmentId: string
    quantity: number
    dailyRate: number
    totalDays: number
    subtotal: number
  }>
  subtotal: number
  discount?: number
  vatAmount: number
  totalAmount: number
  depositAmount?: number
  notes?: string
  bookingId?: string
  convertedAt?: string
  createdAt: string
  createdBy: string
  updatedAt: string
}

interface InvoiceData {
  id: string
  invoiceNumber: string
  customerId: string
  bookingId?: string
  type: string
  status: string
  issueDate: string
  dueDate: string
  paidDate?: string
  subtotal: number
  discount?: number
  vatAmount: number
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    total: number
    vatRate?: number
    vatAmount?: number
  }>
  notes?: string
  paymentTerms?: string
  createdAt: string
  createdBy: string
  updatedAt: string
}

interface MaintenanceData {
  id: string
  maintenanceNumber: string
  equipmentId: string
  type: string
  status: string
  priority: string
  scheduledDate: string
  completedDate?: string
  technicianId?: string
  description: string
  notes?: string
  cost?: number
  partsUsed?: Array<{
    partName: string
    quantity: number
    cost: number
  }>
  equipmentConditionBefore?: string
  equipmentConditionAfter?: string
  createdAt: string
  createdBy: string
  updatedAt: string
}

interface CouponData {
  id: string
  code: string
  name: string
  type: string
  discountValue?: number
  discountPercentage?: number
  minimumAmount?: number
  maximumDiscount?: number
  validFrom: string
  validUntil: string
  usageLimit?: number
  usedCount: number
  status: string
  applicableEquipmentIds?: string[]
  description?: string
  createdAt: string
  createdBy: string
  updatedAt: string
}

interface CampaignData {
  id: string
  name: string
  type: string
  status: string
  subject?: string
  content: string
  targetAudience?: string[]
  scheduledAt?: string
  sentAt?: string
  totalRecipients: number
  sentCount: number
  openedCount: number
  clickedCount: number
  conversionCount: number
  createdAt: string
  createdBy: string
  updatedAt: string
}

interface DeliveryData {
  id: string
  deliveryNumber: string
  bookingId: string
  type: string
  status: string
  scheduledDate: string
  deliveredDate?: string
  address: string
  city: string
  contactName: string
  contactPhone: string
  driverId?: string
  trackingNumber?: string
  notes?: string
  createdAt: string
  createdBy: string
  updatedAt: string
}

async function migrateQuotes() {
  console.log('Migrating quotes from Booking.notes...')

  const bookings = await prisma.booking.findMany({
    where: {
      notes: {
        contains: '[QUOTE]',
      },
      deletedAt: null,
    },
  })

  let migrated = 0
  let errors = 0

  for (const booking of bookings) {
    try {
      if (!booking.notes) continue

      const quoteMatch = booking.notes.match(/\[QUOTE\]\s*({[\s\S]*?})(?:\n|$)/)
      if (!quoteMatch) continue

      const quoteData: QuoteData = JSON.parse(quoteMatch[1])

      // Create Quote
      const quote = await prisma.quote.create({
        data: {
          quoteNumber: quoteData.quoteNumber,
          customerId: booking.customerId,
          status: quoteData.status.toUpperCase() as any,
          startDate: new Date(quoteData.startDate),
          endDate: new Date(quoteData.endDate),
          validUntil: new Date(quoteData.validUntil),
          studioId: booking.studioId,
          studioStartTime: booking.studioStartTime,
          studioEndTime: booking.studioEndTime,
          subtotal: quoteData.subtotal,
          discount: quoteData.discount || null,
          vatAmount: quoteData.vatAmount,
          totalAmount: quoteData.totalAmount,
          depositAmount: quoteData.depositAmount || null,
          equipment: quoteData.equipment as any,
          notes: quoteData.notes || null,
          bookingId: quoteData.bookingId || null,
          convertedAt: quoteData.convertedAt ? new Date(quoteData.convertedAt) : null,
          createdBy: quoteData.createdBy || booking.createdBy,
          createdAt: new Date(quoteData.createdAt || booking.createdAt),
          updatedAt: new Date(quoteData.updatedAt || booking.updatedAt),
        },
      })

      // Create QuoteEquipment records
      if (quoteData.equipment && Array.isArray(quoteData.equipment)) {
        for (const eq of quoteData.equipment) {
          await prisma.quoteEquipment.create({
            data: {
              quoteId: quote.id,
              equipmentId: eq.equipmentId,
              quantity: eq.quantity,
              dailyRate: eq.dailyRate,
              totalDays: eq.totalDays,
              subtotal: eq.subtotal,
              createdBy: quote.createdBy,
            },
          })
        }
      }

      migrated++
    } catch (error) {
      console.error(`Error migrating quote from booking ${booking.id}:`, error)
      errors++
    }
  }

  console.log(`✓ Migrated ${migrated} quotes, ${errors} errors`)
}

async function migrateInvoices() {
  console.log('Migrating invoices from Booking.notes...')

  const bookings = await prisma.booking.findMany({
    where: {
      notes: {
        contains: '[INVOICE]',
      },
      deletedAt: null,
    },
  })

  let migrated = 0
  let errors = 0

  for (const booking of bookings) {
    try {
      if (!booking.notes) continue

      const invoiceMatch = booking.notes.match(/\[INVOICE\]\s*({[\s\S]*?})(?:\n|$)/)
      if (!invoiceMatch) continue

      const invoiceData: InvoiceData = JSON.parse(invoiceMatch[1])

      // Calculate remaining amount
      const remainingAmount = invoiceData.totalAmount - invoiceData.paidAmount

      // Create Invoice
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: invoiceData.invoiceNumber,
          customerId: booking.customerId,
          bookingId: invoiceData.bookingId || booking.id,
          type: invoiceData.type.toUpperCase() as any,
          status: invoiceData.status.toUpperCase().replace('_', '_') as any,
          issueDate: new Date(invoiceData.issueDate),
          dueDate: new Date(invoiceData.dueDate),
          paidDate: invoiceData.paidDate ? new Date(invoiceData.paidDate) : null,
          subtotal: invoiceData.subtotal,
          discount: invoiceData.discount || null,
          vatAmount: invoiceData.vatAmount,
          totalAmount: invoiceData.totalAmount,
          paidAmount: invoiceData.paidAmount,
          remainingAmount,
          items: invoiceData.items as any,
          notes: invoiceData.notes || null,
          paymentTerms: invoiceData.paymentTerms || null,
          createdBy: invoiceData.createdBy || booking.createdBy,
          createdAt: new Date(invoiceData.createdAt || booking.createdAt),
          updatedAt: new Date(invoiceData.updatedAt || booking.updatedAt),
        },
      })

      migrated++
    } catch (error) {
      console.error(`Error migrating invoice from booking ${booking.id}:`, error)
      errors++
    }
  }

  console.log(`✓ Migrated ${migrated} invoices, ${errors} errors`)
}

async function migrateMaintenance() {
  console.log('Migrating maintenance from Equipment.customFields...')

  const equipment = await prisma.equipment.findMany({
    where: {
      customFields: {
        not: Prisma.JsonNull,
      },
      deletedAt: null,
    },
  })

  let migrated = 0
  let errors = 0

  for (const eq of equipment) {
    try {
      if (!eq.customFields) continue

      const customFields = eq.customFields as any
      if (!customFields.maintenance || !Array.isArray(customFields.maintenance)) continue

      for (const maintData of customFields.maintenance) {
        const maintenance = await prisma.maintenance.create({
          data: {
            maintenanceNumber:
              maintData.maintenanceNumber ||
              `MAINT-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
            equipmentId: eq.id,
            type: maintData.type.toUpperCase() as any,
            status: maintData.status.toUpperCase().replace('_', '_') as any,
            priority: maintData.priority || 'medium',
            scheduledDate: new Date(maintData.scheduledDate),
            completedDate: maintData.completedDate ? new Date(maintData.completedDate) : null,
            technicianId: maintData.technicianId || null,
            description: maintData.description || '',
            notes: maintData.notes || null,
            cost: maintData.cost || null,
            partsUsed: maintData.partsUsed || null,
            equipmentConditionBefore:
              (maintData.equipmentConditionBefore?.toUpperCase() as any) || null,
            equipmentConditionAfter:
              (maintData.equipmentConditionAfter?.toUpperCase() as any) || null,
            createdBy: maintData.createdBy || 'system',
            createdAt: new Date(maintData.createdAt || new Date()),
            updatedAt: new Date(maintData.updatedAt || new Date()),
          },
        })

        migrated++
      }
    } catch (error) {
      console.error(`Error migrating maintenance from equipment ${eq.id}:`, error)
      errors++
    }
  }

  console.log(`✓ Migrated ${migrated} maintenance records, ${errors} errors`)
}

async function migrateCoupons() {
  console.log('Migrating coupons from FeatureFlag...')

  const featureFlags = await prisma.featureFlag.findMany({
    where: {
      name: {
        startsWith: 'coupon:',
      },
      deletedAt: null,
    },
  })

  let migrated = 0
  let errors = 0

  for (const flag of featureFlags) {
    try {
      if (!flag.description) continue

      const couponData: CouponData = JSON.parse(flag.description)

      await prisma.coupon.create({
        data: {
          code: couponData.code,
          name: couponData.name,
          type: couponData.type.toUpperCase() as any,
          discountValue: couponData.discountValue || null,
          discountPercentage: couponData.discountPercentage || null,
          minimumAmount: couponData.minimumAmount || null,
          maximumDiscount: couponData.maximumDiscount || null,
          validFrom: new Date(couponData.validFrom),
          validUntil: new Date(couponData.validUntil),
          usageLimit: couponData.usageLimit || null,
          usedCount: couponData.usedCount || 0,
          status: couponData.status.toUpperCase() as any,
          applicableEquipmentIds: (couponData.applicableEquipmentIds ??
            undefined) as Prisma.InputJsonValue,
          description: couponData.description || null,
          createdBy: couponData.createdBy || 'system',
          createdAt: new Date(couponData.createdAt || flag.createdAt),
          updatedAt: new Date(couponData.updatedAt || flag.updatedAt),
        },
      })

      migrated++
    } catch (error) {
      console.error(`Error migrating coupon from feature flag ${flag.id}:`, error)
      errors++
    }
  }

  console.log(`✓ Migrated ${migrated} coupons, ${errors} errors`)
}

async function migrateCampaigns() {
  console.log('Migrating campaigns from FeatureFlag...')

  const featureFlags = await prisma.featureFlag.findMany({
    where: {
      name: {
        startsWith: 'campaign:',
      },
      deletedAt: null,
    },
  })

  let migrated = 0
  let errors = 0

  for (const flag of featureFlags) {
    try {
      if (!flag.description) continue

      const campaignData: CampaignData = JSON.parse(flag.description)

      await prisma.campaign.create({
        data: {
          name: campaignData.name,
          type: campaignData.type.toUpperCase() as any,
          status: campaignData.status.toUpperCase() as any,
          subject: campaignData.subject || null,
          content: campaignData.content,
          targetAudience: (campaignData.targetAudience ?? undefined) as Prisma.InputJsonValue,
          scheduledAt: campaignData.scheduledAt ? new Date(campaignData.scheduledAt) : null,
          sentAt: campaignData.sentAt ? new Date(campaignData.sentAt) : null,
          totalRecipients: campaignData.totalRecipients || 0,
          sentCount: campaignData.sentCount || 0,
          openedCount: campaignData.openedCount || 0,
          clickedCount: campaignData.clickedCount || 0,
          conversionCount: campaignData.conversionCount || 0,
          createdBy: campaignData.createdBy || 'system',
          createdAt: new Date(campaignData.createdAt || flag.createdAt),
          updatedAt: new Date(campaignData.updatedAt || flag.updatedAt),
        },
      })

      migrated++
    } catch (error) {
      console.error(`Error migrating campaign from feature flag ${flag.id}:`, error)
      errors++
    }
  }

  console.log(`✓ Migrated ${migrated} campaigns, ${errors} errors`)
}

async function migrateDeliveries() {
  console.log('Migrating deliveries from Booking.notes...')

  const bookings = await prisma.booking.findMany({
    where: {
      notes: {
        contains: '[DELIVERY]',
      },
      deletedAt: null,
    },
  })

  let migrated = 0
  let errors = 0

  for (const booking of bookings) {
    try {
      if (!booking.notes) continue

      const deliveryMatch = booking.notes.match(/\[DELIVERY\]\s*({[\s\S]*?})(?:\n|$)/)
      if (!deliveryMatch) continue

      const deliveryData: DeliveryData = JSON.parse(deliveryMatch[1])

      await prisma.delivery.create({
        data: {
          deliveryNumber: deliveryData.deliveryNumber,
          bookingId: booking.id,
          type: deliveryData.type.toUpperCase() as any,
          status: deliveryData.status.toUpperCase().replace('_', '_') as any,
          scheduledDate: new Date(deliveryData.scheduledDate),
          deliveredDate: deliveryData.deliveredDate ? new Date(deliveryData.deliveredDate) : null,
          address: deliveryData.address,
          city: deliveryData.city,
          contactName: deliveryData.contactName,
          contactPhone: deliveryData.contactPhone,
          driverId: deliveryData.driverId || null,
          trackingNumber: deliveryData.trackingNumber || null,
          notes: deliveryData.notes || null,
          createdBy: deliveryData.createdBy || booking.createdBy,
          createdAt: new Date(deliveryData.createdAt || booking.createdAt),
          updatedAt: new Date(deliveryData.updatedAt || booking.updatedAt),
        },
      })

      migrated++
    } catch (error) {
      console.error(`Error migrating delivery from booking ${booking.id}:`, error)
      errors++
    }
  }

  console.log(`✓ Migrated ${migrated} deliveries, ${errors} errors`)
}

async function main() {
  console.log('Starting data migration...\n')

  try {
    await migrateQuotes()
    await migrateInvoices()
    await migrateMaintenance()
    await migrateCoupons()
    await migrateCampaigns()
    await migrateDeliveries()

    console.log('\n✓ Migration completed successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}

export {
  migrateQuotes,
  migrateInvoices,
  migrateMaintenance,
  migrateCoupons,
  migrateCampaigns,
  migrateDeliveries,
}
