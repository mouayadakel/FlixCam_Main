/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorState } from '../error-state'

describe('ErrorState', () => {
  it('renders without error', () => {
    const { container } = render(<ErrorState />)
    expect(container).toBeTruthy()
  })

  it('displays default title and message', () => {
    render(<ErrorState />)
    expect(screen.getByText('Something went wrong')).toBeTruthy()
    expect(
      screen.getByText('An error occurred while loading data.')
    ).toBeTruthy()
  })

  it('accepts custom title and message props', () => {
    render(
      <ErrorState
        title="Custom Error"
        message="Something specific failed"
      />
    )
    expect(screen.getByText('Custom Error')).toBeTruthy()
    expect(screen.getByText('Something specific failed')).toBeTruthy()
  })

  it('renders retry button when onRetry is provided', () => {
    const onRetry = jest.fn()
    render(<ErrorState onRetry={onRetry} />)
    const button = screen.getByRole('button', { name: 'Try Again' })
    expect(button).toBeTruthy()
    fireEvent.click(button)
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('does not render retry button when onRetry is not provided', () => {
    render(<ErrorState />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
