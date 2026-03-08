/**
 * Unit tests for fetch-page-text
 */

import { fetchPageText } from '../fetch-page-text'

describe('fetch-page-text', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    global.fetch = jest.fn() as jest.Mock
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('returns error for invalid URL', async () => {
    const result = await fetchPageText('not-a-url')
    expect(result).toEqual({ success: false, error: 'Invalid URL' })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('returns error for non-http protocol', async () => {
    const result = await fetchPageText('ftp://example.com')
    expect(result).toEqual({ success: false, error: 'Only http and https URLs are allowed' })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('returns error when fetch fails', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))
    const result = await fetchPageText('https://example.com')
    expect(result).toEqual({ success: false, error: 'Network error' })
  })

  it('returns error for non-ok response', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers(),
      text: () => Promise.resolve(''),
    })
    const result = await fetchPageText('https://example.com')
    expect(result).toEqual({ success: false, error: 'HTTP 404' })
  })

  it('returns error when content-type is not HTML', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () => Promise.resolve('{}'),
    })
    const result = await fetchPageText('https://example.com')
    expect(result).toEqual({ success: false, error: 'URL did not return HTML' })
  })

  it('returns extracted text for HTML response', async () => {
    const html = '<html><body><p>Hello</p><div>World</div></body></html>'
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: () => Promise.resolve(html),
    })
    const result = await fetchPageText('https://example.com')
    expect(result).toEqual({ success: true, text: 'Hello World' })
  })

  it('accepts text/plain content type', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'text/plain; charset=utf-8' }),
      text: () => Promise.resolve('Plain text'),
    })
    const result = await fetchPageText('https://example.com')
    expect(result).toEqual({ success: true, text: 'Plain text' })
  })

  it('truncates text when exceeding max length', async () => {
    const longText = 'x'.repeat(25000)
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: () => Promise.resolve(`<html><body>${longText}</body></html>`),
    })
    const result = await fetchPageText('https://example.com')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.text).toContain('[... truncated]')
      expect(result.text.length).toBeLessThan(25000)
    }
  })
})
