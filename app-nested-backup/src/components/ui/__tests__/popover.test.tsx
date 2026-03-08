/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { Popover, PopoverTrigger, PopoverContent } from '../popover'

describe('Popover', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <Popover>
        <PopoverTrigger asChild>
          <button>Open</button>
        </PopoverTrigger>
        <PopoverContent>Content</PopoverContent>
      </Popover>
    )
    expect(container).toBeTruthy()
  })

  it('renders trigger button', () => {
    render(
      <Popover>
        <PopoverTrigger asChild>
          <button>Open popover</button>
        </PopoverTrigger>
        <PopoverContent>Popover content</PopoverContent>
      </Popover>
    )
    expect(screen.getByRole('button', { name: 'Open popover' })).toBeTruthy()
  })
})
