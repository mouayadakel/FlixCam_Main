/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BackToTopFab } from '../back-to-top-fab'

describe('BackToTopFab', () => {
  const originalScrollTo = window.scrollTo

  beforeEach(() => {
    window.scrollTo = jest.fn()
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true })
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true })
  })

  afterEach(() => {
    window.scrollTo = originalScrollTo
  })

  it('returns null when scroll is below threshold', () => {
    Object.defineProperty(window, 'scrollY', { value: 500, writable: true })
    const { container } = render(<BackToTopFab />)
    expect(container.firstChild).toBeNull()
  })

  it('renders button when scroll exceeds 2 viewports and calls scrollTo on click', async () => {
    Object.defineProperty(window, 'scrollY', { value: 2000, writable: true })
    render(<BackToTopFab />)
    const button = await screen.findByRole('button', { name: 'Back to top' })
    fireEvent.click(button)
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })
})
