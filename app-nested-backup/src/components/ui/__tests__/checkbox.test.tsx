/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { Checkbox } from '../checkbox'

describe('Checkbox', () => {
  it('renders without crashing', () => {
    const { container } = render(<Checkbox />)
    expect(container).toBeTruthy()
  })

  it('renders with minimal required props', () => {
    render(<Checkbox aria-label="Check" />)
    expect(screen.getByRole('checkbox')).toBeTruthy()
  })

  it('handles checked state', () => {
    render(<Checkbox checked aria-label="Check" />)
    const cb = screen.getByRole('checkbox')
    expect(cb.getAttribute('data-state')).toBe('checked')
  })

  it('calls onCheckedChange when clicked', () => {
    const onCheckedChange = jest.fn()
    render(<Checkbox onCheckedChange={onCheckedChange} aria-label="Check" />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onCheckedChange).toHaveBeenCalled()
  })
})
