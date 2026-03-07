/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { PasswordInput } from '../password-input'

describe('PasswordInput', () => {
  it('renders without crashing', () => {
    const { container } = render(<PasswordInput />)
    expect(container).toBeTruthy()
  })

  it('renders with minimal required props', () => {
    render(<PasswordInput placeholder="Password" />)
    expect(screen.getByPlaceholderText('Password')).toBeTruthy()
  })

  it('has show/hide password button', () => {
    render(<PasswordInput placeholder="Password" />)
    expect(screen.getByRole('button', { name: /show password/i })).toBeTruthy()
  })
})
