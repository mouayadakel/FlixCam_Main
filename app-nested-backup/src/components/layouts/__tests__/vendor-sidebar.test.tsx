/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { VendorSidebar } from '../vendor-sidebar'

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

jest.mock('next/navigation', () => ({
  usePathname: () => '/vendor/dashboard',
}))

describe('VendorSidebar', () => {
  it('renders without crashing', () => {
    const { container } = render(<VendorSidebar />)
    expect(container).toBeTruthy()
  })

  it('has nav with aria-label', () => {
    render(<VendorSidebar />)
    expect(screen.getByRole('navigation', { name: 'Vendor navigation' })).toBeTruthy()
  })

  it('displays section titles', () => {
    render(<VendorSidebar />)
    expect(screen.getByText('Overview')).toBeTruthy()
    expect(screen.getByText('Equipment')).toBeTruthy()
    expect(screen.getByText('Rentals')).toBeTruthy()
  })

  it('displays navigation links', () => {
    render(<VendorSidebar />)
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'My Equipment' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Profile & Bank Info' })).toBeTruthy()
  })
})
