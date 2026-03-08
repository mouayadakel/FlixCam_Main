/**
 * @jest-environment jsdom
 */

import { render } from '@testing-library/react'
import { Skeleton } from '../skeleton'

describe('Skeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<Skeleton />)
    expect(container).toBeTruthy()
  })

  it('renders with minimal required props', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild).toBeTruthy()
  })

  it('merges custom className', () => {
    const { container } = render(<Skeleton className="h-4 w-20" />)
    expect((container.firstChild as HTMLElement)?.className).toContain('h-4 w-20')
  })
})
