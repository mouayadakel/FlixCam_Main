import { formatZatcaInvoiceTimestamp, generateZATCAQR } from '@/lib/zatca/qr'

describe('ZATCA QR', () => {
  it('uses Asia/Riyadh local time instead of UTC ISO', () => {
    const utcMidnight = new Date('2026-01-15T21:00:00.000Z')
    expect(formatZatcaInvoiceTimestamp(utcMidnight)).toBe('2026-01-16T00:00:00')

    const qr = generateZATCAQR({
      sellerName: 'FlixCam',
      vatNumber: '300012345600003',
      invoiceDate: utcMidnight,
      totalWithVAT: '115.00',
      vatAmount: '15.00',
    })

    const decoded = Buffer.from(qr, 'base64').toString('utf8')
    expect(decoded).toContain('2026-01-16T00:00:00')
    expect(decoded).not.toContain('2026-01-15T21:00:00')
  })
})
