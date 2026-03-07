/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../button'

describe('Button', () => {
  it('renders without crashing', () => {
    const { container } = render(<Button>Click</Button>)
    expect(container).toBeTruthy()
  })

  it('renders with minimal required props', () => {
    render(<Button>Submit</Button>)
    expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy()
  })

  it('handles variant and size props', () => {
    render(
      <Button variant="outline" size="sm">
        Small
      </Button>
    )
    expect(screen.getByRole('button', { name: 'Small' })).toBeTruthy()
  })

  it('calls onClick when clicked', () => {
    const onClick = jest.fn()
    render(<Button onClick={onClick}>Click me</Button>)
    fireEvent.click(screen.getByRole('button', { name: 'Click me' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is set', () => {
    render(<Button disabled>Disabled</Button>)
    expect((screen.getByRole('button', { name: 'Disabled' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
