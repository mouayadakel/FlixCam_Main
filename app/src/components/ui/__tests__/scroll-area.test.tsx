/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { ScrollArea } from '../scroll-area'

describe('ScrollArea', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <ScrollArea>
        <div>Content</div>
      </ScrollArea>
    )
    expect(container).toBeTruthy()
  })

  it('renders with minimal required props', () => {
    render(
      <ScrollArea>
        <p>Scrollable content</p>
      </ScrollArea>
    )
    expect(screen.getByText('Scrollable content')).toBeTruthy()
  })
})
