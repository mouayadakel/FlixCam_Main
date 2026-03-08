/**
 * @jest-environment jsdom
 */

import { render } from '@testing-library/react'
import { Toaster } from '../toaster'

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toasts: [] }),
}))

describe('Toaster', () => {
  it('renders without crashing', () => {
    const { container } = render(<Toaster />)
    expect(container).toBeTruthy()
  })

  it('renders with empty toasts', () => {
    const { container } = render(<Toaster />)
    expect(container.firstChild).toBeTruthy()
  })
})
