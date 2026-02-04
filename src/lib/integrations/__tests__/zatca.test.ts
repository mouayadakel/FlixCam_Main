/**
 * @file integrations/__tests__/zatca.test.ts
 * @description Tests for ZATCA invoice generation (XML and QR code)
 *              These tests don't require API keys - they test the generation logic.
 * @module integrations/zatca
 * @author Engineering Team
 * @created 2026-01-28
 */

import { generateZATCAInvoice, validateZATCAInvoiceData } from '../zatca/invoice-generator'
import type { ZATCAInvoiceData } from '../zatca/invoice-generator'
import { XMLParser } from 'fast-xml-parser'

describe('ZATCA Invoice Generator', () => {
  const sampleInvoiceData: ZATCAInvoiceData = {
    id: 'INV-2026-001',
    issueDate: new Date('2026-01-28'),
    issueTime: '10:30:00',
    invoiceType: 'standard',
    invoiceTypeCode: 388,
    currency: 'SAR',
    totalAmount: 1000,
    taxAmount: 150,
    totalAmountWithTax: 1150,
    seller: {
      name: 'FlixCam Rental',
      vatNumber: '123456789012345',
      address: {
        street: 'King Fahd Road',
        city: 'Riyadh',
        postalCode: '12345',
        country: 'SA',
      },
    },
    buyer: {
      name: 'Test Client',
      vatNumber: '987654321098765',
      address: {
        street: 'Test Street',
        city: 'Riyadh',
        postalCode: '54321',
        country: 'SA',
      },
    },
    items: [
      {
        name: 'Camera Rental',
        quantity: 1,
        unitPrice: 1000,
        taxRate: 15,
        taxAmount: 150,
        totalAmount: 1150,
      },
    ],
  }

  describe('generateZATCAInvoice', () => {
    it('should generate valid XML invoice', async () => {
      const result = await generateZATCAInvoice(sampleInvoiceData)

      expect(result.xml).toBeDefined()
      expect(result.xml.length).toBeGreaterThan(0)
      expect(result.xml).toContain('Invoice')
      expect(result.xml).toContain('INV-2026-001')
      expect(result.xml).toContain('FlixCam Rental')
      expect(result.xml).toContain('123456789012345')
    })

    it('should parse generated XML correctly', async () => {
      const result = await generateZATCAInvoice(sampleInvoiceData)

      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
      })

      const parsed = parser.parse(result.xml)

      expect(parsed.Invoice).toBeDefined()
      expect(parsed.Invoice['cbc:ID']).toBe('INV-2026-001')
      expect(parsed.Invoice['cbc:DocumentCurrencyCode']['#text']).toBe('SAR')
      expect(parsed.Invoice['cac:AccountingSupplierParty']['cac:Party']['cac:PartyLegalEntity']['cbc:RegistrationName']).toBe('FlixCam Rental')
    })

    it('should generate QR code', async () => {
      const result = await generateZATCAInvoice(sampleInvoiceData)

      expect(result.qrCode).toBeDefined()
      expect(result.qrCode).toContain('data:image/png;base64')
      expect(result.qrCode.length).toBeGreaterThan(100)
    })

    it('should calculate hash', async () => {
      const result = await generateZATCAInvoice(sampleInvoiceData)

      expect(result.hash).toBeDefined()
      expect(result.hash.length).toBe(64) // SHA-256 produces 64 character hex string
    })

    it('should include all invoice items in XML', async () => {
      const result = await generateZATCAInvoice(sampleInvoiceData)

      expect(result.xml).toContain('Camera Rental')
      expect(result.xml).toContain('1150.00')
      expect(result.xml).toContain('15')
    })

    it('should handle multiple items', async () => {
      const multiItemData: ZATCAInvoiceData = {
        ...sampleInvoiceData,
        items: [
          {
            name: 'Camera Rental',
            quantity: 1,
            unitPrice: 1000,
            taxRate: 15,
            taxAmount: 150,
            totalAmount: 1150,
          },
          {
            name: 'Lens Rental',
            quantity: 2,
            unitPrice: 500,
            taxRate: 15,
            taxAmount: 150,
            totalAmount: 1150,
          },
        ],
        totalAmount: 2000,
        taxAmount: 300,
        totalAmountWithTax: 2300,
      }

      const result = await generateZATCAInvoice(multiItemData)

      expect(result.xml).toContain('Camera Rental')
      expect(result.xml).toContain('Lens Rental')
      expect(result.xml).toContain('2300.00')
    })

    it('should handle date as string', async () => {
      const stringDateData: ZATCAInvoiceData = {
        ...sampleInvoiceData,
        issueDate: '2026-01-28',
      }

      const result = await generateZATCAInvoice(stringDateData)

      expect(result.xml).toContain('2026-01-28')
    })

    it('should not submit to ZATCA API if credentials not configured', async () => {
      // Temporarily remove env vars
      const originalUrl = process.env.ZATCA_API_URL
      const originalKey = process.env.ZATCA_API_KEY

      delete process.env.ZATCA_API_URL
      delete process.env.ZATCA_API_KEY

      const result = await generateZATCAInvoice(sampleInvoiceData)

      expect(result.submitted).toBe(false)
      expect(result.uuid).toBeNull()
      expect(result.error).toBeUndefined()

      // Restore env vars
      if (originalUrl) process.env.ZATCA_API_URL = originalUrl
      if (originalKey) process.env.ZATCA_API_KEY = originalKey
    })
  })

  describe('validateZATCAInvoiceData', () => {
    it('should validate correct invoice data', () => {
      const validation = validateZATCAInvoiceData(sampleInvoiceData)

      expect(validation.valid).toBe(true)
      expect(validation.errors.length).toBe(0)
    })

    it('should reject invoice without ID', () => {
      const invalidData = { ...sampleInvoiceData, id: '' }
      const validation = validateZATCAInvoiceData(invalidData)

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Invoice ID is required')
    })

    it('should reject invoice without seller name', () => {
      const invalidData = {
        ...sampleInvoiceData,
        seller: { ...sampleInvoiceData.seller, name: '' },
      }
      const validation = validateZATCAInvoiceData(invalidData)

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Seller name is required')
    })

    it('should reject invoice without seller VAT number', () => {
      const invalidData = {
        ...sampleInvoiceData,
        seller: { ...sampleInvoiceData.seller, vatNumber: '' },
      }
      const validation = validateZATCAInvoiceData(invalidData)

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Seller VAT number is required')
    })

    it('should reject invoice without items', () => {
      const invalidData = { ...sampleInvoiceData, items: [] }
      const validation = validateZATCAInvoiceData(invalidData)

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('At least one item is required')
    })

    it('should reject invoice with invalid total amount', () => {
      const invalidData = { ...sampleInvoiceData, totalAmountWithTax: 0 }
      const validation = validateZATCAInvoiceData(invalidData)

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Total amount must be greater than 0')
    })

    it('should reject invoice with negative tax', () => {
      const invalidData = { ...sampleInvoiceData, taxAmount: -10 }
      const validation = validateZATCAInvoiceData(invalidData)

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Tax amount cannot be negative')
    })

    it('should validate item fields', () => {
      const invalidData = {
        ...sampleInvoiceData,
        items: [
          {
            name: '',
            quantity: 0,
            unitPrice: -10,
            taxRate: 150,
            taxAmount: 0,
            totalAmount: 0,
          },
        ],
      }
      const validation = validateZATCAInvoiceData(invalidData)

      expect(validation.valid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
      expect(validation.errors.some((e) => e.includes('Item 1'))).toBe(true)
    })
  })
})
