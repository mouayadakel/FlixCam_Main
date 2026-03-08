/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { FaqFormDialog } from '../faq-form-dialog'

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}))

describe('FaqFormDialog', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <FaqFormDialog
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
      <FaqFormDialog
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
      id: 'faq-1',
      questionAr: 'سؤال',
      questionEn: 'Question',
      questionZh: null,
      answerAr: 'جواب',
      answerEn: 'Answer',
      answerZh: null,
      order: 0,
      isActive: true,
    }
    render(
      <FaqFormDialog
        open={true}
        onOpenChange={jest.fn()}
        item={item}
        onSuccess={jest.fn()}
      />
    )
    // Arabic tab is active by default, so questionAr value is shown
    expect(screen.getByDisplayValue('سؤال')).toBeTruthy()
  })
})
