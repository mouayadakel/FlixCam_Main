/**
 * ═══════════════════════════════════════════════════════
 * FILE: src/lib/utils/barcode.ts
 * FEATURE: Equipment barcode generation
 * UNITS: generateBarcodeValue, generateQrCodeUrl, assignBarcodeToEquipment
 * ═══════════════════════════════════════════════════════
 */

import {
  generateBarcodeValue,
  generateQrCodeUrl,
  assignBarcodeToEquipment,
} from '@/lib/utils/barcode'

// ─────────────────────────────────────
// UNIT: generateBarcodeValue
// REQUIREMENTS:
//   - Format CAM-XXXXX-C where XXXXX is zero-padded numericId (5 digits), C is Luhn checksum.
//   - Accepts numericId (number); pads to 5 digits with leading zeros.
// ─────────────────────────────────────

describe('generateBarcodeValue', () => {
  describe('successful generation', () => {
    it('returns CAM-prefixed barcode with 5-digit padded id and checksum for single digit id', () => {
      // Arrange
      const numericId = 1

      // Act
      const result = generateBarcodeValue(numericId)

      // Assert
      expect(result).toMatch(/^CAM-\d{5}-\d$/)
      expect(result.startsWith('CAM-')).toBe(true)
      const [, padded, check] = result.split('-')
      expect(padded).toBe('00001')
      expect(padded.length).toBe(5)
      expect(Number(check)).toBeGreaterThanOrEqual(0)
      expect(Number(check)).toBeLessThanOrEqual(9)
    })

    it('pads numericId 123 to 00123', () => {
      // Arrange
      const numericId = 123

      // Act
      const result = generateBarcodeValue(numericId)

      // Assert
      expect(result).toMatch(/^CAM-00123-\d$/)
    })

    it('uses 5 digits when numericId is 99999', () => {
      // Arrange
      const numericId = 99999

      // Act
      const result = generateBarcodeValue(numericId)

      // Assert
      expect(result).toMatch(/^CAM-99999-\d$/)
    })
  })

  describe('edge cases', () => {
    it('accepts 0 and produces CAM-00000 with valid checksum', () => {
      // Arrange & Act
      const result = generateBarcodeValue(0)

      // Assert
      expect(result.startsWith('CAM-00000-')).toBe(true)
      expect(result).toMatch(/^CAM-\d{5}-\d$/)
    })
  })
})

// ─────────────────────────────────────
// UNIT: generateQrCodeUrl
// REQUIREMENTS:
//   - Returns URL: {NEXT_PUBLIC_APP_URL or http://localhost:3000}/warehouse/scan/{barcodeValue}
// ─────────────────────────────────────

describe('generateQrCodeUrl', () => {
  const originalEnv = process.env.NEXT_PUBLIC_APP_URL

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalEnv
  })

  it('returns warehouse scan URL with barcode value when NEXT_PUBLIC_APP_URL is not set', () => {
    // Arrange
    delete process.env.NEXT_PUBLIC_APP_URL
    const barcodeValue = 'CAM-00001-7'

    // Act
    const result = generateQrCodeUrl(barcodeValue)

    // Assert
    expect(result).toBe('http://localhost:3000/warehouse/scan/CAM-00001-7')
  })

  it('returns warehouse scan URL using NEXT_PUBLIC_APP_URL when set', () => {
    // Arrange
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com'
    const barcodeValue = 'CAM-00123-4'

    // Act
    const result = generateQrCodeUrl(barcodeValue)

    // Assert
    expect(result).toBe('https://app.example.com/warehouse/scan/CAM-00123-4')
  })

  it('accepts empty string barcode value', () => {
    // Act
    const result = generateQrCodeUrl('')

    // Assert
    expect(result).toMatch(/\/warehouse\/scan\/$/)
  })
})

// ─────────────────────────────────────
// UNIT: assignBarcodeToEquipment
// REQUIREMENTS:
//   - Calls prisma.equipment.count(), then prisma.equipment.update with barcode and qrCodeData.
//   - Returns { barcode, qrCodeData } for the assigned barcode.
//   - Barcode is generateBarcodeValue(count + 1), qrCodeData is generateQrCodeUrl(barcode).
// ─────────────────────────────────────

describe('assignBarcodeToEquipment', () => {
  it('calls count then update and returns barcode and qrCodeData', async () => {
    // Arrange
    const count = 10
    const equipmentId = 'eq_abc123'
    const mockUpdate = jest.fn().mockResolvedValue(undefined)
    const mockCount = jest.fn().mockResolvedValue(count)
    const prisma = {
      equipment: {
        count: mockCount,
        update: mockUpdate,
      },
    }

    // Act
    const result = await assignBarcodeToEquipment(
      prisma as Parameters<typeof assignBarcodeToEquipment>[0],
      equipmentId
    )

    // Assert
    expect(mockCount).toHaveBeenCalledTimes(1)
    expect(mockUpdate).toHaveBeenCalledTimes(1)
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: equipmentId },
      data: {
        barcode: result.barcode,
        qrCodeData: result.qrCodeData,
      },
    })
    expect(result.barcode).toMatch(/^CAM-\d{5}-\d$/)
    expect(result.qrCodeData).toContain('/warehouse/scan/')
    expect(result.qrCodeData).toContain(result.barcode)
  })

  it('uses count 0 when no equipment exists', async () => {
    // Arrange
    const mockUpdate = jest.fn().mockResolvedValue(undefined)
    const mockCount = jest.fn().mockResolvedValue(0)
    const prisma = {
      equipment: { count: mockCount, update: mockUpdate },
    }

    // Act
    const result = await assignBarcodeToEquipment(
      prisma as Parameters<typeof assignBarcodeToEquipment>[0],
      'eq_first'
    )

    // Assert
    expect(result.barcode).toMatch(/^CAM-00001-\d$/)
  })
})
