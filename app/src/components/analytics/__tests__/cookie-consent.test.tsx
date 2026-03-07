/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CookieConsentBanner } from '../cookie-consent'

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

describe('CookieConsentBanner', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders without crashing', async () => {
    const { container } = render(<CookieConsentBanner />)
    await waitFor(() => {
      expect(container).toBeTruthy()
    })
  })

  it('shows banner when not yet accepted', async () => {
    render(<CookieConsentBanner />)
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Cookie consent' })).toBeTruthy()
    })
  })

  it('has accept and decline buttons', async () => {
    render(<CookieConsentBanner />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'قبول' })).toBeTruthy()
      expect(screen.getByRole('button', { name: 'رفض' })).toBeTruthy()
    })
  })

  it('hides banner after accept', async () => {
    render(<CookieConsentBanner />)
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: 'قبول' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })

  it('returns null when already accepted in localStorage', async () => {
    localStorage.setItem('flixcam_cookie_consent', 'accepted')
    render(<CookieConsentBanner />)
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })
})
