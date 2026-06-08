/**
 * @file daftra.service.test.ts
 * @description Unit tests for Daftra ERP API v2 and ZATCA compliance service
 * @module lib/services/__tests__/daftra.service.test
 */

import { DaftraService } from '../daftra.service'
import { prisma } from '@/lib/db/prisma'
import { generateZATCAQR } from '@/lib/zatca/qr'
import { Decimal } from '@prisma/client/runtime/library'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    invoice: {
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    companySettings: {
      findFirst: jest.fn(),
    },
    integrationConfig: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}))

jest.mock('@/lib/zatca/qr', () => ({
  generateZATCAQR: jest.fn(() => 'mocked_zatca_qr_string'),
}))

const mockGetIntegrationConfig = jest.fn()
jest.mock('../integration-config.service', () => ({
  IntegrationConfigService: {
    getConfig: (type: string) => mockGetIntegrationConfig(type),
  },
}))

jest.mock('../audit.service', () => ({
  AuditService: { log: jest.fn().mockResolvedValue(undefined) },
}))

describe('DaftraService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
    mockGetIntegrationConfig.mockResolvedValue(null)
  })

  describe('testConnection', () => {
    it('should return failure if apiKey or subdomain are missing', async () => {
      const result = await DaftraService.testConnection('', 'company')
      expect(result.success).toBe(false)
      expect(result.message).toContain('required')
    })

    it('should return success if fetch response is ok', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      })

      const result = await DaftraService.testConnection('key_123', 'company')
      expect(result.success).toBe(true)
      expect(result.message).toContain('successful')
    })

    it('should return failure if fetch response is not ok', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: jest.fn().mockResolvedValue('Invalid key'),
      })

      const result = await DaftraService.testConnection('key_123', 'company')
      expect(result.success).toBe(false)
      expect(result.message).toContain('401')
    })
  })

  describe('syncInvoice', () => {
    const mockInvoiceId = 'inv_123'
    const mockUserId = 'usr_999'

    it('should return failure if Daftra is not configured', async () => {
      mockGetIntegrationConfig.mockResolvedValue(null)

      const result = await DaftraService.syncInvoice(mockInvoiceId, mockUserId)
      expect(result.success).toBe(false)
      expect(result.message).toContain('not configured')
    })

    it('should sync client and create invoice successfully in Daftra', async () => {
      mockGetIntegrationConfig.mockResolvedValue({
        type: 'daftra',
        enabled: true,
        config: {
          apiKey: 'test_key',
          subdomain: 'testsub',
        },
      })

      // Mock Local Invoice
      const mockInvoice = {
        id: mockInvoiceId,
        invoiceNumber: 'INV-2026-001',
        issueDate: new Date('2026-05-18'),
        dueDate: new Date('2026-06-18'),
        subtotal: new Decimal(100.0),
        discountAmount: new Decimal(0.0),
        vatAmount: new Decimal(15.0),
        totalAmount: new Decimal(115.0),
        paidAmount: new Decimal(115.0),
        status: 'PAID',
        zatcaHash: null,
        customer: {
          name: 'Mouayad Akel',
          email: 'mouayad@example.com',
          phone: '0500000000',
          billingAddress: 'Riyadh, Saudi Arabia',
          taxId: '310459821300003',
        },
        lineItems: [
          {
            description: 'Cinema Camera rental',
            quantity: 1,
            unitPrice: new Decimal(100.0),
          },
        ],
      }
      ;(prisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice)

      // Mock company settings
      ;(prisma.companySettings.findFirst as jest.Mock).mockResolvedValue({
        nameAr: 'فليكس كام',
        nameEn: 'FlixCam',
        vatNumber: '310459821300003',
      })

      // Mock Daftra API search call (client exists)
      const mockFetch = global.fetch as jest.Mock
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue([{ id: 88, email: 'mouayad@example.com' }]),
        }) // Search client
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            Invoice: {
              id: 999,
              invoice_number: 'INV-2026-001',
              zatca_qr: 'mocked_zatca_qr_from_daftra',
            },
          }),
        }) // Create invoice

      const result = await DaftraService.syncInvoice(mockInvoiceId, mockUserId)

      expect(result.success).toBe(true)
      expect(result.daftraUrl).toBe('https://testsub.daftra.com/v2/invoices/999')
      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: mockInvoiceId },
        data: {
          zatcaHash: 'daftra_999',
          zatcaQR: 'mocked_zatca_qr_from_daftra',
          zatcaStatus: 'ACCEPTED',
          notes: expect.any(String),
        },
      })
    })
  })
})
