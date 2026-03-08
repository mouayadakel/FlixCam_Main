/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { ReadingProgress } from '../reading-progress'

describe('ReadingProgress', () => {
  it('renders without crashing', () => {
    const { container } = render(<ReadingProgress />)
    expect(container).toBeTruthy()
  })

  it('has progressbar role', () => {
    render(<ReadingProgress />)
    expect(screen.getByRole('progressbar', { name: 'Reading progress' })).toBeTruthy()
  })

  it('has aria attributes', () => {
    render(<ReadingProgress />)
    const bar = screen.getByRole('progressbar')
    expect(bar.getAttribute('aria-valuemin')).toBe('0')
    expect(bar.getAttribute('aria-valuemax')).toBe('100')
  })
})
