/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { Badge } from '../badge'

describe('Badge', () => {
  it('renders without crashing', () => {
    const { container } = render(<Badge>Badge</Badge>)
    expect(container).toBeTruthy()
  })

  it('renders with minimal required props', () => {
    render(<Badge>Label</Badge>)
    expect(screen.getByText('Label')).toBeTruthy()
  })

  it('handles variant prop', () => {
    const { container } = render(<Badge variant="secondary">Secondary</Badge>)
    expect(container.firstChild).toBeTruthy()
  })

  it('merges custom className', () => {
    const { container } = render(
      <Badge className="custom-class">Badge</Badge>
    )
    expect((container.firstChild as HTMLElement)?.className).toContain('custom-class')
  })
})
