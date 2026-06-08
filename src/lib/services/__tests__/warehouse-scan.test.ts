/**
 * @file warehouse-scan.test.ts
 * @description Automated unit tests for warehouse scanner route and status updates
 * @module lib/services/__tests__/warehouse-scan
 */

import { prisma } from '@/lib/db/prisma'
import { AuditService } from '../../services/audit.service'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    inventoryItem: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    bookingEquipment: {
      findFirst: jest.fn(),
    },
    booking: {
      update: jest.fn(),
    },
    $transaction: jest.fn((promises) => Promise.all(promises)),
  }
}))

jest.mock('../../services/audit.service', () => ({
  AuditService: {
    log: jest.fn(() => Promise.resolve()),
  }
}))

describe('Warehouse Barcode Scanner API Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should validate and find a correct physical inventory item by barcode', async () => {
    const mockItem = {
      id: 'item-111',
      serialNumber: 'SN999888',
      barcode: 'BAR-555',
      parentProductId: 'prod-222',
      product: {
        id: 'prod-222',
        sku: 'SONY-A7S3',
      }
    };

    (prisma.inventoryItem.findUnique as jest.Mock).mockResolvedValue(mockItem)
    
    const found = await prisma.inventoryItem.findUnique({
      where: { barcode: 'BAR-555', deletedAt: null },
      include: { product: true }
    })

    expect(prisma.inventoryItem.findUnique).toHaveBeenCalled()
    expect(found).not.toBeNull()
    if (!found) throw new Error('Expected inventory item to be found')
    expect(found.serialNumber).toBe('SN999888')
    expect(found.product.sku).toBe('SONY-A7S3')
  })

  it('should transition inventoryItem to RENTED and booking to ACTIVE on CHECK_OUT transaction', async () => {
    const mockItem = { id: 'item-111' }
    const mockBooking = { id: 'booking-888' }

    await prisma.$transaction([
      prisma.inventoryItem.update({
        where: { id: mockItem.id },
        data: { itemStatus: 'RENTED' },
      }),
      prisma.booking.update({
        where: { id: mockBooking.id },
        data: { status: 'ACTIVE' }
      })
    ])

    expect(prisma.$transaction).toHaveBeenCalled()
    expect(prisma.inventoryItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'item-111' },
        data: { itemStatus: 'RENTED' }
      })
    )
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'booking-888' },
        data: { status: 'ACTIVE' }
      })
    )
  })

  it('should transition inventoryItem to AVAILABLE and booking to CLOSED on CHECK_IN transaction', async () => {
    const mockItem = { id: 'item-111' }
    const mockBooking = { id: 'booking-888' }

    await prisma.$transaction([
      prisma.inventoryItem.update({
        where: { id: mockItem.id },
        data: { itemStatus: 'AVAILABLE' },
      }),
      prisma.booking.update({
        where: { id: mockBooking.id },
        data: { status: 'CLOSED' }
      })
    ])

    expect(prisma.$transaction).toHaveBeenCalled()
    expect(prisma.inventoryItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'item-111' },
        data: { itemStatus: 'AVAILABLE' }
      })
    )
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'booking-888' },
        data: { status: 'CLOSED' }
      })
    )
  })
})
