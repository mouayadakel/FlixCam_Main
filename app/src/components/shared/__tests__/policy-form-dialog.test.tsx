/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { PolicyFormDialog } from '../policy-form-dialog'

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}))

describe('PolicyFormDialog', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <PolicyFormDialog
        open={true}
        onOpenChange={jest.fn()}
        item={null}
        onSuccess={jest.fn()}
      />
    )
    expect(container).toBeTruthy()
  })

  it('renders with minimal required props when open', () => {
    render(
      <PolicyFormDialog
        open={true}
        onOpenChange={jest.fn()}
        item={null}
        onSuccess={jest.fn()}
      />
    )
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('handles optional item prop for edit mode', () => {
    const item = {
      id: 'policy-1',
      titleAr: 'عنوان',
      titleEn: 'Title',
      titleZh: null,
      bodyAr: 'نص',
      bodyEn: 'Body',
      bodyZh: null,
      order: 0,
      isActive: true,
    }
    render(
      <PolicyFormDialog
        open={true}
        onOpenChange={jest.fn()}
        item={item}
        onSuccess={jest.fn()}
      />
    )
    // Arabic tab is active by default, so titleAr value is shown
    expect(screen.getByDisplayValue('عنوان')).toBeTruthy()
  })
})
