/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { EmptyState } from '../empty-state'

jest.mock('next/link', () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) {
    return <a href={href}>{children}</a>
  }
})

describe('EmptyState', () => {
  it('renders without error', () => {
    const { container } = render(
      <EmptyState title="No items" description="Add your first item" />
    )
    expect(container).toBeTruthy()
  })

  it('displays title and description', () => {
    render(
      <EmptyState
        title="No bookings"
        description="You have no bookings yet"
      />
    )
    expect(screen.getByText('No bookings')).toBeTruthy()
    expect(screen.getByText('You have no bookings yet')).toBeTruthy()
  })

  it('has correct aria attributes', () => {
    render(
      <EmptyState title="Empty list" description="Nothing here" />
    )
    const wrapper = screen.getByRole('status', { name: 'Empty list' })
    expect(wrapper).toBeTruthy()
  })

  it('renders action button with actionHref (Link)', () => {
    render(
      <EmptyState
        title="No items"
        description="Add one"
        actionLabel="Add Item"
        actionHref="/add"
      />
    )
    const link = screen.getByRole('link', { name: /Add Item/i })
    expect(link).toBeTruthy()
    expect(link.getAttribute('href')).toBe('/add')
  })

  it('renders action button with onAction and calls handler on click', () => {
    const onAction = jest.fn()
    render(
      <EmptyState
        title="No items"
        description="Add one"
        actionLabel="Add Item"
        onAction={onAction}
      />
    )
    const button = screen.getByRole('button', { name: /Add Item/i })
    expect(button).toBeTruthy()
    fireEvent.click(button)
    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('does not render action when actionLabel without actionHref or onAction', () => {
    render(
      <EmptyState
        title="No items"
        description="Add one"
        actionLabel="Add Item"
      />
    )
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('renders icon when provided', () => {
    const Icon = () => <span data-testid="custom-icon">Icon</span>
    render(
      <EmptyState
        title="No items"
        description="Add one"
        icon={<Icon />}
      />
    )
    expect(screen.getByTestId('custom-icon')).toBeTruthy()
  })
})
