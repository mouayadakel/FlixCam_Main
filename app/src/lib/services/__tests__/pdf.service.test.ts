/**
 * Unit tests for pdf.service
 */
jest.mock('../pdf/invoice-pdf', () => ({
  generateInvoicePdf: jest.fn().mockResolvedValue(Buffer.from('invoice-pdf')),
}))
jest.mock('../pdf/contract-pdf', () => ({
  generateContractPdf: jest.fn().mockReturnValue(Buffer.from('contract-pdf')),
}))
jest.mock('../pdf/quote-pdf', () => ({
  generateQuotePdf: jest.fn().mockReturnValue(Buffer.from('quote-pdf')),
}))
jest.mock('../pdf/report-export', () => ({
  exportReportAsPdf: jest.fn().mockReturnValue(Buffer.from('report-pdf')),
  exportReportAsExcel: jest.fn().mockResolvedValue(Buffer.from('excel')),
}))

import { PdfService } from '../pdf.service'
import { generateInvoicePdf } from '../pdf/invoice-pdf'
import { generateContractPdf } from '../pdf/contract-pdf'
import { generateQuotePdf } from '../pdf/quote-pdf'
import { exportReportAsPdf } from '../pdf/report-export'

describe('PdfService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(generateInvoicePdf as jest.Mock).mockResolvedValue(Buffer.from('invoice-pdf'))
    ;(generateContractPdf as jest.Mock).mockReturnValue(Buffer.from('contract-pdf'))
    ;(generateQuotePdf as jest.Mock).mockReturnValue(Buffer.from('quote-pdf'))
    ;(exportReportAsPdf as jest.Mock).mockReturnValue(Buffer.from('report-pdf'))
  })

  it('generateInvoicePdfBuffer returns Buffer', async () => {
    const invoice = { id: 'inv-1', invoiceNumber: 'INV-001', total: 100 } as any
    const buf = await PdfService.generateInvoicePdfBuffer({ invoice })
    expect(Buffer.isBuffer(buf)).toBe(true)
    expect(generateInvoicePdf).toHaveBeenCalledWith(invoice, expect.objectContaining({ locale: 'en' }))
  })

  it('generateContractPdfBuffer returns Buffer', () => {
    const contract = { id: 'c1', bookingId: 'b1' } as any
    const buf = PdfService.generateContractPdfBuffer({ contract })
    expect(Buffer.isBuffer(buf)).toBe(true)
    expect(generateContractPdf).toHaveBeenCalledWith(contract, expect.objectContaining({ locale: 'en' }))
  })

  it('generateQuotePdfBuffer returns Buffer', () => {
    const quote = { id: 'q1', quoteNumber: 'Q-001' } as any
    const buf = PdfService.generateQuotePdfBuffer({ quote })
    expect(Buffer.isBuffer(buf)).toBe(true)
    expect(generateQuotePdf).toHaveBeenCalledWith(quote, expect.objectContaining({ locale: 'en' }))
  })

  it('generateReportPdfBuffer returns Buffer', () => {
    const buf = PdfService.generateReportPdfBuffer({ reportType: 'bookings', filters: {} } as any)
    expect(Buffer.isBuffer(buf)).toBe(true)
    expect(exportReportAsPdf).toHaveBeenCalled()
  })
})
