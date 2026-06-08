import {
  canDownloadBookingInvoice,
  getBookingInvoicePdfUrl,
} from '@/lib/portal/invoice-download'

describe('portal invoice download helpers', () => {
  describe('canDownloadBookingInvoice', () => {
    it('allows download for confirmed and later statuses', () => {
      expect(canDownloadBookingInvoice('CONFIRMED')).toBe(true)
      expect(canDownloadBookingInvoice('ACTIVE')).toBe(true)
      expect(canDownloadBookingInvoice('CLOSED')).toBe(true)
    })

    it('blocks draft and cancelled bookings', () => {
      expect(canDownloadBookingInvoice('DRAFT')).toBe(false)
      expect(canDownloadBookingInvoice('CANCELLED')).toBe(false)
      expect(canDownloadBookingInvoice('RISK_CHECK')).toBe(false)
    })
  })

  describe('getBookingInvoicePdfUrl', () => {
    it('prefers formal invoice PDF when available', () => {
      expect(
        getBookingInvoicePdfUrl({
          id: 'booking-1',
          invoices: [{ id: 'inv-1' }],
        })
      ).toBe('/api/invoices/inv-1/pdf')
    })

    it('falls back to booking invoice PDF', () => {
      expect(getBookingInvoicePdfUrl({ id: 'booking-2' })).toBe(
        '/api/bookings/booking-2/invoice-pdf'
      )
    })
  })
})
