/**
 * @jest-environment jsdom
 */

import { render } from '@testing-library/react'
import { Progress } from '../progress'

describe('Progress', () => {
  it('renders without crashing', () => {
    const { container } = render(<Progress value={0} />)
    expect(container).toBeTruthy()
  })

  it('renders with value prop', () => {
    const { container } = render(<Progress value={50} />)
    expect(container.firstChild).toBeTruthy()
  })
})
