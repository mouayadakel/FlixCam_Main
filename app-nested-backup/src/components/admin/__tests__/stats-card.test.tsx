/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { StatsCard } from '../stats-card'
import type { MockStat } from '@/lib/utils/mock-data'

describe('StatsCard', () => {
  it('renders without crashing', () => {
    const stat: MockStat = {
      label: 'Total Revenue',
      value: '$12,500',
    }
    const { container } = render(<StatsCard stat={stat} />)
    expect(container).toBeTruthy()
  })

  it('displays label and value', () => {
    const stat: MockStat = {
      label: 'Bookings',
      value: 42,
    }
    render(<StatsCard stat={stat} />)
    expect(screen.getByText('Bookings')).toBeTruthy()
    expect(screen.getByText('42')).toBeTruthy()
  })

  it('displays change with up trend', () => {
    const stat: MockStat = {
      label: 'Revenue',
      value: '$10k',
      change: '+12%',
      trend: 'up',
    }
    render(<StatsCard stat={stat} />)
    expect(screen.getByText('+12%')).toBeTruthy()
  })

  it('displays change with down trend', () => {
    const stat: MockStat = {
      label: 'Returns',
      value: 5,
      change: '-3%',
      trend: 'down',
    }
    render(<StatsCard stat={stat} />)
    expect(screen.getByText('-3%')).toBeTruthy()
  })
})
