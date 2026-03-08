/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { StatusBadge } from '../status-badge'

describe('StatusBadge', () => {
  it('renders without error', () => {
    const { container } = render(<StatusBadge status="DRAFT" />)
    expect(container).toBeTruthy()
  })

  it('displays correct label for DRAFT status', () => {
    render(<StatusBadge status="DRAFT" />)
    expect(screen.getByText('مسودة')).toBeTruthy()
  })

  it('displays correct label for PUBLISHED status', () => {
    render(<StatusBadge status="PUBLISHED" />)
    expect(screen.getByText('منشور')).toBeTruthy()
  })

  it('displays correct label for READY status', () => {
    render(<StatusBadge status="READY" />)
    expect(screen.getByText('جاهز')).toBeTruthy()
  })

  it('accepts size prop and applies size classes', () => {
    const { container } = render(<StatusBadge status="DRAFT" size="md" />)
    const badge = container.querySelector('span')
    expect(badge).toBeTruthy()
    expect(badge?.className).toContain('text-sm')
  })

  it('falls back to DRAFT config for unknown status', () => {
    render(<StatusBadge status="UNKNOWN_STATUS" />)
    expect(screen.getByText('مسودة')).toBeTruthy()
  })

  it('merges custom className', () => {
    const { container } = render(
      <StatusBadge status="DRAFT" className="custom-class" />
    )
    const badge = container.querySelector('span')
    expect(badge?.className).toContain('custom-class')
  })
})
