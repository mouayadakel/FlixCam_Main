/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { Textarea } from '../textarea'

describe('Textarea', () => {
  it('renders without crashing', () => {
    const { container } = render(<Textarea />)
    expect(container).toBeTruthy()
  })

  it('renders with minimal required props', () => {
    render(<Textarea placeholder="Enter text" />)
    expect(screen.getByPlaceholderText('Enter text')).toBeTruthy()
  })

  it('handles value', () => {
    render(<Textarea value="test" onChange={jest.fn()} placeholder="Text" />)
    const textarea = screen.getByPlaceholderText('Text') as HTMLTextAreaElement
    expect(textarea.value).toBe('test')
  })
})
