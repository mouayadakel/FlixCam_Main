/**
 * Unit tests for sku-generator
 */

import { generateSKU, generateUniqueSKU } from '../sku-generator'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    product: { findUnique: jest.fn() },
    equipment: { findFirst: jest.fn() },
  },
}))

const prisma = require('@/lib/db/prisma').prisma

describe('sku-generator', () => {
  describe('generateSKU', () => {
    it('returns SKU in format PREFIX-BRAND-XXXX', () => {
      const sku = generateSKU('camera', 'Sony')
      expect(sku).toMatch(/^CAM-SONY-\d{4}$/)
    })
    it('uses correct prefix for known categories', () => {
      expect(generateSKU('lenses', 'Canon')).toMatch(/^LNS-CANO-\d{4}$/)
      expect(generateSKU('lighting', 'Aputure')).toMatch(/^LGT-APUT-\d{4}$/)
      expect(generateSKU('tripod', 'Manfrotto')).toMatch(/^TRP-MANF-\d{4}$/)
      expect(generateSKU('drone', 'DJI')).toMatch(/^DRN-DJI-\d{4}$/)
    })
    it('uses first 3 chars for unknown category', () => {
      const sku = generateSKU('unknown', 'Brand')
      expect(sku).toMatch(/^UNK-BRAN-\d{4}$/)
    })
    it('handles short brand names', () => {
      const sku = generateSKU('camera', 'Sony')
      expect(sku).toMatch(/^CAM-SONY-\d{4}$/)
    })
    it('handles multi-word brand names', () => {
      const sku = generateSKU('camera', 'Sony Corporation')
      expect(sku).toMatch(/^CAM-SC-\d{4}$/)
    })
    it('generates different random digits on multiple calls', () => {
      const skus = new Set<string>()
      for (let i = 0; i < 20; i++) {
        skus.add(generateSKU('camera', 'Sony'))
      }
      expect(skus.size).toBeGreaterThan(1)
    })
  })

  describe('generateUniqueSKU', () => {
    it('returns SKU when no collision in product or equipment', async () => {
      prisma.product.findUnique.mockResolvedValue(null)
      prisma.equipment.findFirst.mockResolvedValue(null)

      const sku = await generateUniqueSKU('camera', 'Sony')
      expect(sku).toMatch(/^CAM-SONY-\d{4}$/)
    })

    it('retries when product has same SKU', async () => {
      prisma.product.findUnique
        .mockResolvedValueOnce({ id: 'p1' })
        .mockResolvedValueOnce(null)
      prisma.equipment.findFirst.mockResolvedValue(null)

      const sku = await generateUniqueSKU('camera', 'Sony')
      expect(sku).toMatch(/^CAM-SONY-\d{4}$/)
      expect(prisma.product.findUnique.mock.calls.length).toBeGreaterThanOrEqual(2)
    })

    it('retries when equipment has same SKU', async () => {
      prisma.product.findUnique.mockResolvedValue(null)
      prisma.equipment.findFirst
        .mockResolvedValueOnce({ id: 'e1' })
        .mockResolvedValueOnce(null)

      const sku = await generateUniqueSKU('camera', 'Sony')
      expect(sku).toMatch(/^CAM-SONY-\d{4}$/)
    })

    it('falls back to timestamp after 10 collisions', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'p1' })

      const sku = await generateUniqueSKU('camera', 'Sony')
      expect(sku).toMatch(/^CAM-SONY-[A-Z0-9]{4}$/)
    })
  })
})
