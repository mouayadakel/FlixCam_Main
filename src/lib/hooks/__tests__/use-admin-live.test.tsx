/**
 * Unit tests for use-admin-live
 * @jest-environment jsdom
 */

import { renderHook } from '@testing-library/react'
import { useAdminLive } from '../use-admin-live'

const mockClose = jest.fn()
const mockEventSource = jest.fn().mockImplementation(() => ({
  onmessage: null,
  onerror: null,
  close: mockClose,
}))

describe('use-admin-live', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global as unknown as { EventSource: jest.Mock }).EventSource = mockEventSource
  })

  afterEach(() => {
    delete (global as unknown as { EventSource?: unknown }).EventSource
  })

  it('creates EventSource and subscribes to stream', () => {
    const onEvent = jest.fn()
    renderHook(() => useAdminLive(onEvent))

    expect(mockEventSource).toHaveBeenCalledWith('/api/admin/live/stream')
  })

  it('calls onEvent when message received with event type', () => {
    const onEvent = jest.fn()
    renderHook(() => useAdminLive(onEvent))

    const es = mockEventSource.mock.results[0].value
    es.onmessage({ data: JSON.stringify({ type: 'event', event: 'booking.created', payload: { id: 'b1' } }) })

    expect(onEvent).toHaveBeenCalledWith('booking.created', { id: 'b1' })
  })

  it('closes EventSource on unmount', () => {
    const { unmount } = renderHook(() => useAdminLive())
    unmount()
    expect(mockClose).toHaveBeenCalled()
  })
})
