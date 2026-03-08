/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../dropdown-menu'

describe('DropdownMenu', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button>Open</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item 1</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    expect(container).toBeTruthy()
  })

  it('renders trigger button', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button>Menu</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Action</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    expect(screen.getByRole('button', { name: 'Menu' })).toBeTruthy()
  })
})
