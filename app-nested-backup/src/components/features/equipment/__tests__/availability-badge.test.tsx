/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import {
  AvailabilityBadge,
  getAvailabilityStatus,
} from '../availability-badge'

jest.mock('@/hooks/use-locale', () => ({
  useLocale: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'common.available': 'Available',
        'equipment.limited': 'Limited',
        'common.unavailable': 'Unavailable',
        'equipment.comingSoon': 'Coming Soon',
      }
      return map[key] ?? key
    },
  }),
}))

describe('AvailabilityBadge', () => {
  it('renders without crashing', () => {
    const { container } = render(<AvailabilityBadge status="available" />)
    expect(container).toBeTruthy()
  })

  it('displays label for available status', () => {
    render(<AvailabilityBadge status="available" />)
    expect(screen.getByText('Available')).toBeTruthy()
  })

  it('displays label for limited status', () => {
    render(<AvailabilityBadge status="limited" />)
    expect(screen.getByText('Limited')).toBeTruthy()
  })

  it('displays quantity when limited and quantityAvailable provided', () => {
    render(<AvailabilityBadge status="limited" quantityAvailable={2} />)
    expect(screen.getByText(/\(2\)/)).toBeTruthy()
  })

  it('has aria-label', () => {
    render(<AvailabilityBadge status="unavailable" />)
    expect(screen.getByLabelText('Unavailable')).toBeTruthy()
  })
})

describe('getAvailabilityStatus', () => {
  it('returns coming_soon when isActive is false', () => {
    expect(getAvailabilityStatus(5, false)).toBe('coming_soon')
  })

  it('returns unavailable when quantity is 0', () => {
    expect(getAvailabilityStatus(0)).toBe('unavailable')
  })

  it('returns limited when quantity is 1-2', () => {
    expect(getAvailabilityStatus(1)).toBe('limited')
    expect(getAvailabilityStatus(2)).toBe('limited')
  })

  it('returns available when quantity > 2', () => {
    expect(getAvailabilityStatus(3)).toBe('available')
  })
})
