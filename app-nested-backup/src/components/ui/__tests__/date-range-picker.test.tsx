/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { DateRangePicker } from '../date-range-picker'

describe('DateRangePicker', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <DateRangePicker
        startDate="2026-01-01"
        endDate="2026-01-05"
        onStartDateChange={jest.fn()}
        onEndDateChange={jest.fn()}
      />
    )
    expect(container).toBeTruthy()
  })

  it('renders with minimal required props', () => {
    render(
      <DateRangePicker
        startDate="2026-01-01"
        endDate="2026-01-05"
        onStartDateChange={jest.fn()}
        onEndDateChange={jest.fn()}
      />
    )
    expect(screen.getByLabelText(/start date/i)).toBeTruthy()
    expect(screen.getByLabelText(/end date/i)).toBeTruthy()
  })
})
