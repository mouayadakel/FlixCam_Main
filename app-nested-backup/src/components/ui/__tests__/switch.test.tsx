/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { Switch } from '../switch'

describe('Switch', () => {
  it('renders without crashing', () => {
    const { container } = render(<Switch />)
    expect(container).toBeTruthy()
  })

  it('renders with minimal required props', () => {
    render(<Switch aria-label="Toggle" />)
    expect(screen.getByRole('switch')).toBeTruthy()
  })

  it('calls onCheckedChange when clicked', () => {
    const onCheckedChange = jest.fn()
    render(<Switch onCheckedChange={onCheckedChange} aria-label="Toggle" />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onCheckedChange).toHaveBeenCalled()
  })
})
