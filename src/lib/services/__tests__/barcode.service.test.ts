/**
 * Unit tests for barcode.service
 */

import { BarcodeService } from '../barcode.service'
import { NotFoundError } from '@/lib/errors'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    inventoryItem: { findFirst: jest.fn() },
    equipment: { findFirst: jest.fn() },
    bookingEquipment: { findFirst: jest.fn() },
  },
}))

import { prisma } from '@/lib/db/prisma'

const mockInventoryFind = prisma.inventoryItem.findFirst as jest.Mock
const mockEquipmentFind = prisma.equipment.findFirst as jest.Mock
const mockBookingEquipmentFind = prisma.bookingEquipment.findFirst as jest.Mock

describe('barcode.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('lookupByBarcode resolves equipment by SKU', async () => {
    mockInventoryFind.mockResolvedValue(null)
    mockEquipmentFind.mockResolvedValue({
      id: 'eq1',
      sku: 'CAM-001',
      model: 'Sony A7',
      barcode: 'CAM-001',
      nameEn: 'Sony',
    })

    const result = await BarcodeService.lookupByBarcode(' CAM-001 ')
    expect(result.equipmentId).toBe('eq1')
    expect(result.name).toBe('Sony')
  })

  it('lookupByBarcode throws for unknown code', async () => {
    mockInventoryFind.mockResolvedValue(null)
    mockEquipmentFind.mockResolvedValue(null)
    await expect(BarcodeService.lookupByBarcode('UNKNOWN')).rejects.toThrow(NotFoundError)
  })

  it('lookupForBooking requires line on booking', async () => {
    mockInventoryFind.mockResolvedValue(null)
    mockEquipmentFind.mockResolvedValue({
      id: 'eq1',
      sku: 'X',
      model: 'X',
      barcode: 'X',
      nameEn: 'X',
    })
    mockBookingEquipmentFind.mockResolvedValue(null)

    await expect(BarcodeService.lookupForBooking('X', 'bk1')).rejects.toThrow(NotFoundError)
  })
})
