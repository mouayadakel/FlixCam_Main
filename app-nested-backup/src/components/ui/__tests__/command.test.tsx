/**
 * @jest-environment jsdom
 *
 * Command uses cmdk which depends on ResizeObserver and scrollIntoView (not in jsdom).
 * We mock scrollIntoView and test that the component structure renders.
 */

import { render, screen } from '@testing-library/react'
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from '../command'

beforeAll(() => {
  // cmdk uses ResizeObserver and scrollIntoView - not in jsdom
  class ResizeObserverMock {
    observe = jest.fn()
    unobserve = jest.fn()
    disconnect = jest.fn()
  }
  ;(global as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
    ResizeObserverMock as unknown as typeof ResizeObserver
  Element.prototype.scrollIntoView = jest.fn()
})

describe('Command', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <Command>
        <CommandInput placeholder="Search" />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
          <CommandItem value="item1">Item 1</CommandItem>
        </CommandList>
      </Command>
    )
    expect(container).toBeTruthy()
  })

  it('renders with minimal required props', () => {
    render(
      <Command>
        <CommandInput placeholder="Type..." />
        <CommandList>
          <CommandItem value="a">Option A</CommandItem>
        </CommandList>
      </Command>
    )
    expect(screen.getByPlaceholderText('Type...')).toBeTruthy()
    expect(screen.getByText('Option A')).toBeTruthy()
  })
})
