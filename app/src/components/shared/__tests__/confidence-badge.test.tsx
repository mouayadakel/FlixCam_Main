/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { ConfidenceBadge, getConfidenceLevel } from '../confidence-badge'

describe('ConfidenceBadge', () => {
  it('renders without error', () => {
    const { container } = render(<ConfidenceBadge confidence={85} />)
    expect(container).toBeTruthy()
  })

  it('displays confidence percentage', () => {
    render(<ConfidenceBadge confidence={85} />)
    expect(screen.getByText('85%')).toBeTruthy()
  })

  it('displays high label when confidence >= 90', () => {
    render(<ConfidenceBadge confidence={92} />)
    expect(screen.getByText('عالية')).toBeTruthy()
  })

  it('displays medium label when confidence >= 70 and < 90', () => {
    render(<ConfidenceBadge confidence={75} />)
    expect(screen.getByText('متوسطة')).toBeTruthy()
  })

  it('displays low label when confidence < 70', () => {
    render(<ConfidenceBadge confidence={50} />)
    expect(screen.getByText('منخفضة')).toBeTruthy()
  })

  it('hides label when showLabel is false', () => {
    render(<ConfidenceBadge confidence={85} showLabel={false} />)
    expect(screen.getByText('85%')).toBeTruthy()
    expect(screen.queryByText('متوسطة')).toBeNull()
  })

  it('accepts size prop', () => {
    const { container } = render(
      <ConfidenceBadge confidence={85} size="md" />
    )
    const badge = container.querySelector('span')
    expect(badge).toBeTruthy()
    expect(badge?.className).toContain('text-sm')
  })

  it('merges custom className', () => {
    const { container } = render(
      <ConfidenceBadge confidence={85} className="custom-class" />
    )
    const badge = container.querySelector('span')
    expect(badge?.className).toContain('custom-class')
  })
})

describe('getConfidenceLevel', () => {
  it('returns High for confidence >= 90', () => {
    expect(getConfidenceLevel(90).labelEn).toBe('High')
    expect(getConfidenceLevel(100).labelEn).toBe('High')
  })

  it('returns Medium for confidence >= 70 and < 90', () => {
    expect(getConfidenceLevel(70).labelEn).toBe('Medium')
    expect(getConfidenceLevel(89).labelEn).toBe('Medium')
  })

  it('returns Low for confidence < 70', () => {
    expect(getConfidenceLevel(69).labelEn).toBe('Low')
    expect(getConfidenceLevel(0).labelEn).toBe('Low')
  })
})
