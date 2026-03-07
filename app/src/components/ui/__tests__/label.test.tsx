/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { Label } from '../label'

describe('Label', () => {
  it('renders without crashing', () => {
    const { container } = render(<Label>Label</Label>)
    expect(container).toBeTruthy()
  })

  it('renders with minimal required props', () => {
    render(<Label>Field label</Label>)
    expect(screen.getByText('Field label')).toBeTruthy()
  })

  it('associates with input via htmlFor', () => {
    render(
      <>
        <Label htmlFor="input-id">Name</Label>
        <input id="input-id" />
      </>
    )
    const label = screen.getByText('Name')
    expect(label.getAttribute('for')).toBe('input-id')
  })
})
