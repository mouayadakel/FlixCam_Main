/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { BottomSheet } from '../bottom-sheet'

describe('BottomSheet', () => {
  it('renders without crashing', () => {
    const onOpenChange = jest.fn()
    const { container } = render(
      <BottomSheet open={true} onOpenChange={onOpenChange}>
        <div>Content</div>
      </BottomSheet>
    )
    expect(container).toBeTruthy()
  })

  it('renders children when open', () => {
    const onOpenChange = jest.fn()
    render(
      <BottomSheet open={true} onOpenChange={onOpenChange}>
        <div>Sheet content</div>
      </BottomSheet>
    )
    expect(screen.getByText('Sheet content')).toBeTruthy()
  })

  it('displays title when provided', () => {
    const onOpenChange = jest.fn()
    render(
      <BottomSheet open={true} onOpenChange={onOpenChange} title="Filters">
        <div>Content</div>
      </BottomSheet>
    )
    expect(screen.getByText('Filters')).toBeTruthy()
  })
})
