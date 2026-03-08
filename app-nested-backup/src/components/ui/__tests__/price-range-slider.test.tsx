/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { PriceRangeSlider } from '../price-range-slider'

describe('PriceRangeSlider', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <PriceRangeSlider
        min={100}
        max={500}
        onMinChange={jest.fn()}
        onMaxChange={jest.fn()}
      />
    )
    expect(container).toBeTruthy()
  })

  it('renders with minimal required props', () => {
    render(
      <PriceRangeSlider
        min={0}
        max={1000}
        onMinChange={jest.fn()}
        onMaxChange={jest.fn()}
      />
    )
    expect(screen.getByText(/price per day/i)).toBeTruthy()
  })
})
