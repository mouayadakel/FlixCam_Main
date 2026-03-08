/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react'
import { ProtectedRoute } from '../ProtectedRoute'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}))

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

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('renders loading skeleton initially', () => {
    ;(global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {})
    )
    render(
      <ProtectedRoute permission="booking.read">
        <div>Protected content</div>
      </ProtectedRoute>
    )
    expect(screen.queryByText('Protected content')).toBeNull()
  })

  it('renders children when user has permission', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ permissions: ['booking.read'] }),
    })
    render(
      <ProtectedRoute permission="booking.read">
        <div>Protected content</div>
      </ProtectedRoute>
    )
    await waitFor(() => {
      expect(screen.getByText('Protected content')).toBeTruthy()
    })
  })

  it('renders fallback when user lacks permission', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ permissions: [] }),
    })
    render(
      <ProtectedRoute
        permission="booking.read"
        fallback={<div>Access denied</div>}
      >
        <div>Protected content</div>
      </ProtectedRoute>
    )
    await waitFor(() => {
      expect(screen.getByText('Access denied')).toBeTruthy()
      expect(screen.queryByText('Protected content')).toBeNull()
    })
  })
})
