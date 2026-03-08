/**
 * @jest-environment jsdom
 */

import { render } from '@testing-library/react'
import { LoadingState } from '../loading-state'

describe('LoadingState', () => {
  it('renders without error', () => {
    const { container } = render(<LoadingState />)
    expect(container).toBeTruthy()
  })

  it('renders multiple skeleton elements', () => {
    const { container } = render(<LoadingState />)
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]')
    expect(skeletons.length).toBeGreaterThanOrEqual(4)
  })

  it('has space-y-4 layout class', () => {
    const { container } = render(<LoadingState />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper?.className).toContain('space-y-4')
  })
})
