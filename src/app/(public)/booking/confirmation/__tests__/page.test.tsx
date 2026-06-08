/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react'
import BookingConfirmationPage from '../[id]/page'

const mockSearchParams = {
  get: jest.fn(),
}

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'booking-1' }),
  useSearchParams: () => mockSearchParams,
}))

jest.mock('next/link', () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) {
    return <a href={href}>{children}</a>
  }
})

jest.mock('@/hooks/use-locale', () => ({
  useLocale: () => ({
    t: (key: string) => key,
  }),
}))

jest.mock('@/config/site.config', () => ({
  siteConfig: {
    contact: {
      whatsappNumber: '+966500000000',
    },
  },
}))

jest.mock('@/lib/analytics/track-event', () => ({
  trackMarketingEvent: jest.fn(),
}))

describe('BookingConfirmationPage payment states', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearchParams.get.mockReturnValue('failed')
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'booking-1',
        bookingNumber: 'BK-1001',
        status: 'PAYMENT_PENDING',
        startDate: '2026-04-15T10:00:00Z',
        endDate: '2026-04-16T10:00:00Z',
        totalAmount: 200,
        equipment: [],
        payments: [
          {
            id: 'pay_1',
            status: 'FAILED',
            gateway: 'moyasar',
            externalId: 'ext_1',
            createdAt: '2026-04-15T09:59:00Z',
          },
        ],
      }),
    }) as jest.Mock
  })

  it('shows failed state with retry CTA when payment failed', async () => {
    render(<BookingConfirmationPage />)

    await waitFor(() => {
      expect(screen.getByText('checkout.paymentFailed')).toBeTruthy()
    })
    expect(screen.getByText('checkout.paymentRetryPrompt')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'checkout.retryPayment' }).getAttribute('href')).toBe(
      '/checkout/moyasar/booking-1'
    )
  })

  it('shows pending state for non-failed statuses', async () => {
    mockSearchParams.get.mockReturnValue('initiated')

    render(<BookingConfirmationPage />)

    await waitFor(() => {
      expect(screen.getByText('checkout.paymentPendingConfirmation')).toBeTruthy()
    })
    expect(screen.queryByText('checkout.paymentFailed')).toBeNull()
  })
})
