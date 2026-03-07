/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { Input } from '../input'

describe('Input', () => {
  it('renders without crashing', () => {
    const { container } = render(<Input />)
    expect(container).toBeTruthy()
  })

  it('renders with minimal required props', () => {
    render(<Input placeholder="Enter text" />)
    expect(screen.getByPlaceholderText('Enter text')).toBeTruthy()
  })

  it('handles value and onChange', () => {
    render(
      <Input
        value="test"
        onChange={jest.fn()}
        placeholder="Input"
        aria-label="Test input"
      />
    )
    const input = screen.getByRole('textbox', { name: 'Test input' }) as HTMLInputElement
    expect(input.value).toBe('test')
  })

  it('supports disabled state', () => {
    render(<Input disabled placeholder="Disabled" />)
    expect((screen.getByPlaceholderText('Disabled') as HTMLInputElement).disabled).toBe(true)
  })
})
