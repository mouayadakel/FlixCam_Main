/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { ImageUpload } from '../image-upload'

jest.mock('next/image', () => ({
  __esModule: true,
  default: function MockImage({ src, alt }: { src: string; alt: string }) {
    return <img src={src} alt={alt} data-testid="mock-image" />
  },
}))

describe('ImageUpload', () => {
  const onChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = render(<ImageUpload onChange={onChange} />)
    expect(container).toBeTruthy()
  })

  it('displays default label', () => {
    render(<ImageUpload onChange={onChange} />)
    expect(screen.getByText('Featured Image')).toBeTruthy()
  })

  it('displays custom label', () => {
    render(<ImageUpload onChange={onChange} label="Cover Image" />)
    expect(screen.getByText('Cover Image')).toBeTruthy()
  })

  it('has URL and File tabs', () => {
    render(<ImageUpload onChange={onChange} />)
    expect(screen.getByText(/رابط URL/)).toBeTruthy()
    expect(screen.getByText(/رفع ملف/)).toBeTruthy()
  })

  it('calls onChange when URL input changes', () => {
    render(<ImageUpload onChange={onChange} />)
    const input = screen.getByPlaceholderText('https://example.com/image.jpg')
    fireEvent.change(input, { target: { value: 'https://example.com/image.jpg' } })
    expect(onChange).toHaveBeenCalledWith('https://example.com/image.jpg')
  })
})
