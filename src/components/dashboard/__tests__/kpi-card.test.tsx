/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { KPICard } from '../kpi-card'

describe('KPICard', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <KPICard title="Revenue" value="$12,500" />
    )
    expect(container).toBeTruthy()
  })

  it('displays title and value', () => {
    render(<KPICard title="Bookings" value={42} />)
    expect(screen.getByText('Bookings')).toBeTruthy()
    expect(screen.getByText('42')).toBeTruthy()
  })

  it('displays trend when provided', () => {
    render(
      <KPICard
        title="Revenue"
        value="$10k"
        trend="+12%"
        trendDirection="up"
      />
    )
    expect(screen.getByText('+12%')).toBeTruthy()
  })

  it('displays description when provided', () => {
    render(
      <KPICard
        title="Revenue"
        value="$10k"
        description="Compared to last month"
      />
    )
    expect(screen.getByText('Compared to last month')).toBeTruthy()
  })
})
