/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { BlogStatusBadge } from '../blog-status-badge'

describe('BlogStatusBadge', () => {
  it('renders without crashing', () => {
    const { container } = render(<BlogStatusBadge status="DRAFT" />)
    expect(container).toBeTruthy()
  })

  it('displays Arabic label when locale is ar', () => {
    render(<BlogStatusBadge status="DRAFT" locale="ar" />)
    expect(screen.getByText('مسودة')).toBeTruthy()
  })

  it('displays English label when locale is en', () => {
    render(<BlogStatusBadge status="DRAFT" locale="en" />)
    expect(screen.getByText('Draft')).toBeTruthy()
  })

  it('displays correct label for PUBLISHED', () => {
    render(<BlogStatusBadge status="PUBLISHED" locale="en" />)
    expect(screen.getByText('Published')).toBeTruthy()
  })

  it('displays correct label for REVIEW', () => {
    render(<BlogStatusBadge status="REVIEW" locale="en" />)
    expect(screen.getByText('In Review')).toBeTruthy()
  })

  it('merges custom className', () => {
    const { container } = render(
      <BlogStatusBadge status="DRAFT" className="custom-class" />
    )
    const badge = container.querySelector('span')
    expect(badge?.className).toContain('custom-class')
  })
})
