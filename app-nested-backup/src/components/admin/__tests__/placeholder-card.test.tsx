/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { PlaceholderCard } from '../placeholder-card'

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

describe('PlaceholderCard', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <PlaceholderCard title="Activity" description="Recent activity" />
    )
    expect(container).toBeTruthy()
  })

  it('displays title and description', () => {
    render(
      <PlaceholderCard
        title="Quick Actions"
        description="Common admin actions"
      />
    )
    expect(screen.getByText('Quick Actions')).toBeTruthy()
    expect(screen.getByText('Common admin actions')).toBeTruthy()
  })

  it('renders action link when actionLabel and actionHref provided', () => {
    render(
      <PlaceholderCard
        title="Activity"
        description="View activity"
        actionLabel="View All"
        actionHref="/admin/activity"
      />
    )
    const link = screen.getByRole('link', { name: 'View All' })
    expect(link).toBeTruthy()
    expect(link.getAttribute('href')).toBe('/admin/activity')
  })
})
