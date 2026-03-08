/**
 * @jest-environment jsdom
 */

import { render } from '@testing-library/react'
import { Separator } from '../separator'

describe('Separator', () => {
  it('renders without crashing', () => {
    const { container } = render(<Separator />)
    expect(container).toBeTruthy()
  })

  it('renders with minimal required props', () => {
    const { container } = render(<Separator />)
    expect(container.firstChild).toBeTruthy()
  })

  it('handles orientation prop', () => {
    const { container } = render(<Separator orientation="vertical" />)
    expect(container.firstChild).toBeTruthy()
  })
})
