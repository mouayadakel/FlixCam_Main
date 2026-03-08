/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { CircularProgress } from '../circular-progress'

describe('CircularProgress', () => {
  it('renders without crashing', () => {
    const { container } = render(<CircularProgress value={0} />)
    expect(container).toBeTruthy()
  })

  it('renders with minimal required props', () => {
    const { container } = render(<CircularProgress value={50} />)
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('handles value prop', () => {
    const { container } = render(<CircularProgress value={75} />)
    expect(container).toBeTruthy()
  })
})
