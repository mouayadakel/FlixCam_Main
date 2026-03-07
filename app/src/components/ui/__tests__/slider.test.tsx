/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { Slider } from '../slider'

describe('Slider', () => {
  it('renders without crashing', () => {
    const { container } = render(<Slider />)
    expect(container).toBeTruthy()
  })

  it('renders with minimal required props', () => {
    const { container } = render(<Slider defaultValue={[50]} />)
    expect(container.querySelector('input')).toBeTruthy()
  })

  it('handles value prop', () => {
    const { container } = render(<Slider value={[75]} onValueChange={jest.fn()} />)
    const input = container.querySelector('input[type="range"]') as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input?.value).toBe('75')
  })
})
