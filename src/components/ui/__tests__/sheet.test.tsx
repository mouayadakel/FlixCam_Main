/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../sheet'

describe('Sheet', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <Sheet>
        <SheetTrigger asChild>
          <button>Open</button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Title</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    )
    expect(container).toBeTruthy()
  })

  it('renders trigger button', () => {
    render(
      <Sheet>
        <SheetTrigger asChild>
          <button>Open sheet</button>
        </SheetTrigger>
        <SheetContent>Content</SheetContent>
      </Sheet>
    )
    expect(screen.getByRole('button', { name: 'Open sheet' })).toBeTruthy()
  })
})
