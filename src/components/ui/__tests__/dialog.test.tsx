/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../dialog'

describe('Dialog', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <Dialog>
        <DialogTrigger asChild>
          <button>Open</button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Description</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <button>Close</button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
    expect(container).toBeTruthy()
  })

  it('renders trigger button', () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <button>Open dialog</button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modal</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
    expect(screen.getByRole('button', { name: 'Open dialog' })).toBeTruthy()
  })
})
