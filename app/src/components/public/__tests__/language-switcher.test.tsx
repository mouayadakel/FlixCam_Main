/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { LanguageSwitcher } from '../language-switcher'

const mockSetLocale = jest.fn()

jest.mock('@/hooks/use-locale', () => ({
  useLocale: () => ({
    locale: 'en',
    setLocale: mockSetLocale,
  }),
}))

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = render(<LanguageSwitcher />)
    expect(container).toBeTruthy()
  })

  it('displays current locale label', () => {
    render(<LanguageSwitcher />)
    expect(screen.getByText('English')).toBeTruthy()
  })

  it('has aria-label for language switch', () => {
    render(<LanguageSwitcher />)
    expect(screen.getByLabelText('Switch language')).toBeTruthy()
  })

  it('opens dropdown on click without throwing', () => {
    render(<LanguageSwitcher />)
    const trigger = screen.getByRole('button', { name: /switch language/i })
    expect(() => fireEvent.click(trigger)).not.toThrow()
  })
})
